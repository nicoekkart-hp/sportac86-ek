import { Product } from "@/lib/types";

export type StripeLine = {
  name: string;
  unitAmount: number;
  quantity: number;
};

export type PriceLine = {
  productId: string;
  productName: string;
  packs: number;
  singles: number;
  totalCents: number;
  stripeLines: StripeLine[];
};

export function calcLine(product: Product, qty: number): PriceLine {
  const hasPack =
    product.pack_size !== null &&
    product.pack_price_cents !== null &&
    product.pack_size > 1 &&
    product.pack_price_cents > 0;

  if (!hasPack) {
    return {
      productId: product.id,
      productName: product.name,
      packs: 0,
      singles: qty,
      totalCents: qty * product.price_cents,
      stripeLines:
        qty > 0
          ? [{ name: product.name, unitAmount: product.price_cents, quantity: qty }]
          : [],
    };
  }

  const packSize = product.pack_size!;
  const packPrice = product.pack_price_cents!;
  const packs = Math.floor(qty / packSize);
  const singles = qty % packSize;
  const totalCents = packs * packPrice + singles * product.price_cents;

  const stripeLines: StripeLine[] = [];
  if (packs > 0) {
    stripeLines.push({
      name: `${product.name} (doos van ${packSize})`,
      unitAmount: packPrice,
      quantity: packs,
    });
  }
  if (singles > 0) {
    stripeLines.push({
      name: product.name,
      unitAmount: product.price_cents,
      quantity: singles,
    });
  }

  return {
    productId: product.id,
    productName: product.name,
    packs,
    singles,
    totalCents,
    stripeLines,
  };
}
