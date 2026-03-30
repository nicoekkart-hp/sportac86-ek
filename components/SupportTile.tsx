import Link from "next/link";

type SupportTileProps = {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export function SupportTile({ icon, title, description, actionLabel, href }: SupportTileProps) {
  return (
    <Link
      href={href}
      className="group bg-[#222] p-8 flex flex-col gap-2.5 relative overflow-hidden hover:bg-[#2a2a2a] transition-colors"
    >
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-sportac scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      <span className="text-3xl">{icon}</span>
      <span className="font-bold text-lg text-white">{title}</span>
      <span className="text-sm text-gray-sub leading-relaxed flex-1">{description}</span>
      <span className="text-sm font-bold text-red-sportac">{actionLabel} →</span>
    </Link>
  );
}
