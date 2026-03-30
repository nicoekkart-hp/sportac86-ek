import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = formData.get("event_id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const num_persons = parseInt(formData.get("num_persons") as string, 10);
  const remarks = formData.get("remarks") as string | null;

  if (!event_id || !name || !email || isNaN(num_persons)) {
    return NextResponse.redirect(new URL("/?error=invalid", req.url));
  }

  const supabase = createServerClient();

  const { error } = await supabase.from("registrations").insert({
    event_id,
    name,
    email,
    num_persons,
    remarks: remarks || null,
  });

  if (error) {
    console.error("Registration error:", error);
    return NextResponse.redirect(new URL("/?error=server", req.url));
  }

  const { data: eventData } = await supabase
    .from("events")
    .select("slug")
    .eq("id", event_id)
    .single();

  return NextResponse.redirect(
    new URL(`/agenda/${eventData?.slug ?? ""}?ingeschreven=1`, req.url)
  );
}
