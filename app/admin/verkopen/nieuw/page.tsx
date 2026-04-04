import { SaleForm } from "../_SaleForm";
import { createSale } from "../actions";

export default function NieuwVerkoopPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkoop toevoegen</h1>
      </div>
      <SaleForm action={createSale} />
    </div>
  );
}
