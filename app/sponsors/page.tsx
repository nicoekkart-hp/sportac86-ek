import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { Sponsor } from "@/lib/types";
import { ScrollToSection } from "@/components/ScrollToSection";

const levels = [
  { id: "gold", label: "Goud", description: "Logo prominent op homepage en alle pagina's" },
  { id: "silver", label: "Zilver", description: "Logo op sponsorspagina en homepage" },
  { id: "bronze", label: "Brons", description: "Logo op sponsorspagina" },
  { id: "partner", label: "Partner", description: "Vermelding op sponsorspagina" },
] as const;

export default async function SponsorsPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sponsors")
    .select("*")
    .order("sort_order");

  const sponsors: Sponsor[] = data ?? [];

  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Sponsors</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Onze <em className="not-italic text-red-sportac">sponsors</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            Zonder hun steun gaan we niet naar Noorwegen. Hartelijk dank aan al onze sponsors!
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {/* Sponsors per level */}
        {levels.map((level) => {
          const levelSponsors = sponsors.filter((s) => s.level === level.id);
          if (levelSponsors.length === 0) return null;
          return (
            <div key={level.id} className="mb-12">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">{level.label}</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {levelSponsors.map((s) => (
                  s.website_url ? (
                    <a
                      key={s.id}
                      href={s.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-[#e8e4df] rounded-sm px-8 py-4 text-sm font-semibold text-gray-sub hover:text-gray-dark hover:border-gray-400 transition-colors"
                    >
                      {s.name}
                    </a>
                  ) : (
                    <div key={s.id} className="bg-white border border-[#e8e4df] rounded-sm px-8 py-4 text-sm font-semibold text-gray-sub">
                      {s.name}
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}

        {/* Become a sponsor */}
        <div id="aanvragen" className="bg-gray-dark rounded-sm p-10 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Word sponsor</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-white mb-4">
            Steun Sportac 86 als sponsor
          </h2>
          <p className="text-gray-sub text-sm leading-relaxed mb-3 max-w-lg">
            Als sponsor van Sportac 86 ondersteun je een team van getalenteerde jongeren op weg naar het Europees Kampioenschap in Melsomvik, Noorwegen (10–14 augustus 2026). De totale kosten voor de delegatie van 9 personen worden geschat op <strong className="text-white">€ 15.000</strong> — elke bijdrage telt.
          </p>
          <p className="text-gray-sub text-sm leading-relaxed mb-8 max-w-lg">
            Stuur een mail naar{" "}
            <a href="mailto:sportacwkropeskipping@gmail.com" className="text-red-sportac hover:underline">
              sportacwkropeskipping@gmail.com
            </a>{" "}
            met je gekozen pakket en het logo van je bedrijf, of gebruik het formulier hieronder.
          </p>

          {/* Packages */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {levels.map((level) => (
              <div key={level.id} className="bg-white/5 border border-white/10 rounded-sm p-4">
                <div className="font-bold text-white mb-1">{level.label}</div>
                <div className="text-xs text-gray-sub">{level.description}</div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <form action="/api/sponsor-request" method="POST" className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Naam / Bedrijf *</label>
              <input type="text" name="name" required className="w-full bg-white/10 border border-white/15 text-white rounded-sm px-3 py-2 text-sm placeholder:text-gray-sub focus:outline-none focus:border-red-sportac" placeholder="Jouw naam of bedrijf" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">E-mailadres *</label>
              <input type="email" name="email" required className="w-full bg-white/10 border border-white/15 text-white rounded-sm px-3 py-2 text-sm placeholder:text-gray-sub focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-white mb-1">Bericht</label>
              <textarea name="message" rows={3} className="w-full bg-white/10 border border-white/15 text-white rounded-sm px-3 py-2 text-sm placeholder:text-gray-sub focus:outline-none focus:border-red-sportac resize-none" placeholder="Ik ben geïnteresseerd in het goudpakket..." />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-8 py-3 rounded-sm hover:bg-red-600 transition-colors">
                Stuur aanvraag
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
