export type AgeBucket = "fresh" | "warm" | "stale" | "settled";

export function ageBucket(createdAt: string, paymentStatus: string): AgeBucket {
  if (paymentStatus === "paid") return "settled";
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (days < 3) return "fresh";
  if (days < 7) return "warm";
  return "stale";
}

export function ageLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "net nu";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mnd`;
}

export function ageColor(bucket: AgeBucket): string {
  switch (bucket) {
    case "fresh":
      return "text-green-700";
    case "warm":
      return "text-yellow-700";
    case "stale":
      return "text-red-700";
    case "settled":
      return "text-gray-sub";
  }
}
