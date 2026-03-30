export function formatPrice(cents: number): string {
  if (cents === 0) return "Gratis";
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}
