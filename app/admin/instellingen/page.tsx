import { SPORTAC_BENEFICIARY, SPORTAC_IBAN_FORMATTED } from "@/lib/payment";

export default async function InstellingenPage() {
  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Instellingen</h1>
        <p className="text-gray-sub text-sm mt-1">Configuratie</p>
      </div>
      <div className="bg-white border border-[#e8e4df] rounded-sm p-6">
        <h2 className="font-bold text-sm text-gray-dark mb-2">Betalingen</h2>
        <p className="text-xs text-gray-sub leading-relaxed mb-3">
          Bestellingen en inschrijvingen worden betaald via overschrijving. Iedere
          bestelling/inschrijving krijgt een unieke mededeling die klanten zien op de
          bevestigingspagina (met EPC QR-code voor banking-apps).
        </p>
        <dl className="text-xs font-mono space-y-1">
          <div>
            <dt className="font-sans text-gray-sub inline">Begunstigde: </dt>
            <dd className="inline text-gray-dark">{SPORTAC_BENEFICIARY}</dd>
          </div>
          <div>
            <dt className="font-sans text-gray-sub inline">IBAN: </dt>
            <dd className="inline text-gray-dark font-bold">{SPORTAC_IBAN_FORMATTED}</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-sub leading-relaxed mt-3">
          Markeer betalingen als &quot;Betaald&quot; in de bestellingen- en inschrijvingenlijst zodra
          ze binnen zijn op de rekening.
        </p>
      </div>
    </div>
  );
}
