import { Resend } from "resend";
import {
  SPORTAC_BENEFICIARY,
  SPORTAC_IBAN_FORMATTED,
  formatAmountDisplay,
} from "@/lib/payment";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Sportac 86 EK <noreply@sportac86ek.be>";
const replyTo = process.env.EMAIL_REPLY_TO ?? "info@sportac86ek.be";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sportac86ek.be";

const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] Resend error:", error);
    }
  } catch (err) {
    console.error("[email] send threw:", err);
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(args: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f5f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;border-radius:4px;">
        <tr><td style="background:#1a1a1a;padding:24px;color:#ffffff;">
          <div style="font-size:12px;color:#E9483B;">Sportac 86 · op weg naar het EK in Noorwegen</div>
          <h1 style="margin:8px 0 0 0;font-size:24px;font-weight:700;letter-spacing:-0.01em;">${escape(args.title)}</h1>
        </td></tr>
        <tr><td style="padding:24px;font-size:14px;line-height:1.6;color:#333333;">
          ${args.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e8e4df;background:#fafafa;color:#888888;font-size:12px;">
          Vragen? Antwoord op deze mail of mail naar <a href="mailto:${escape(replyTo)}" style="color:#E9483B;">${escape(replyTo)}</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type PaymentInstructionsArgs = {
  to: string;
  name: string;
  reference: string;
  totalCents: number;
  kind: "order" | "registration";
  itemSummary: string;
  contextLabel?: string;
};

export async function sendPaymentInstructions(args: PaymentInstructionsArgs): Promise<void> {
  const amount = formatAmountDisplay(args.totalCents);
  const link = `${siteUrl}/betaling/${args.reference}`;
  const what = args.kind === "order" ? "bestelling" : "inschrijving";

  const subject = `Bedankt voor je ${what} (${args.reference})`;
  const firstName = args.name.split(" ")[0];

  const bodyHtml = `
    <p>Dag ${escape(firstName)},</p>
    <p>Super dat je ons steunt${args.kind === "order" && args.contextLabel ? ` met je bestelling uit onze <strong>${escape(args.contextLabel)}</strong>-actie` : args.kind === "registration" && args.contextLabel ? ` met je inschrijving voor <strong>${escape(args.contextLabel)}</strong>` : ` met je ${what}`}! We hebben alles goed ontvangen.</p>
    <p>Om alles rond te maken vragen we je om het bedrag over te schrijven. Zodra het binnen is, sturen we je een bevestiging.</p>
    <table cellpadding="10" cellspacing="0" style="margin:16px 0;border:1px solid #e8e4df;border-radius:4px;width:100%;font-size:13px;">
      <tr><td style="color:#888;width:160px;">Begunstigde</td><td>${escape(SPORTAC_BENEFICIARY)}</td></tr>
      <tr><td style="color:#888;">IBAN</td><td style="font-family:monospace;">${escape(SPORTAC_IBAN_FORMATTED)}</td></tr>
      <tr><td style="color:#888;">Bedrag</td><td><strong>${amount}</strong></td></tr>
      <tr><td style="color:#888;">Mededeling</td><td><span style="font-family:monospace;background:#fff7e6;border:1px solid #f0d090;padding:2px 6px;border-radius:3px;">${escape(args.reference)}</span></td></tr>
    </table>
    <p style="color:#555;">Vergeet de mededeling niet — zo vinden we je betaling meteen terug.</p>
    <p>Liever scannen met je banking-app? Open de QR-code:</p>
    <p><a href="${escape(link)}" style="display:inline-block;background:#E9483B;color:#fff;text-decoration:none;padding:10px 18px;border-radius:3px;font-weight:bold;">QR-code openen</a></p>
    <p style="color:#888;font-size:12px;">Of kopieer deze link: ${escape(link)}</p>
    <p style="margin-top:24px;color:#555;font-size:13px;">Wat je besteld hebt: ${escape(args.itemSummary)}</p>
    <p style="margin-top:24px;">Dankjewel voor de steun!</p>
    <p>Team Sportac 86</p>
  `;

  const text = [
    `Dag ${firstName},`,
    ``,
    `Super dat je ons steunt${args.kind === "order" && args.contextLabel ? ` met je bestelling uit onze ${args.contextLabel}-actie` : args.kind === "registration" && args.contextLabel ? ` met je inschrijving voor ${args.contextLabel}` : ` met je ${what}`}! We hebben alles goed ontvangen.`,
    ``,
    `Om alles rond te maken vragen we je om het bedrag over te schrijven. Zodra het binnen is, sturen we je een bevestiging.`,
    ``,
    `Begunstigde: ${SPORTAC_BENEFICIARY}`,
    `IBAN:        ${SPORTAC_IBAN_FORMATTED}`,
    `Bedrag:      ${amount}`,
    `Mededeling:  ${args.reference}`,
    ``,
    `Vergeet de mededeling niet — zo vinden we je betaling meteen terug.`,
    ``,
    `Liever scannen met je banking-app? Open de QR-code: ${link}`,
    ``,
    `Wat je besteld hebt: ${args.itemSummary}`,
    ``,
    `Dankjewel voor de steun!`,
    `Team Sportac 86`,
  ].join("\n");

  await send({ to: args.to, subject, html: layout({ title: "Bedankt voor je steun", bodyHtml }), text });
}

type LineItemForEmail = {
  name: string;
  quantity: number;
  unitCents: number;
};

function renderLineItemsHtml(items: LineItemForEmail[], totalCents: number): string {
  const rows = items
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f0eee8;">${escape(l.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0eee8;text-align:right;font-variant-numeric:tabular-nums;">${l.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0eee8;text-align:right;font-variant-numeric:tabular-nums;color:#888;">${formatAmountDisplay(l.unitCents)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0eee8;text-align:right;font-variant-numeric:tabular-nums;">${formatAmountDisplay(l.unitCents * l.quantity)}</td>
      </tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8e4df;border-radius:4px;font-size:13px;border-collapse:separate;border-spacing:0;">
    <thead>
      <tr style="background:#fafafa;color:#888;text-align:left;">
        <th style="padding:6px 8px;font-weight:600;border-bottom:1px solid #e8e4df;">Item</th>
        <th style="padding:6px 8px;font-weight:600;text-align:right;border-bottom:1px solid #e8e4df;">Aantal</th>
        <th style="padding:6px 8px;font-weight:600;text-align:right;border-bottom:1px solid #e8e4df;">Stuk</th>
        <th style="padding:6px 8px;font-weight:600;text-align:right;border-bottom:1px solid #e8e4df;">Subtotaal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr>
        <td colspan="3" style="padding:8px;text-align:right;font-weight:bold;">Totaal</td>
        <td style="padding:8px;text-align:right;font-weight:bold;font-variant-numeric:tabular-nums;">${formatAmountDisplay(totalCents)}</td>
      </tr>
    </tbody>
  </table>`;
}

function renderLineItemsText(items: LineItemForEmail[], totalCents: number): string {
  const lines = items.map(
    (l) => `  ${l.quantity}× ${l.name} @ ${formatAmountDisplay(l.unitCents)} = ${formatAmountDisplay(l.unitCents * l.quantity)}`,
  );
  lines.push(`  Totaal: ${formatAmountDisplay(totalCents)}`);
  return lines.join("\n");
}

type PaymentReminderArgs = {
  to: string;
  name: string;
  reference: string;
  totalCents: number;
  kind: "order" | "registration";
  contextLabel?: string;
  lineItems: LineItemForEmail[];
  reminderCount: number;
};

export async function sendPaymentReminder(args: PaymentReminderArgs): Promise<void> {
  const amount = formatAmountDisplay(args.totalCents);
  const link = `${siteUrl}/betaling/${args.reference}`;
  const what = args.kind === "order" ? "bestelling" : "inschrijving";
  const firstName = args.name.split(" ")[0];

  const subject = `Kleine herinnering — betaling ${args.reference}`;

  const lineItemsHtml = args.lineItems.length > 0 ? renderLineItemsHtml(args.lineItems, args.totalCents) : "";
  const lineItemsText = args.lineItems.length > 0 ? renderLineItemsText(args.lineItems, args.totalCents) : `  Totaal: ${amount}`;

  const bodyHtml = `
    <p>Dag ${escape(firstName)},</p>
    <p>Even een vriendelijke herinnering — we hebben je betaling voor je ${what}${args.kind === "order" && args.contextLabel ? ` uit onze <strong>${escape(args.contextLabel)}</strong>-actie` : args.kind === "registration" && args.contextLabel ? ` voor <strong>${escape(args.contextLabel)}</strong>` : ""} nog niet ontvangen. Geen zorgen, het overkomt iedereen weleens. Hieronder vind je de gegevens nog eens.</p>
    ${lineItemsHtml ? `<div style="margin:16px 0;">${lineItemsHtml}</div>` : ""}
    <table cellpadding="10" cellspacing="0" style="margin:16px 0;border:1px solid #e8e4df;border-radius:4px;width:100%;font-size:13px;">
      <tr><td style="color:#888;width:160px;">Begunstigde</td><td>${escape(SPORTAC_BENEFICIARY)}</td></tr>
      <tr><td style="color:#888;">IBAN</td><td style="font-family:monospace;">${escape(SPORTAC_IBAN_FORMATTED)}</td></tr>
      <tr><td style="color:#888;">Bedrag</td><td><strong>${amount}</strong></td></tr>
      <tr><td style="color:#888;">Mededeling</td><td><span style="font-family:monospace;background:#fff7e6;border:1px solid #f0d090;padding:2px 6px;border-radius:3px;">${escape(args.reference)}</span></td></tr>
    </table>
    <p style="color:#555;">Vergeet de mededeling niet — zo vinden we je betaling meteen terug.</p>
    <p>Liever scannen? Open de QR-code:</p>
    <p><a href="${escape(link)}" style="display:inline-block;background:#E9483B;color:#fff;text-decoration:none;padding:10px 18px;border-radius:3px;font-weight:bold;">QR-code openen</a></p>
    <p style="color:#888;font-size:12px;">Of kopieer deze link: ${escape(link)}</p>
    <p style="margin-top:24px;color:#555;">Heb je het ondertussen al overgeschreven? Dan kruisen onze mails elkaar — alvast bedankt en sorry voor de ruis!</p>
    <p>Team Sportac 86</p>
  `;

  const text = [
    `Dag ${firstName},`,
    ``,
    `Even een vriendelijke herinnering — we hebben je betaling voor je ${what}${args.kind === "order" && args.contextLabel ? ` uit onze ${args.contextLabel}-actie` : args.kind === "registration" && args.contextLabel ? ` voor ${args.contextLabel}` : ""} nog niet ontvangen. Geen zorgen, het overkomt iedereen weleens.`,
    ``,
    `Wat we voor je noteerden:`,
    lineItemsText,
    ``,
    `Begunstigde: ${SPORTAC_BENEFICIARY}`,
    `IBAN:        ${SPORTAC_IBAN_FORMATTED}`,
    `Bedrag:      ${amount}`,
    `Mededeling:  ${args.reference}`,
    ``,
    `Vergeet de mededeling niet — zo vinden we je betaling meteen terug.`,
    ``,
    `Liever scannen? Open de QR-code: ${link}`,
    ``,
    `Heb je het ondertussen al overgeschreven? Dan kruisen onze mails elkaar — alvast bedankt!`,
    `Team Sportac 86`,
  ].join("\n");

  await send({
    to: args.to,
    subject,
    html: layout({ title: "Kleine herinnering", bodyHtml }),
    text,
  });
}

type PaymentConfirmationArgs = {
  to: string;
  name: string;
  reference: string;
  totalCents: number;
  kind: "order" | "registration";
  contextLabel?: string;
  itemSummary?: string;
};

export async function sendPaymentConfirmation(args: PaymentConfirmationArgs): Promise<void> {
  const what = args.kind === "order" ? "bestelling" : "inschrijving";
  const firstName = args.name.split(" ")[0];
  const subject = `Je betaling is binnen — bedankt!`;

  const bodyHtml = `
    <p>Dag ${escape(firstName)},</p>
    <p>Je betaling van <strong>${formatAmountDisplay(args.totalCents)}</strong> is bij ons toegekomen${args.kind === "order" && args.contextLabel ? ` voor je bestelling uit onze <strong>${escape(args.contextLabel)}</strong>-actie` : args.kind === "registration" && args.contextLabel ? ` voor je inschrijving voor <strong>${escape(args.contextLabel)}</strong>` : ""}. Alles staat in orde — niets meer dat je hoeft te doen.</p>
    ${args.itemSummary ? `<p style="color:#555;font-size:13px;">Wat we voor je noteerden: ${escape(args.itemSummary)}</p>` : ""}
    <p>Bedankt om onze skippers te steunen — dankzij jou raken we wat verder richting Noorwegen.</p>
    <p>Tot binnenkort,<br/>Team Sportac 86</p>
    <p style="color:#888;font-size:12px;margin-top:24px;">Referentie: ${escape(args.reference)}</p>
  `;

  const text = [
    `Dag ${firstName},`,
    ``,
    `Je betaling van ${formatAmountDisplay(args.totalCents)} is bij ons toegekomen${args.kind === "order" && args.contextLabel ? ` voor je bestelling uit onze ${args.contextLabel}-actie` : args.kind === "registration" && args.contextLabel ? ` voor je inschrijving voor ${args.contextLabel}` : ""}. Alles staat in orde — niets meer dat je hoeft te doen.`,
    ``,
    ...(args.itemSummary ? [`Wat we voor je noteerden: ${args.itemSummary}`, ``] : []),
    `Bedankt om onze skippers te steunen — dankzij jou raken we wat verder richting Noorwegen.`,
    ``,
    `Tot binnenkort,`,
    `Team Sportac 86`,
    ``,
    `Referentie: ${args.reference}`,
  ].join("\n");

  await send({ to: args.to, subject, html: layout({ title: "Je betaling is binnen", bodyHtml }), text });
}
