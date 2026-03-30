import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const CANDY_IDS = ["mars", "snickers", "twix"];
const WINE_IDS = ["rood", "wit", "rose"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const typeVal = formData.get("type");
  const nameVal = formData.get("name");
  const emailVal = formData.get("email");
  const phoneVal = formData.get("phone");

  if (
    !typeVal || typeof typeVal !== "string" ||
    (typeVal !== "candy" && typeVal !== "wine") ||
    !nameVal || typeof nameVal !== "string" ||
    !emailVal || typeof emailVal !== "string"
  ) {
    return NextResponse.redirect(new URL("/steunen?error=invalid", req.url));
  }

  const type = typeVal as "candy" | "wine";
  const name = nameVal;
  const email = emailVal;
  const phone = phoneVal && typeof phoneVal === "string" ? phoneVal : "";
  const allowedIds = type === "candy" ? CANDY_IDS : WINE_IDS;

  // Collect items: only allow known product IDs
  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.slice("items.".length);
      if (!allowedIds.includes(productId)) continue;
      const qty = parseInt(typeof value === "string" ? value : "", 10);
      if (!isNaN(qty) && qty > 0) items[productId] = qty;
    }
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("orders").insert({
    type,
    name,
    email,
    phone,
    items,
    status: "new",
  });

  if (error) {
    console.error("Order error:", error);
    return NextResponse.redirect(new URL(`/steunen?error=server&sectie=${type === "candy" ? "snoep" : "wijn"}`, req.url));
  }

  return NextResponse.redirect(
    new URL(`/steunen?besteld=${type === "candy" ? "snoep" : "wijn"}`, req.url)
  );
}
