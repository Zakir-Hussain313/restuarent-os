"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/order" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function WebsiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const isHome = pathname === "/";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || !isHome
          ? "bg-white/95 backdrop-blur-md border-b border-[#ebe9e4] shadow-sm"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-[#e8570e] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <span
              className={`text-base font-bold tracking-tight transition-colors duration-300 ${scrolled || !isHome ? "text-[#1a1815]" : "text-white"
                }`}
            >
              {RESTAURANT_CONFIG.name}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active
                      ? "text-[#e8570e] bg-orange-50"
                      : scrolled || !isHome
                        ? "text-[#8a8680] hover:text-[#1a1815] hover:bg-[#f4f2ef]"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/order"
              className="flex items-center gap-2 bg-[#e8570e] hover:bg-[#c44a0c] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150"
            >
              <ShoppingBag className="w-4 h-4" />
              Order Now
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled || !isHome
                ? "text-[#1a1815] hover:bg-[#f4f2ef]"
                : "text-white hover:bg-white/10"
              }`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#ebe9e4] px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                    ? "text-[#e8570e] bg-orange-50"
                    : "text-[#8a8680] hover:text-[#1a1815] hover:bg-[#f4f2ef]"
                  }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/order"
            className="mt-2 flex items-center justify-center gap-2 bg-[#e8570e] text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <ShoppingBag className="w-4 h-4" />
            Order Now
          </Link>
        </div>
      )}
    </header>
  );
}