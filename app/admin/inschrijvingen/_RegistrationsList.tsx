"use client";

import { useMemo, useState } from "react";
import { ageBucket, ageColor, ageLabel, type AgeBucket } from "@/lib/admin-display";
import {
  deleteRegistration,
  togglePaymentStatus,
  sendRegistrationReminder,
  sendOverdueRegistrationReminders,
} from "./actions";

const FMT_DATE = new Intl.DateTimeFormat("nl-BE", { weekday: "short", day: "numeric", month: "short" });
const FMT_CREATED = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" });

function parseLocalDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtEur(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export type RegRow = {
  id: string;
  name: string;
  email: string;
  numPersons: number;
  remarks: string | null;
  paymentStatus: "pending" | "paid" | "failed";
  paymentReference: string | null;
  totalCents: number;
  ticketSummary: string;
  eventId: string;
  eventTitle: string;
  slotDate: string | null;
  createdAt: string;
  lastReminderAt: string | null;
  reminderCount: number;
};

type FilterStatus = "all" | "pending" | "paid" | "overdue";
type SortKey = "smart" | "newest" | "oldest" | "amount";

export function RegistrationsList({
  rows,
  events,
  overdueCount,
}: {
  rows: RegRow[];
  events: { id: string; title: string }[];
  overdueCount: number;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [eventId, setEventId] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("smart");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (eventId !== "all" && r.eventId !== eventId) return false;
        if (status === "pending" && r.paymentStatus !== "pending") return false;
        if (status === "paid" && r.paymentStatus !== "paid") return false;
        if (status === "overdue") {
          if (ageBucket(r.createdAt, r.paymentStatus) !== "stale") return false;
        }
        if (q) {
          const hay = [
            r.name,
            r.email,
            r.paymentReference ?? "",
            r.ticketSummary,
            r.eventTitle,
            r.remarks ?? "",
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
        if (a.paymentStatus !== b.paymentStatus) {
          if (a.paymentStatus === "pending") return -1;
          if (b.paymentStatus === "pending") return 1;
        }
        if (a.paymentStatus === "pending") {
          return +new Date(a.createdAt) - +new Date(b.createdAt);
        }
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
  }, [rows, query, status, eventId, sort]);

  return (
    <div className="flex flex-col gap-4">
      {overdueCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-sm p-3 flex-wrap">
          <div className="text-sm">
            <strong className="text-red-700">{overdueCount}</strong>{" "}
            {overdueCount === 1 ? "inschrijving staat" : "inschrijvingen staan"} langer dan 7 dagen open.
          </div>
          <form action={sendOverdueRegistrationReminders}>
            <button
              type="submit"
              className="text-sm font-semibold px-3 py-1.5 rounded-sm bg-red-sportac text-white hover:bg-red-600 transition-colors"
              title="Stuurt iedereen met een inschrijving > 7 dagen open een herinneringsmail (max 1× per 24u per persoon)"
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
        <FilterChip
          value={status}
          setValue={setStatus}
          options={[
            { v: "all", label: "Alle" },
            { v: "pending", label: "Openstaand" },
            { v: "paid", label: "Betaald" },
            { v: "overdue", label: "> 7 d openstaand" },
          ]}
        />
        {events.length > 1 && (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-red-sportac"
          >
            <option value="all">Alle evenementen</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
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
        {filtered.length} van {rows.length} {rows.length === 1 ? "inschrijving" : "inschrijvingen"}
      </div>

      <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-sub p-6 text-center">Geen resultaten.</p>
        )}
        <ul className="divide-y divide-[#e8e4df]">
          {filtered.map((r) => (
            <RegItem key={r.id} reg={r} />
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

function RegItem({ reg: r }: { reg: RegRow }) {
  const bucket: AgeBucket = ageBucket(r.createdAt, r.paymentStatus);
  const borderClass =
    bucket === "stale"
      ? "border-l-red-500"
      : bucket === "warm"
        ? "border-l-yellow-400"
        : bucket === "fresh"
          ? "border-l-green-400"
          : "border-l-transparent";
  const dim = r.paymentStatus === "paid" ? "opacity-80" : "";

  return (
    <li className={`grid grid-cols-12 gap-3 items-start px-4 py-3 border-l-4 ${borderClass} ${dim}`}>
      <div className="col-span-12 md:col-span-2 flex md:flex-col gap-2 md:gap-1 items-center md:items-start">
        <PaymentBadge status={r.paymentStatus} />
        <div className={`text-[11px] font-mono ${ageColor(bucket)}`}>
          {ageLabel(r.createdAt)} · {FMT_CREATED.format(new Date(r.createdAt))}
        </div>
      </div>

      <div className="col-span-12 md:col-span-6">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-sm text-gray-dark">{r.name}</span>
          {r.numPersons > 1 && (
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm">
              {r.numPersons} personen
            </span>
          )}
        </div>
        <div className="text-xs text-gray-sub">{r.email}</div>
        <div className="text-xs text-gray-body mt-1.5">{r.ticketSummary}</div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
          <span className="text-gray-sub">{r.eventTitle}</span>
          {r.slotDate && (
            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-sm">
              📅 {FMT_DATE.format(parseLocalDate(r.slotDate))}
            </span>
          )}
          {r.paymentReference && (
            <span className="font-mono text-gray-sub">{r.paymentReference}</span>
          )}
        </div>
        {r.remarks && (
          <p className="text-[11px] text-gray-sub mt-1 italic">"{r.remarks}"</p>
        )}
      </div>

      <div className="col-span-12 md:col-span-4 flex flex-col items-end gap-2">
        <div className="font-condensed font-black text-2xl text-gray-dark leading-none">
          {r.totalCents > 0 ? fmtEur(r.totalCents) : <span className="text-gray-sub text-base">Gratis</span>}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {r.paymentStatus === "pending" && r.totalCents > 0 && (
            <form action={sendRegistrationReminder.bind(null, r.id)}>
              <button
                type="submit"
                disabled={
                  r.lastReminderAt
                    ? Date.now() - new Date(r.lastReminderAt).getTime() < 24 * 60 * 60 * 1000
                    : false
                }
                title={
                  r.lastReminderAt &&
                  Date.now() - new Date(r.lastReminderAt).getTime() < 24 * 60 * 60 * 1000
                    ? "Je kan maximaal één herinnering per 24u sturen"
                    : "Stuur deze persoon een herinneringsmail met de betaalgegevens"
                }
                className="text-[11px] font-semibold px-2.5 py-1 rounded-sm border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📨 Stuur betaalherinnering
              </button>
            </form>
          )}
          {r.paymentStatus !== "failed" && r.totalCents > 0 && (
            <form action={togglePaymentStatus.bind(null, r.id, r.paymentStatus)}>
              <button
                type="submit"
                title={
                  r.paymentStatus === "paid"
                    ? "Zet terug op openstaand"
                    : "Markeer als betaald (verstuurt bevestigingsmail)"
                }
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-sm border transition-colors ${
                  r.paymentStatus === "paid"
                    ? "border-green-500 text-green-700 hover:bg-green-50"
                    : "border-yellow-400 text-yellow-700 hover:bg-yellow-50 bg-yellow-50/40"
                }`}
              >
                {r.paymentStatus === "paid" ? "✓ Betaald" : "Markeer als betaald"}
              </button>
            </form>
          )}
          {r.paymentStatus === "pending" && (
            <form action={deleteRegistration.bind(null, r.id)}>
              <button
                type="submit"
                className="text-[11px] font-semibold px-2.5 py-1 rounded-sm border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                title="Inschrijving permanent verwijderen"
              >
                Verwijderen
              </button>
            </form>
          )}
        </div>
        {r.paymentStatus === "pending" && r.lastReminderAt && (
          <p className="text-[10px] text-gray-sub text-right">
            Laatste herinnering verstuurd {ageLabel(r.lastReminderAt)} geleden
            {r.reminderCount > 1 ? ` · ${r.reminderCount}×` : ""}
          </p>
        )}
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
