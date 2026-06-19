import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/pos", "/riders", "/staff", "/menu", "/orders", "/customers", "/tables", "/analytics", "/settings", "/attendance"];

// Routes that authenticated users should not see
const AUTH_ROUTES = ["/auth/login", "/auth/forgot-password"];

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First pass — update the request cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Second pass — update the response cookies so the browser
          // receives the refreshed session
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not write any logic between createServerClient and
  // auth.getUser(). A subtle bug can occur where the session is not
  // refreshed correctly if other logic runs first.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Unauthenticated user hitting a protected route ────────────────────
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated user hitting an auth route ──────────────────────────
  if (user && isAuthRoute(pathname)) {
    const role = user.app_metadata?.role as string | undefined;
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = role === "RIDER" ? "/riders" : "/dashboard";
    dashboardUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashboardUrl);
  }

  // ── Role-based route protection ───────────────────────────────────────
  if (user && isProtectedRoute(pathname)) {
    const role = user.app_metadata?.role as string | undefined;

    // RIDERs cannot access dashboard/staff/management routes
    if (role === "RIDER" && !pathname.startsWith("/riders")) {
      const ridersUrl = request.nextUrl.clone();
      ridersUrl.pathname = "/riders";
      return NextResponse.redirect(ridersUrl);
    }

    // STAFF and SUPER_ADMIN cannot access rider-only routes
    if (
      (role === "SUPER_ADMIN" || role === "STAFF") &&
      pathname.startsWith("/riders")
    ) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // IMPORTANT: Always return supabaseResponse, not a new NextResponse.
  // Returning a different response object drops the refreshed session
  // cookies, causing an infinite redirect loop.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - Public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};