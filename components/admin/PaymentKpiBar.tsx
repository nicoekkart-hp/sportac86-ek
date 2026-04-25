function fmtEur(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

type Props = {
  paidCents: number;
  pendingCents: number;
  pendingCount: number;
  overdueCount: number;
  totalCount: number;
};

export function PaymentKpiBar({
  paidCents,
  pendingCents,
  pendingCount,
  overdueCount,
  totalCount,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Kpi
        label="Betaald"
        value={fmtEur(paidCents)}
        sub={`${totalCount - pendingCount} van ${totalCount}`}
        accent="green"
      />
      <Kpi
        label="Openstaand"
        value={fmtEur(pendingCents)}
        sub={`${pendingCount} ${pendingCount === 1 ? "item" : "items"}`}
        accent="yellow"
      />
      <Kpi
        label="Vervallen > 7 d"
        value={String(overdueCount)}
        sub={overdueCount > 0 ? "moet je opvolgen" : "alles onder controle"}
        accent={overdueCount > 0 ? "red" : "gray"}
      />
      <Kpi
        label="Totaal"
        value={fmtEur(paidCents + pendingCents)}
        sub={`${totalCount} ${totalCount === 1 ? "record" : "records"}`}
        accent="gray"
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "green" | "yellow" | "red" | "gray";
}) {
  const accentClass =
    accent === "green"
      ? "border-l-green-500"
      : accent === "yellow"
        ? "border-l-yellow-500"
        : accent === "red"
          ? "border-l-red-500"
          : "border-l-gray-300";
  const valueClass =
    accent === "green"
      ? "text-green-700"
      : accent === "yellow"
        ? "text-yellow-700"
        : accent === "red"
          ? "text-red-700"
          : "text-gray-dark";
  return (
    <div className={`bg-white border border-[#e8e4df] border-l-4 ${accentClass} rounded-sm px-4 py-3`}>
      <div className="text-[11px] font-bold tracking-wider uppercase text-gray-sub">{label}</div>
      <div className={`font-condensed font-black text-3xl leading-tight ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-gray-sub">{sub}</div>
    </div>
  );
}
