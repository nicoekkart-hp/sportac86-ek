import { Product, PackGroup } from "@/lib/types";

export type StripeLine = {
  name: string;
  unitAmount: number;
  quantity: number;
};

export type CartResult = {
  stripeLines: StripeLine[];
  totalCents: number;
};

export function calcCart(
  products: Product[],
  groups: PackGroup[],
  items: Record<string, number>,
): CartResult {
  const productById = new Map(products.map((p) => [p.id, p]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // Sum quantities per group; track ungrouped separately.
  const qtyByGroup = new Map<string, number>();
  const ungrouped: Array<{ product: Product; qty: number }> = [];

  for (const [productId, qty] of Object.entries(items)) {
    if (!qty || qty <= 0) continue;
    const product = productById.get(productId);
    if (!product) continue;

    if (product.pack_group_id && groupById.has(product.pack_group_id)) {
      qtyByGroup.set(
        product.pack_group_id,
        (qtyByGroup.get(product.pack_group_id) ?? 0) + qty,
      );
    } else {
      ungrouped.push({ product, qty });
    }
  }

  const stripeLines: StripeLine[] = [];
  let totalCents = 0;

  // Emit group lines in the group's sort_order, then by name for determinism.
  const orderedGroupIds = Array.from(qtyByGroup.keys()).sort((a, b) => {
    const ga = groupById.get(a)!;
    const gb = groupById.get(b)!;
    if (ga.sort_order !== gb.sort_order) return ga.sort_order - gb.sort_order;
    return ga.name.localeCompare(gb.name);
  });

  for (const groupId of orderedGroupIds) {
    const group = groupById.get(groupId)!;
    const totalQty = qtyByGroup.get(groupId)!;
    const packs = Math.floor(totalQty / group.pack_size);
    const singles = totalQty % group.pack_size;

    if (packs > 0) {
      stripeLines.push({
        name: `${group.name} (doos van ${group.pack_size})`,
        unitAmount: group.pack_price_cents,
        quantity: packs,
      });
      totalCents += packs * group.pack_price_cents;
    }
    if (singles > 0) {
      stripeLines.push({
        name: group.name,
        unitAmount: group.unit_price_cents,
        quantity: singles,
      });
      totalCents += singles * group.unit_price_cents;
    }
  }

  // Ungrouped products keep their own per-product price.
  for (const { product, qty } of ungrouped) {
    stripeLines.push({
      name: product.name,
      unitAmount: product.price_cents,
      quantity: qty,
    });
    totalCents += qty * product.price_cents;
  }

  return { stripeLines, totalCents };
}
