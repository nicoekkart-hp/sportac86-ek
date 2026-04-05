import { createAdminClient } from "@/lib/supabase-admin";
import { Order } from "@/lib/types";
import { toggleOrderStatus, togglePaymentStatus, toggleDelivered } from "./actions";

type OrderRow = Order & {
  sales: { name: string } | null;
  team_members: { name: string } | null;
};

export default async function BestellingenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, sales(name), team_members!contact_member_id(name)")
    .order("created_at", { ascending: false });
  const orders: OrderRow[] = data ?? [];

  const newOrders = orders.filter((o) => o.status === "new");
  const handledOrders = orders.filter((o) => o.status === "handled");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Bestellingen</h1>
        <p className="text-gray-sub text-sm mt-1">{newOrders.length} nieuw · {handledOrders.length} afgehandeld</p>
      </div>

      {orders.length === 0 && <p className="text-gray-sub text-sm">Nog geen bestellingen.</p>}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className={`bg-white border rounded-sm p-4 flex items-start gap-4 ${o.status === "new" ? "border-red-sportac/40" : "border-[#e8e4df]"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm">{o.name}</span>
                {o.sales && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm uppercase">
                    {o.sales.name}
                  </span>
                )}
                {o.status === "new" && (
                  <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">
                    Nieuw
                  </span>
                )}
                {o.team_members && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm">
                    📦 {o.team_members.name}
                  </span>
                )}
                {o.is_delivered && (
                  <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-sm">
                    Afgeleverd
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-sub mb-1">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(o.items).map(([productId, qty]) => (
                  <span key={productId} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-sm">
                    {productId} ×{qty}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-sub mt-1.5">
                {new Date(o.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end shrink-0">
              {/* Order status toggle */}
              <form action={toggleOrderStatus.bind(null, o.id, o.status)}>
                <button
                  type="submit"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                    o.status === "new"
                      ? "border-green-500 text-green-700 hover:bg-green-50"
                      : "border-[#e8e4df] text-gray-sub hover:border-gray-400"
                  }`}
                >
                  {o.status === "new" ? "✓ Afgehandeld" : "↩ Opnieuw openen"}
                </button>
              </form>

              {/* Payment status toggle */}
              {o.payment_status === "paid" && (
                <form action={togglePaymentStatus.bind(null, o.id, o.payment_status)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-green-500 text-green-700 hover:bg-green-50 transition-colors"
                  >
                    ✓ Betaald
                  </button>
                </form>
              )}
              {o.payment_status === "pending" && (
                <form action={togglePaymentStatus.bind(null, o.id, o.payment_status)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition-colors"
                  >
                    In afwachting
                  </button>
                </form>
              )}
              {o.payment_status === "failed" && (
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">
                  Mislukt
                </span>
              )}

              {/* Delivery toggle */}
              <form action={toggleDelivered.bind(null, o.id, o.is_delivered)}>
                <button
                  type="submit"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                    o.is_delivered
                      ? "border-[#e8e4df] text-gray-sub hover:border-gray-400"
                      : "border-blue-400 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {o.is_delivered ? "↩ Nog te leveren" : "✓ Afgeleverd"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
