import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  if (!name || !email) {
    return NextResponse.redirect(new URL("/sponsors?error=invalid&sectie=aanvragen", req.url));
  }

  // TODO Phase 3: send email notification to admin via Resend
  console.log("Sponsor request:", { name, email, message });

  return NextResponse.redirect(new URL("/sponsors?aangevraagd=1&sectie=aanvragen", req.url));
}
