import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const amountEuros = parseFloat(formData.get("amount_euros") as string);
  const message = formData.get("message") as string | null;

  if (!name || !email || isNaN(amountEuros) || amountEuros <= 0 || amountEuros > 10000) {
    return NextResponse.redirect(new URL("/steunen?error=invalid#doneer", req.url));
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("donations").insert({
    name,
    email,
    amount_cents: Math.round(amountEuros * 100),
    message: message || null,
  });

  if (error) {
    console.error("Donation error:", error);
    return NextResponse.redirect(new URL("/steunen?error=server#doneer", req.url));
  }

  return NextResponse.redirect(new URL("/steunen?bedankt=1#doneer", req.url));
}
