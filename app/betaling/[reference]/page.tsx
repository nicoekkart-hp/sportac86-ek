import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase-admin";
import { calcCart } from "@/lib/pricing";
import {
  buildEpcQrPayload,
  formatAmountDisplay,
  SPORTAC_BENEFICIARY,
  SPORTAC_IBAN_FORMATTED,
} from "@/lib/payment";

export const dynamic = "force-dynamic";

type LookupResult =
  | {
      kind: "order";
      reference: string;
      name: string;
      email: string;
      paymentStatus: string;
      totalCents: number;
      backHref: string;
    }
  | {
      kind: "registration";
      reference: string;
      name: string;
      email: string;
      paymentStatus: string;
      totalCents: number;
      backHref: string;
      eventTitle: string;
    };

async function lookup(reference: string): Promise<LookupResult | null> {
  const supabase = createAdminClient();

  if (reference.startsWith("BEST-")) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, sale_id, name, email, items, payment_status, payment_reference")
      .eq("payment_reference", reference)
      .single();
    if (!order) return null;

    let totalCents = 0;
    let backHref = "/steunen";
    if (order.sale_id) {
      const [{ data: products }, { data: groups }, { data: sale }] = await Promise.all([
        supabase.from("products").select("*").eq("sale_id", order.sale_id),
        supabase.from("pack_groups").select("*").eq("sale_id", order.sale_id),
        supabase.from("sales").select("slug").eq("id", order.sale_id).single(),
      ]);
      const cart = calcCart(products ?? [], groups ?? [], order.items ?? {});
      totalCents = cart.totalCents;
      if (sale?.slug) backHref = `/steunen/${sale.slug}`;
    }

    return {
      kind: "order",
      reference: order.payment_reference,
      name: order.name,
      email: order.email,
      paymentStatus: order.payment_status,
      totalCents,
      backHref,
    };
  }

  if (reference.startsWith("INS-")) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, event_id, name, email, tickets, payment_status, payment_reference")
      .eq("payment_reference", reference)
      .single();
    if (!reg) return null;

    const [{ data: event }, { data: ticketRows }] = await Promise.all([
      supabase.from("events").select("title, slug").eq("id", reg.event_id).single(),
      supabase.from("event_tickets").select("id, price_cents").eq("event_id", reg.event_id),
    ]);

    const priceById = new Map((ticketRows ?? []).map((t) => [t.id, t.price_cents]));
    let totalCents = 0;
    for (const [tid, qty] of Object.entries((reg.tickets as Record<string, number>) ?? {})) {
      totalCents += (priceById.get(tid) ?? 0) * qty;
    }

    return {
      kind: "registration",
      reference: reg.payment_reference,
      name: reg.name,
      email: reg.email,
      paymentStatus: reg.payment_status,
      totalCents,
      backHref: event?.slug ? `/agenda/${event.slug}` : "/agenda",
      eventTitle: event?.title ?? "Evenement",
    };
  }

  return null;
}

export default async function BetalingPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const record = await lookup(reference);
  if (!record) notFound();

  const isPaid = record.paymentStatus === "paid";
  const epcPayload = buildEpcQrPayload({
    amountCents: record.totalCents,
    reference: record.reference,
  });
  const qrSvg = await QRCode.toString(epcPayload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  return (
    <div className="pt-16">
      <div className="bg-gray-dark py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Betaling</span>
          </div>
          <h1 className="font-condensed font-black italic text-5xl leading-none text-white mb-3">
            {isPaid ? (
              <>Bedankt — <em className="not-italic text-red-sportac">betaling ontvangen</em></>
            ) : (
              <>Bevestig je <em className="not-italic text-red-sportac">overschrijving</em></>
            )}
          </h1>
          <p className="text-gray-sub text-[15px] max-w-xl leading-relaxed">
            {record.kind === "order" ? (
              <>Bedankt {record.name}, je bestelling is goed binnen. {isPaid
                ? "We hebben je betaling al kunnen koppelen — we nemen contact op zodra alles klaarstaat."
                : "We sturen je dezelfde gegevens ook per mail, dus geen stress."}</>
            ) : (
              <>Bedankt {record.name}, je inschrijving voor <strong className="text-white">{record.eventTitle}</strong> is goed binnen. {isPaid
                ? "Je plaats is bevestigd."
                : "We sturen je dezelfde gegevens ook per mail, dus geen stress."}</>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-sm p-6 text-sm text-green-900">
            <p className="font-bold mb-1">Betaling ontvangen ✓</p>
            <p>We hebben je betaling gekoppeld aan referentie <strong>{record.reference}</strong>. Je hoeft niets meer te doen.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-white border border-[#e8e4df] rounded-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Betaalgegevens</span>
              </div>
              <dl className="text-sm space-y-3 font-mono">
                <div>
                  <dt className="text-xs font-sans text-gray-sub">Begunstigde</dt>
                  <dd className="text-gray-dark">{SPORTAC_BENEFICIARY}</dd>
                </div>
                <div>
                  <dt className="text-xs font-sans text-gray-sub">IBAN</dt>
                  <dd className="text-gray-dark font-bold">{SPORTAC_IBAN_FORMATTED}</dd>
                </div>
                <div>
                  <dt className="text-xs font-sans text-gray-sub">Bedrag</dt>
                  <dd className="text-gray-dark font-bold text-lg">{formatAmountDisplay(record.totalCents)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-sans text-gray-sub">Mededeling</dt>
                  <dd className="text-gray-dark font-bold bg-[#fff7e6] border border-[#f0d090] px-2 py-1 rounded-sm inline-block">{record.reference}</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-sub mt-4 leading-relaxed">
                Gebruik je deze mededeling? Dan koppelen we je betaling automatisch aan je {record.kind === "order" ? "bestelling" : "inschrijving"}.
              </p>
            </div>

            <div className="bg-white border border-[#e8e4df] rounded-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Scan & betaal</span>
              </div>
              <div className="flex justify-center mb-3">
                <div
                  className="bg-white p-2"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
              <p className="text-xs text-gray-sub leading-relaxed text-center">
                Open je banking-app (KBC, Belfius, BNP, ING, Argenta…) en kies <strong>scan QR</strong>. Bedrag, rekeningnummer en mededeling worden automatisch ingevuld.
              </p>
            </div>
          </div>
        )}

        <div className="mt-10 text-sm text-gray-body">
          <p className="mb-2">
            We hebben deze gegevens ook naar <strong className="text-gray-dark">{record.email}</strong> gestuurd, dus je kan rustig op je gemak betalen.
          </p>
          <p>
            Niets ontvangen? Check je spam-folder of mail ons op{" "}
            <a className="text-red-sportac hover:underline" href="mailto:info@sportac86ek.be">info@sportac86ek.be</a>.
          </p>
        </div>

        <div className="mt-8">
          <Link href={record.backHref} className="text-sm text-red-sportac hover:underline">
            ← Terug
          </Link>
        </div>
      </div>
    </div>
  );
}
