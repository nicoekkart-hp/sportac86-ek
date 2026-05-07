import Image from "next/image";
import { Sponsor } from "@/lib/types";

export function SponsorTile({ sponsor, size = "md" }: { sponsor: Sponsor; size?: "sm" | "md" | "lg" }) {
  const dims = {
    sm: { w: 100, h: 56, padX: "px-5", padY: "py-3" },
    md: { w: 140, h: 72, padX: "px-7", padY: "py-3.5" },
    lg: { w: 180, h: 90, padX: "px-8", padY: "py-4" },
  }[size];

  const inner = sponsor.logo_url ? (
    <div className="relative" style={{ width: dims.w, height: dims.h }}>
      <Image
        src={sponsor.logo_url}
        alt={sponsor.name}
        fill
        className="object-contain"
        sizes={`${dims.w}px`}
      />
    </div>
  ) : (
    <span className="text-sm font-semibold text-gray-sub">{sponsor.name}</span>
  );

  const className = `bg-white border border-[#e8e4df] rounded-sm ${dims.padX} ${dims.padY} flex items-center justify-center hover:border-gray-400 transition-colors`;

  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noopener noreferrer"
      title={sponsor.name}
      className={className}
    >
      {inner}
    </a>
  ) : (
    <div title={sponsor.name} className={className}>
      {inner}
    </div>
  );
}
