"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { TeamMember } from "@/lib/types";

function parseDiscipline(d: string[] | string | null): string[] | null {
  if (!d) return null;
  if (Array.isArray(d)) return d;
  try { const parsed = JSON.parse(d); return Array.isArray(parsed) ? parsed : [d]; } catch { return [d]; }
}

function TeamCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-sm overflow-hidden relative text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-sportac w-full"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-sportac z-10" />
      <div className="aspect-[3/4] relative bg-[#ddd8d0] overflow-hidden">
        {member.image_url ? (
          <Image
            src={member.image_url}
            alt={member.name}
            fill
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
            👤
          </div>
        )}
        {(member.bio || member.discipline) && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <span className="text-white text-xs font-semibold tracking-wide">Meer info →</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-sm text-gray-dark">{member.name}</div>
        <div className="text-xs text-gray-sub mt-0.5 flex items-center gap-1.5">
          <span>{parseDiscipline(member.discipline)?.join(" · ") ?? member.role}</span>
          {member.bio?.age && (
            <>
              <span className="text-gray-300">·</span>
              <span>{member.bio.age} jaar</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function TeamModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm overflow-hidden max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex">
          {/* Photo */}
          <div className="relative w-40 flex-shrink-0 bg-[#ddd8d0] aspect-[3/4]">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-sportac z-10" />
            {member.image_url ? (
              <Image
                src={member.image_url}
                alt={member.name}
                fill
                className="object-cover object-top"
                sizes="160px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">
                👤
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-sub hover:text-gray-dark transition-colors"
              aria-label="Sluiten"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="font-condensed font-black italic text-3xl text-gray-dark leading-none mb-1">
              {member.name}
            </h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold tracking-widest uppercase text-red-sportac">
                {member.role}
              </span>
              {parseDiscipline(member.discipline)?.length ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-sub">{parseDiscipline(member.discipline)!.join(" · ")}</span>
                </>
              ) : null}
            </div>

            {member.bio ? (
              <dl className="flex flex-col gap-2.5 text-sm">
                {member.bio.age && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-sub">Leeftijd</dt>
                    <dd className="text-gray-body">{member.bio.age}</dd>
                  </div>
                )}
                {member.bio.years && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-sub">Hoe lang al aan het skippen?</dt>
                    <dd className="text-gray-body">{member.bio.years}</dd>
                  </div>
                )}
                {member.bio.favorite_discipline && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-sub">Favoriete discipline</dt>
                    <dd className="text-gray-body">{member.bio.favorite_discipline}</dd>
                  </div>
                )}
                {member.bio.why && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-sub">Waarom ropeskipping?</dt>
                    <dd className="text-gray-body leading-relaxed">{member.bio.why}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-sub italic">Geen info beschikbaar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamGrid({ members }: { members: TeamMember[] }) {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {members.map((m) => (
          <TeamCard key={m.id} member={m} onClick={() => setSelected(m)} />
        ))}
      </div>
      {selected && <TeamModal member={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
