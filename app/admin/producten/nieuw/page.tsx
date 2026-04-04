import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default async function NieuwProductPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm sales={sales} action={createProduct} />
    </div>
  );
}
