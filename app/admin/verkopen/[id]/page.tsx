import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { SaleForm } from "../_SaleForm";
import { updateSale } from "../actions";

export default async function BewerkenVerkoopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").eq("id", id).single();
  if (!data) notFound();
  const sale = data as Sale;
  const action = updateSale.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkoop bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{sale.name}</p>
      </div>
      <SaleForm sale={sale} action={action} />
    </div>
  );
}
