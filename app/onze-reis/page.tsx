import Link from "next/link";
import Image from "next/image";

const timeline = [
  {
    date: "September 2025",
    title: "Seizoensstart",
    body: "Het team start met intensieve trainingen om de kwalificatienormen te halen.",
  },
  {
    date: "December 2025",
    title: "Belgische Kampioenschappen",
    body: "Sportac 86 schittert op de Belgische Kampioenschappen en haalt de vereiste scores.",
  },
  {
    date: "Januari 2026",
    title: "Kwalificatie bevestigd!",
    body: "Officieel: Sportac 86 Deinze is gekwalificeerd voor het EK Ropeskipping in Noorwegen.",
  },
  {
    date: "Zomer 2026",
    title: "Europees Kampioenschap Noorwegen",
    body: "Het team treedt aan namens België op het EK. Dromen worden werkelijkheid.",
  },
];

export default function OnzeReisPage() {
  return (
    <div className="pt-16">
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Onze reis</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Onze <em className="not-italic text-red-sportac">reis</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            Het verhaal achter de kwalificatie — van Deinze naar de Noorse fjorden.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Intro */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Het verhaal</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">
            Van Deinze naar Noorwegen
          </h2>
          <p className="text-gray-body text-[15px] leading-relaxed mb-4">
            Sportac 86 Deinze is een club met een rijke traditie in ropeskipping. Al jaren
            trainen onze skippers hard om zich op het hoogste niveau te meten. Dit seizoen
            werd dat terug beloond met een selectie voor het Europees Kampioenschap in
            Noorwegen.
          </p>
          <p className="text-gray-body text-[15px] leading-relaxed mb-4">
            Het EK is de grootste ropeskippingcompetitie in Europa. Teams uit meer dan 30
            landen nemen deel in disciplines als speed, freestyle en teamspringen.
          </p>
          <p className="text-gray-body text-[15px] leading-relaxed">
            Maar de reis naar Noorwegen kost geld. Reiskosten, verblijf, wedstrijdmateriaal —
            het telt op. Daarom rekenen we op de steun van onze gemeente, onze sponsors en
            iedereen die ons een warm hart toedraagt.
          </p>
        </div>

        {/* Team photo */}
        <div className="relative w-full h-72 rounded-sm overflow-hidden mb-14">
          <Image
            src="/groepsfotos/IMG_6015.jpeg"
            alt="Sportac 86 Deinze — het team"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* EK facts */}
        <div className="bg-white border border-[#e8e4df] rounded-sm p-8 mb-14">
          <h3 className="font-bold text-lg mb-5">Het EK in cijfers</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { num: "2026", label: "Jaar" },
              { num: "30+", label: "Landen" },
              { num: "3", label: "Disciplines" },
              { num: "🇳🇴", label: "Noorwegen" },
            ].map((f) => (
              <div key={f.label}>
                <div className="font-condensed font-black italic text-4xl text-red-sportac leading-none mb-1">
                  {f.num}
                </div>
                <div className="text-sm text-gray-sub">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Tijdlijn</span>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#e8e4df]" />
            <div className="flex flex-col gap-8">
              {timeline.map((item) => (
                <div key={item.title} className="pl-12 relative">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-red-sportac flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-sportac mb-1">
                    {item.date}
                  </div>
                  <h4 className="font-bold text-[15px] text-gray-dark mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-body leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 bg-gray-dark rounded-sm p-8 text-center">
          <h3 className="font-condensed font-black italic text-3xl text-white mb-3">
            Help ons naar <em className="not-italic text-red-sportac">Noorwegen</em>
          </h3>
          <p className="text-gray-sub text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Doneer, schrijf je in voor een evenement, of bestel iets via onze acties. Elke bijdrage telt.
          </p>
          <Link
            href="/steunen#doneer"
            className="inline-block bg-red-sportac text-white font-bold text-sm px-8 py-3 rounded-sm hover:bg-red-600 transition-colors"
          >
            Steun ons team
          </Link>
        </div>
      </div>
    </div>
  );
}
