import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const type = formData.get("type") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) ?? "";

  if (!type || (type !== "candy" && type !== "wine") || !name || !email) {
    return NextResponse.redirect(new URL("/steunen?error=invalid", req.url));
  }

  // Collect items: fields named "items.productId"
  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.replace("items.", "");
      const qty = parseInt(value as string, 10);
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
    return NextResponse.redirect(new URL("/steunen?error=server", req.url));
  }

  return NextResponse.redirect(
    new URL(`/steunen?besteld=1#${type === "candy" ? "snoep" : "wijn"}`, req.url)
  );
}
