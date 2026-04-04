import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { updateProduct } from "../actions";

export default async function BewerkenProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  if (!data) notFound();
  const product = data as Product;
  const action = updateProduct.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} action={action} />
    </div>
  );
}
