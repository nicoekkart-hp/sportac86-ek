import { randomBytes } from "crypto";

export const SPORTAC_IBAN = "BE71731066415669";
export const SPORTAC_IBAN_FORMATTED = "BE71 7310 6641 5669";
export const SPORTAC_BENEFICIARY = "Sportac 86 EK ropeskipping";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRefSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  }
  return out;
}

export function generatePaymentReference(prefix: "BEST" | "INS"): string {
  return `${prefix}-${generateRefSegment(6)}`;
}

export function formatAmountEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatAmountDisplay(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Builds an EPC QR (SEPA Credit Transfer) payload — the European standard
 * that Belgian banking apps (KBC, Belfius, BNP, ING, Argenta) parse to
 * prefill an overschrijving with beneficiary, IBAN, amount and communication.
 *
 * Spec: EPC069-12 v2.1 (BCD/002/1/SCT). Max 331 bytes.
 */
export function buildEpcQrPayload(args: {
  amountCents: number;
  reference: string;
}): string {
  const amount = `EUR${formatAmountEuros(args.amountCents)}`;
  const remittance = `Mededeling: ${args.reference}`;

  const lines = [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    SPORTAC_BENEFICIARY,
    SPORTAC_IBAN,
    amount,
    "",
    "",
    remittance,
  ];
  return lines.join("\n");
}
