"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/login/actions";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/evenementen", label: "Evenementen", icon: "📅" },
  { href: "/admin/team", label: "Team", icon: "👥" },
  { href: "/admin/foto-gallerij", label: "Foto-gallerij", icon: "🖼️" },
  { href: "/admin/verkopen", label: "Verkopen", icon: "🏷️" },
  { href: "/admin/producten", label: "Producten", icon: "🛍️" },
  { href: "/admin/inschrijvingen", label: "Inschrijvingen", icon: "📋" },
  { href: "/admin/bestellingen", label: "Bestellingen", icon: "🛒" },
  { href: "/admin/donaties", label: "Donaties", icon: "💶" },
  { href: "/admin/sponsors", label: "Sponsors", icon: "🏢" },
  { href: "/admin/sponsor-aanvragen", label: "Sponsor-aanvragen", icon: "📨" },
  { href: "/admin/instellingen", label: "Instellingen", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#1c2b4a] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="font-condensed font-black text-xl text-red-sportac">S86</span>
        <span className="text-white/60 text-xs ml-2">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? "bg-red-sportac text-white font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: back to site + logout */}
      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <span>←</span> Naar de site
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white/70 transition-colors text-left"
          >
            <span>⏻</span> Uitloggen
          </button>
        </form>
      </div>
    </aside>
  );
}
