import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default function NieuwProductPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm action={createProduct} />
    </div>
  );
}
