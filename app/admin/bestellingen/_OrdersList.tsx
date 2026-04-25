"use client";

import { useMemo, useState } from "react";
import { ageBucket, ageColor, ageLabel, type AgeBucket } from "@/lib/admin-display";
import {
  togglePaymentStatus,
  toggleDelivered,
  deleteOrder,
  sendOrderReminder,
  sendOverdueOrderReminders,
} from "./actions";

const FMT_CREATED = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" });

function fmtEur(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export type OrderRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  paymentStatus: "pending" | "paid" | "failed";
  paymentReference: string | null;
  totalCents: number;
  itemSummary: string;
  saleId: string | null;
  saleName: string;
  pickupLabel: string | null;
  courierName: string | null;
  isDelivered: boolean;
  createdAt: string;
  lastReminderAt: string | null;
  reminderCount: number;
};

type FilterStatus = "all" | "pending" | "paid" | "overdue";
type SortKey = "smart" | "newest" | "oldest" | "amount";

export function OrdersList({
  orders,
  sales,
  overdueCount,
}: {
  orders: OrderRow[];
  sales: { id: string; name: string }[];
  overdueCount: number;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [saleId, setSaleId] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("smart");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (saleId !== "all" && o.saleId !== saleId) return false;
        if (status === "pending" && o.paymentStatus !== "pending") return false;
        if (status === "paid" && o.paymentStatus !== "paid") return false;
        if (status === "overdue") {
          if (ageBucket(o.createdAt, o.paymentStatus) !== "stale") return false;
        }
        if (q) {
          const hay = [
            o.name,
            o.email,
            o.phone,
            o.paymentReference ?? "",
            o.itemSummary,
            o.saleName,
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
        if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
        if (sort === "amount") return b.totalCents - a.totalCents;
        // smart: pending first (oldest first within pending), then paid (newest first)
        if (a.paymentStatus !== b.paymentStatus) {
          if (a.paymentStatus === "pending") return -1;
          if (b.paymentStatus === "pending") return 1;
        }
        if (a.paymentStatus === "pending") {
          return +new Date(a.createdAt) - +new Date(b.createdAt);
        }
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
  }, [orders, query, status, saleId, sort]);

  return (
    <div className="flex flex-col gap-4">
      {overdueCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-sm p-3 flex-wrap">
          <div className="text-sm">
            <strong className="text-red-700">{overdueCount}</strong>{" "}
            {overdueCount === 1 ? "bestelling staat" : "bestellingen staan"} langer dan 7 dagen open.
          </div>
          <form action={sendOverdueOrderReminders}>
            <button
              type="submit"
              className="text-sm font-semibold px-3 py-1.5 rounded-sm bg-red-sportac text-white hover:bg-red-600 transition-colors"
              title="Stuurt iedereen met een bestelling > 7 dagen open een herinneringsmail (max 1× per 24u per persoon)"
            >
              📨 Stuur herinnering naar iedereen ({overdueCount})
            </button>
          </form>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-[#e8e4df] rounded-sm p-3">
        <input
          type="search"
          placeholder="Zoek op naam, e-mail, mededeling…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[220px] border border-[#e8e4df] rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
        />
        <FilterChip value={status} setValue={setStatus} options={[
          { v: "all", label: "Alle" },
          { v: "pending", label: "Openstaand" },
          { v: "paid", label: "Betaald" },
          { v: "overdue", label: "> 7 d openstaand" },
        ]} />
        {sales.length > 1 && (
          <select
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-red-sportac"
          >
            <option value="all">Alle verkopen</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-red-sportac"
        >
          <option value="smart">Slim sorteren</option>
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="amount">Hoogste bedrag</option>
        </select>
      </div>

      <div className="text-xs text-gray-sub">
        {filtered.length} van {orders.length} {orders.length === 1 ? "bestelling" : "bestellingen"}
      </div>

      <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-sub p-6 text-center">Geen resultaten.</p>
        )}
        <ul className="divide-y divide-[#e8e4df]">
          {filtered.map((o) => (
            <OrderItem key={o.id} order={o} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function FilterChip<T extends string>({
  value,
  setValue,
  options,
}: {
  value: T;
  setValue: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 bg-[#f5f3f0] rounded-sm p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setValue(o.v)}
          className={`text-xs px-2.5 py-1 rounded-sm transition-colors ${
            value === o.v ? "bg-white text-gray-dark font-semibold shadow-sm" : "text-gray-sub hover:text-gray-dark"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OrderItem({ order: o }: { order: OrderRow }) {
  const bucket: AgeBucket = ageBucket(o.createdAt, o.paymentStatus);
  const borderClass =
    bucket === "stale"
      ? "border-l-red-500"
      : bucket === "warm"
        ? "border-l-yellow-400"
        : bucket === "fresh"
          ? "border-l-green-400"
          : "border-l-transparent";
  const dim = o.paymentStatus === "paid" ? "opacity-80" : "";

  const reminderCooldown = o.lastReminderAt
    ? Date.now() - new Date(o.lastReminderAt).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <li className={`grid grid-cols-12 gap-3 items-start px-4 py-3 border-l-4 ${borderClass} ${dim}`}>
      {/* Left: status + age */}
      <div className="col-span-12 md:col-span-2 flex md:flex-col gap-2 md:gap-1 items-center md:items-start">
        <PaymentBadge status={o.paymentStatus} />
        <div className={`text-[11px] font-mono ${ageColor(bucket)}`}>
          {ageLabel(o.createdAt)} · {FMT_CREATED.format(new Date(o.createdAt))}
        </div>
        {o.isDelivered && (
          <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-sm">
            Afgeleverd
          </span>
        )}
      </div>

      {/* Middle: who + what */}
      <div className="col-span-12 md:col-span-6">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-sm text-gray-dark">{o.name}</span>
        </div>
        <div className="text-xs text-gray-sub">
          {o.email}
          {o.phone ? ` · ${o.phone}` : ""}
        </div>
        <div className="text-xs text-gray-body mt-1.5">{o.itemSummary}</div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
          <span className="text-gray-sub">{o.saleName}</span>
          {o.pickupLabel && (
            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-sm">
              🍝 Eetfestijn {o.pickupLabel}
            </span>
          )}
          {o.courierName && (
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm">
              📦 {o.courierName}
            </span>
          )}
          {o.paymentReference && (
            <span className="font-mono text-gray-sub">{o.paymentReference}</span>
          )}
        </div>
        {o.paymentStatus === "pending" && o.lastReminderAt && (
          <p className="text-[11px] text-gray-sub mt-1">
            Laatste herinnering verstuurd {ageLabel(o.lastReminderAt)} geleden
            {o.reminderCount > 1 ? ` · ${o.reminderCount} keer in totaal` : ""}
          </p>
        )}
      </div>

      {/* Right: amount + actions */}
      <div className="col-span-12 md:col-span-4 flex flex-col items-end gap-2">
        <div className="font-condensed font-black text-2xl text-gray-dark leading-none">
          {fmtEur(o.totalCents)}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {o.paymentStatus === "pending" && (
            <form action={sendOrderReminder.bind(null, o.id)}>
              <button
                type="submit"
                disabled={reminderCooldown}
                title={
                  reminderCooldown
                    ? "Je kan maximaal één herinnering per 24u sturen"
                    : "Stuur deze klant een herinneringsmail met de betaalgegevens"
                }
                className="text-[11px] font-semibold px-2.5 py-1 rounded-sm border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📨 Stuur betaalherinnering
              </button>
            </form>
          )}
          {o.paymentStatus !== "failed" && (
            <form action={togglePaymentStatus.bind(null, o.id, o.paymentStatus)}>
              <button
                type="submit"
                title={
                  o.paymentStatus === "paid"
                    ? "Zet terug op openstaand"
                    : "Markeer als betaald (verstuurt bevestigingsmail)"
                }
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-sm border transition-colors ${
                  o.paymentStatus === "paid"
                    ? "border-green-500 text-green-700 hover:bg-green-50"
                    : "border-yellow-400 text-yellow-700 hover:bg-yellow-50 bg-yellow-50/40"
                }`}
              >
                {o.paymentStatus === "paid" ? "✓ Betaald" : "Markeer als betaald"}
              </button>
            </form>
          )}
          <form action={toggleDelivered.bind(null, o.id, o.isDelivered)}>
            <button
              type="submit"
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-sm border transition-colors ${
                o.isDelivered
                  ? "border-[#e8e4df] text-gray-sub hover:border-gray-400"
                  : "border-blue-300 text-blue-700 hover:bg-blue-50"
              }`}
              title={
                o.isDelivered
                  ? "Zet terug op nog te leveren"
                  : "Markeer als afgeleverd"
              }
            >
              {o.isDelivered ? "↩ Nog te leveren" : "📦 Markeer als afgeleverd"}
            </button>
          </form>
          {(o.paymentStatus === "pending" || o.paymentStatus === "failed") && (
            <form action={deleteOrder.bind(null, o.id)}>
              <button
                type="submit"
                className="text-[11px] font-semibold px-2.5 py-1 rounded-sm border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                title="Bestelling permanent verwijderen"
              >
                Verwijderen
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

function PaymentBadge({ status }: { status: "pending" | "paid" | "failed" }) {
  if (status === "paid") {
    return (
      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-sm">Betaald</span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-sm">Mislukt</span>
    );
  }
  return (
    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-sm">Openstaand</span>
  );
}

