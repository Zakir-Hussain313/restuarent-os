import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function WebsiteFooter() {
  return (
    <footer className="bg-[#1a1815] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#e8570e] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <span className="text-base font-bold tracking-tight">Rice n Spice</span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            Authentic flavours crafted with tradition. Every dish tells a story of heritage, spice, and love.
          </p>
          <div className="flex items-center gap-3 mt-1">
            {[
              { label: "IG",  href: "#" },
              { label: "FB",  href: "#" },
              { label: "TW",  href: "#" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#e8570e] flex items-center justify-center transition-colors duration-150 text-xs font-bold text-white/60 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">Quick Links</h4>
          <nav className="flex flex-col gap-2.5">
            {[
              { label: "Home",       href: "/" },
              { label: "Our Menu",   href: "/menu" },
              { label: "About Us",   href: "/about" },
              { label: "Contact",    href: "/contact" },
              { label: "Order Online", href: "/order" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-white/60 hover:text-white transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Hours */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">Opening Hours</h4>
          <div className="flex flex-col gap-3">
            {[
              { days: "Mon – Thu", hours: "12:00 PM – 11:00 PM" },
              { days: "Fri – Sat", hours: "12:00 PM – 12:00 AM" },
              { days: "Sunday",    hours: "1:00 PM – 11:00 PM" },
            ].map(({ days, hours }) => (
              <div key={days} className="flex items-start gap-2.5">
                <Clock className="w-3.5 h-3.5 text-[#e8570e] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-white/80 font-medium">{days}</p>
                  <p className="text-xs text-white/40 mt-0.5">{hours}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">Contact Us</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#e8570e] mt-0.5 shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed">
                Block 7, Clifton<br />Karachi, Sindh
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-[#e8570e] shrink-0" />
              <a href="tel:+922134567890" className="text-sm text-white/60 hover:text-white transition-colors">
                +92 21 3456 7890
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-[#e8570e] shrink-0" />
              <a href="mailto:hello@ricenspice.pk" className="text-sm text-white/60 hover:text-white transition-colors">
                hello@ricenspice.pk
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Rice n Spice. All rights reserved.</p>
          <p className="text-xs text-white/30">Made with ❤️ in Karachi</p>
        </div>
      </div>
    </footer>
  );
}