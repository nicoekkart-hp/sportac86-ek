import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const nameVal = formData.get("name");
  const emailVal = formData.get("email");
  const amountVal = formData.get("amount_euros");
  const messageVal = formData.get("message");

  if (!nameVal || typeof nameVal !== "string" || !emailVal || typeof emailVal !== "string") {
    return NextResponse.redirect(new URL("/steunen?error=invalid&sectie=doneer", req.url));
  }

  const amountEuros = parseInt(typeof amountVal === "string" ? amountVal : "", 10);
  if (isNaN(amountEuros) || amountEuros <= 0 || amountEuros > 10000) {
    return NextResponse.redirect(new URL("/steunen?error=invalid&sectie=doneer", req.url));
  }

  const name = nameVal;
  const email = emailVal;
  const message = messageVal && typeof messageVal === "string" ? messageVal : null;

  const supabase = createServerClient();
  const { error } = await supabase.from("donations").insert({
    name,
    email,
    amount_cents: amountEuros * 100,
    message,
  });

  if (error) {
    console.error("Donation error:", error);
    return NextResponse.redirect(new URL("/steunen?error=server&sectie=doneer", req.url));
  }

  return NextResponse.redirect(new URL("/steunen?bedankt=1&sectie=doneer", req.url));
}
