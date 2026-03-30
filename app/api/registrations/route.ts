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
    return NextResponse.redirect(new URL("/agenda?error=invalid", req.url));
  }

  const supabase = createServerClient();

  // Fetch slug for redirect targets
  const { data: eventData } = await supabase
    .from("events")
    .select("slug")
    .eq("id", event_id)
    .single();

  const eventPath = eventData?.slug ? `/agenda/${eventData.slug}` : "/agenda";

  const { error } = await supabase.from("registrations").insert({
    event_id,
    name,
    email,
    num_persons,
    remarks: remarks || null,
  });

  if (error) {
    console.error("Registration error:", error);
    return NextResponse.redirect(new URL(`${eventPath}?error=server`, req.url));
  }

  return NextResponse.redirect(
    new URL(`${eventPath}?ingeschreven=1`, req.url)
  );
}
