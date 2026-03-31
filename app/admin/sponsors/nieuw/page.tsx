import { SponsorForm } from "../_SponsorForm";
import { createSponsor } from "../actions";

export default function NieuwSponsorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor toevoegen</h1>
      </div>
      <SponsorForm action={createSponsor} />
    </div>
  );
}
