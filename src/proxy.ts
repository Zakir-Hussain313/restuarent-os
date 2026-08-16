import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "RIDER";

// Routes restricted to SUPER_ADMIN only
const SUPER_ADMIN_ONLY_ROUTES = ["/admins", "/branches"];

// Routes shared by SUPER_ADMIN + ADMIN
const ADMIN_ROUTES = ["/dashboard", "/attendance", "/staff", "/settings" , "/audit-logs"];

// Routes shared by SUPER_ADMIN + ADMIN + STAFF
const STAFF_ROUTES = ["/pos", "/orders", "/tables", "/menu"];

// Routes shared by SUPER_ADMIN + RIDER
const RIDER_ROUTES = ["/riders"];

const SUPER_ADMIN_BLOCKED_ROUTES = ["/tables"];

const PROTECTED_ROUTES = [
  ...SUPER_ADMIN_ONLY_ROUTES,
  ...ADMIN_ROUTES,
  ...STAFF_ROUTES,
  ...RIDER_ROUTES,
];

// Routes that authenticated users should not see
const AUTH_ROUTES = ["/auth/login", "/auth/forgot-password"];

function matches(routes: string[], pathname: string) {
  return routes.some((route) => pathname.startsWith(route));
}

// Default landing page per role
function defaultRouteFor(role: Role | undefined) {
  if (role === "RIDER") return "/riders";
  if (role === "STAFF") return "/pos";
  return "/dashboard"; // SUPER_ADMIN and ADMIN
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // getUser() failed to reach Supabase at all (network/timeout), not
    // "Supabase said no session." Don't force a logout for this — fall
    // back to reading the session locally from the cookie instead.
    // getSession() does NOT make a network round-trip unless the token
    // needs refreshing, so this still works while offline.
    console.warn("[proxy] getUser() unreachable, falling back to cached session:", err);
    const { data } = await supabase.auth.getSession();
    user = data.session?.user ?? null;
  }

  const { pathname } = request.nextUrl;
  const role = user?.app_metadata?.role as Role | undefined;
  const isProtected = matches(PROTECTED_ROUTES, pathname);

  // ── Unauthenticated user hitting a protected route ────────────────────
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated user hitting an auth route ──────────────────────────
  if (user && matches(AUTH_ROUTES, pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = defaultRouteFor(role);
    dashboardUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashboardUrl);
  }

  // ── SUPER_ADMIN explicit route block ──────────────────────────────────
  if (user && role === "SUPER_ADMIN" && matches(SUPER_ADMIN_BLOCKED_ROUTES, pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = defaultRouteFor(role); // "/dashboard" for SUPER_ADMIN
    return NextResponse.redirect(dashboardUrl);
  }

  // ── Role-based route protection ───────────────────────────────────────
  if (user && isProtected && role !== "SUPER_ADMIN") {
    const allowed =
      (role === "ADMIN" && matches(ADMIN_ROUTES, pathname)) ||
      (role === "ADMIN" && matches(STAFF_ROUTES, pathname)) ||
      (role === "STAFF" && matches(STAFF_ROUTES, pathname)) ||
      (role === "RIDER" && matches(RIDER_ROUTES, pathname));

    if (!allowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = defaultRouteFor(role);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};