"use client";

import Image from "next/image";
import { Slide, LEVEL_ADJECTIVE } from "./slides";
import { Sponsor } from "@/lib/types";

const heading = "font-condensed font-black italic leading-none text-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-0.5 bg-red-sportac" />
      <span className="text-sm font-bold tracking-[0.25em] uppercase text-red-sportac">
        {children}
      </span>
    </div>
  );
}

// A sponsor logo on a white card. Falls back to the name when there is no logo.
function LogoCard({ sponsor, className = "" }: { sponsor: Sponsor; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl flex items-center justify-center p-6 shadow-2xl ${className}`}
    >
      {sponsor.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <span className="font-condensed font-black italic text-blue-night text-center text-2xl px-2">
          {sponsor.name}
        </span>
      )}
    </div>
  );
}

export function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  switch (slide.kind) {
    case "title": {
      const d = new Date(slide.ekDate);
      const date = d.toLocaleDateString("nl-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-center px-12">
          <Eyebrow>Eetfestijn 2026</Eyebrow>
          <h1 className={`${heading} text-[9vw]`}>
            Sportac <em className="not-italic text-red-sportac">86</em>
          </h1>
          <p className="font-condensed font-bold italic text-white/80 text-[3.5vw] mt-2 leading-none">
            op weg naar het EK Ropeskipping
          </p>
          <p className="text-white/60 text-[1.6vw] tracking-[0.3em] uppercase mt-8">
            Noorwegen &middot; {date}
          </p>
        </div>
      );
    }

    case "sponsor-wall": {
      return (
        <div className="h-full w-full flex flex-col px-[5vw] py-[5vh]">
          <h2 className={`${heading} text-[5vw] mb-2`}>
            Onze <em className="not-italic text-red-sportac">sponsors</em>
          </h2>
          <p className="text-white/60 text-[1.5vw] mb-6">
            Zonder hun steun gaan we niet naar Noorwegen. Bedankt!
          </p>
          <div className="flex-1 flex flex-col justify-center gap-6 min-h-0">
            {slide.gold.length > 0 && (
              <div>
                <div className="text-red-sportac text-[1.1vw] font-bold tracking-[0.25em] uppercase mb-3">
                  Goud
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {slide.gold.map((s) => (
                    <LogoCard key={s.id} sponsor={s} className="h-[14vh]" />
                  ))}
                </div>
              </div>
            )}
            {slide.silver.length > 0 && (
              <div>
                <div className="text-white/50 text-[1.1vw] font-bold tracking-[0.25em] uppercase mb-3">
                  Zilver
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {slide.silver.map((s) => (
                    <LogoCard key={s.id} sponsor={s} className="h-[10vh]" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "sponsor": {
      const s = slide.sponsor;
      return (
        <div className="h-full w-full flex flex-col items-center justify-center px-12 text-center">
          <Eyebrow>{LEVEL_ADJECTIVE[s.level]} sponsor</Eyebrow>
          <LogoCard sponsor={s} className="w-[55vw] h-[48vh] max-w-[900px]" />
          <h2 className={`${heading} text-[4.5vw] mt-8`}>{s.name}</h2>
        </div>
      );
    }

    case "roster": {
      const n = slide.skippers.length;
      // Fit all skippers comfortably on one row when few, two rows otherwise.
      const cols = n <= 5 ? n : Math.ceil(n / 2);
      return (
        <div className="h-full w-full flex flex-col px-[5vw] py-[5vh]">
          <h2 className={`${heading} text-[5vw] mb-2`}>
            Onze <em className="not-italic text-red-sportac">skippers</em>
          </h2>
          <p className="text-white/60 text-[1.5vw] mb-6">
            Dit zijn de atletes die ons land vertegenwoordigen op het EK.
          </p>
          <div
            className="flex-1 grid gap-5 items-center justify-center min-h-0"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {slide.skippers.map((m) => (
              <div key={m.id} className="flex flex-col items-center">
                <div className="aspect-[3/4] w-full max-w-[18vh] rounded-2xl overflow-hidden bg-white/10 ring-2 ring-white/10">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image_url}
                      alt={m.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : null}
                </div>
                <div className="font-condensed font-black italic text-white text-[1.8vw] mt-3 leading-none">
                  {m.name}
                </div>
                {m.discipline && m.discipline.length > 0 && (
                  <div className="text-red-sportac text-[1vw] font-bold tracking-[0.15em] uppercase mt-1">
                    {m.discipline.join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "photo": {
      return (
        <div className="relative h-full w-full">
          <Image
            src={slide.src}
            alt={`Groepsfoto ${slide.index}`}
            fill
            priority={active}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-night/70 via-transparent to-transparent" />
          <div className="absolute bottom-12 left-[5vw]">
            <Eyebrow>Sportac 86</Eyebrow>
            <p className="font-condensed font-black italic text-white text-[3vw] leading-none">
              Samen naar Noorwegen
            </p>
          </div>
        </div>
      );
    }
  }
}
