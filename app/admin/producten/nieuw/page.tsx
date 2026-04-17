import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Sale } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default async function NieuwProductPage() {
  const supabase = createAdminClient();
  const [{ data: salesData }, { data: groupsData }] = await Promise.all([
    supabase.from("sales").select("*").order("sort_order"),
    supabase.from("pack_groups").select("*").order("sort_order"),
  ]);
  const sales: Sale[] = salesData ?? [];
  const packGroups: PackGroup[] = groupsData ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm sales={sales} packGroups={packGroups} action={createProduct} />
    </div>
  );
}
