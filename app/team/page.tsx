import { createServerClient } from "@/lib/supabase";
import { TeamCard } from "@/components/TeamCard";
import { TeamMember } from "@/lib/types";
import Link from "next/link";

export default async function TeamPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order");

  const members: TeamMember[] = data ?? [];
  const atleten = members.filter((m) => m.role === "Atleet");
  const staf = members.filter((m) => m.role !== "Atleet");

  return (
    <div className="pt-16">
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="absolute right-10 bottom-[-20px] font-condensed font-black italic text-[140px] text-white/[0.04] leading-none pointer-events-none select-none">
          Team
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Team</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Het <em className="not-italic text-red-sportac">team</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            Maak kennis met de atleten, coaches en begeleiders die deze droom waarmaken.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {atleten.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-0.5 bg-red-sportac" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Atleten</span>
            </div>
            <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-8">De springers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-14">
              {atleten.map((m) => <TeamCard key={m.id} member={m} />)}
            </div>
          </>
        )}

        {staf.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-0.5 bg-red-sportac" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Staf</span>
            </div>
            <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-8">Coaches & begeleiding</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {staf.map((m) => <TeamCard key={m.id} member={m} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
