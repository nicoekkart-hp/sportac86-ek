"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

const links = [
  { href: "/onze-reis", label: "Onze reis" },
  { href: "/team", label: "Team" },
  { href: "/agenda", label: "Agenda" },
  { href: "/sponsors", label: "Sponsors" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-warm/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="https://sportac86.be/swfiles/logo/logo.png?nocache=1775235881"
            alt="Sportac 86 Deinze"
            width={80}
            height={80}
            className="object-contain"
            style={{ width: 80, height: "auto" }}
          />
          <div className="leading-tight">
            <span className="block font-condensed font-bold text-sm text-gray-dark">
              Sportac 86 Deinze
            </span>
            <span className="block text-[11px] text-gray-sub">
              EK Ropeskipping · Noorwegen 2026
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-semibold transition-colors",
                pathname === link.href
                  ? "text-red-sportac border-b-2 border-red-sportac pb-0.5"
                  : "text-gray-body hover:text-gray-dark"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/steunen"
            className="bg-red-sportac text-white text-sm font-bold px-5 py-2 rounded-sm hover:bg-red-600 transition-colors"
          >
            Steun ons
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu openen"
        >
          <span className={clsx("block w-6 h-0.5 bg-gray-dark transition-transform", open && "rotate-45 translate-y-2")} />
          <span className={clsx("block w-6 h-0.5 bg-gray-dark transition-opacity", open && "opacity-0")} />
          <span className={clsx("block w-6 h-0.5 bg-gray-dark transition-transform", open && "-rotate-45 -translate-y-2")} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-gray-warm border-t border-black/5 px-6 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-gray-body"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/steunen"
            className="bg-red-sportac text-white text-sm font-bold px-5 py-2.5 rounded-sm text-center"
            onClick={() => setOpen(false)}
          >
            Steun ons
          </Link>
        </div>
      )}
    </nav>
  );
}
