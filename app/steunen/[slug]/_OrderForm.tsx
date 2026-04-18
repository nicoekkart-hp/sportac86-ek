"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PackGroup, Product, TeamMember } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { calcCart } from "@/lib/pricing";
import { ProductInfoModal } from "@/components/ProductInfoModal";

type Props = {
  saleId: string;
  saleSlug: string;
  products: Product[];
  packGroups: PackGroup[];
  members: Pick<TeamMember, "id" | "name">[];
};

export function OrderForm({ saleId, saleSlug, products, packGroups, members }: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});

  const groupById = useMemo(() => new Map(packGroups.map((g) => [g.id, g])), [packGroups]);
  const productsByGroup = useMemo(() => {
    const map = new Map<string, Product[]>();
    const ungrouped: Product[] = [];
    for (const p of products) {
      if (p.pack_group_id && groupById.has(p.pack_group_id)) {
        const list = map.get(p.pack_group_id) ?? [];
        list.push(p);
        map.set(p.pack_group_id, list);
      } else {
        ungrouped.push(p);
      }
    }
    return { byGroup: map, ungrouped };
  }, [products, groupById]);

  const cart = useMemo(() => calcCart(products, packGroups, qty), [products, packGroups, qty]);

  const setProductQty = (id: string, value: number) => {
    setQty((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  return (
    <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-6">
      <input type="hidden" name="sale_id" value={saleId} />
      <input type="hidden" name="sale_slug" value={saleSlug} />

      {packGroups.map((g) => {
        const groupProducts = productsByGroup.byGroup.get(g.id) ?? [];
        if (groupProducts.length === 0) return null;
        return (
          <section key={g.id} className="flex flex-col gap-3">
            <header className="border-b border-[#e8e4df] pb-2">
              <h3 className="font-condensed font-black italic text-xl text-gray-dark">{g.name}</h3>
              <p className="text-xs text-gray-sub">
                {formatPrice(g.unit_price_cents)} per fles · doos van {g.pack_size}: {formatPrice(g.pack_price_cents)}
              </p>
            </header>
            {groupProducts.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                group={g}
                value={qty[p.id] ?? 0}
                onChange={(v) => setProductQty(p.id, v)}
              />
            ))}
          </section>
        );
      })}

      {productsByGroup.ungrouped.length > 0 && (
        <section className="flex flex-col gap-3">
          {packGroups.length > 0 && (
            <header className="border-b border-[#e8e4df] pb-2">
              <h3 className="font-condensed font-black italic text-xl text-gray-dark">Overige producten</h3>
            </header>
          )}
          {productsByGroup.ungrouped.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              group={null}
              value={qty[p.id] ?? 0}
              onChange={(v) => setProductQty(p.id, v)}
            />
          ))}
        </section>
      )}

      {products.length === 0 && <p className="text-sm text-gray-sub">Geen producten beschikbaar.</p>}

      <div className="bg-[#f5f3f0] border border-[#e8e4df] rounded-sm p-4 flex flex-col gap-2">
        <div className="text-xs font-bold tracking-[0.15em] uppercase text-gray-sub">Overzicht</div>
        {cart.stripeLines.length === 0 ? (
          <p className="text-sm text-gray-sub">Voeg producten toe om de prijs te berekenen.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {cart.stripeLines.map((line, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-gray-body">
                    {line.quantity}× {line.name}
                  </span>
                  <span className="text-gray-dark font-mono tabular-nums">
                    €{((line.quantity * line.unitAmount) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-[#e8e4df] pt-2 mt-1 text-sm font-bold">
              <span>Totaal</span>
              <span className="font-mono tabular-nums">
                €{(cart.totalCents / 100).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </>
        )}
      </div>

      <hr className="border-[#e8e4df]" />

      <div>
        <label className="block text-sm font-semibold mb-1">Naam *</label>
        <input
          type="text"
          name="name"
          required
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
        <input
          type="email"
          name="email"
          required
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
        <input
          type="tel"
          name="phone"
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">
          Wie brengt jouw bestelling?{" "}
          <span className="text-gray-sub font-normal">(optioneel)</span>
        </label>
        <select
          name="contact_member_id"
          defaultValue=""
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
        >
          <option value="">— Geen voorkeur —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={cart.totalCents === 0}
        className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cart.totalCents === 0
          ? "Bestelling plaatsen & betalen"
          : `Bestelling plaatsen & betalen · €${(cart.totalCents / 100).toFixed(2).replace(".", ",")}`}
      </button>
    </form>
  );
}

function ProductRow({
  product,
  group,
  value,
  onChange,
}: {
  product: Product;
  group: PackGroup | null;
  value: number;
  onChange: (v: number) => void;
}) {
  const unitLabel = group ? formatPrice(group.unit_price_cents) : formatPrice(product.price_cents);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-[#f5f3f0] flex-shrink-0">
        {product.image_url && (
          <Image src={product.image_url} alt="" fill className="object-cover" sizes="48px" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={product.id} className="text-sm font-semibold block truncate">
          {product.name}
        </label>
        <div className="flex items-center gap-2 text-xs text-gray-sub">
          <span>{unitLabel}</span>
          {product.description && <ProductInfoModal product={product} group={group} />}
        </div>
      </div>
      <input
        id={product.id}
        type="number"
        name={`items.${product.id}`}
        min={0}
        max={99}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
      />
    </div>
  );
}
