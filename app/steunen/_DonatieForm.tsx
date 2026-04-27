import { SPORTAC_BENEFICIARY, SPORTAC_IBAN_FORMATTED } from "@/lib/payment";

export function DonatieForm() {
  return (
    <div className="bg-gray-warm rounded-sm p-5 font-mono text-sm">
      <p className="text-xs font-sans text-gray-sub mb-3 not-italic">
        Doneren kan via een overschrijving op ons rekeningnummer:
      </p>
      <p><strong>{SPORTAC_IBAN_FORMATTED}</strong></p>
      <p className="text-gray-sub">{SPORTAC_BENEFICIARY}</p>
      <p className="text-gray-sub">Mededeling: EK Ropeskipping Noorwegen 2026</p>
    </div>
  );
}
