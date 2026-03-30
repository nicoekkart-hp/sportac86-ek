import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const nameVal = formData.get("name");
  const emailVal = formData.get("email");
  const messageVal = formData.get("message");

  if (!nameVal || typeof nameVal !== "string" || !emailVal || typeof emailVal !== "string") {
    return NextResponse.redirect(new URL("/sponsors?error=invalid&sectie=aanvragen", req.url));
  }

  const name = nameVal;
  const email = emailVal;
  const message = messageVal && typeof messageVal === "string" ? messageVal : null;

  const supabase = createServerClient();
  const { error } = await supabase.from("sponsor_requests").insert({ name, email, message });

  if (error) {
    console.error("Sponsor request error:", error);
    return NextResponse.redirect(new URL("/sponsors?error=server&sectie=aanvragen", req.url));
  }

  return NextResponse.redirect(new URL("/sponsors?aangevraagd=1&sectie=aanvragen", req.url));
}
