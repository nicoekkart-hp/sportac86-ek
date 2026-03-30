import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = formData.get("event_id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const num_persons = parseInt(formData.get("num_persons") as string, 10);
  const remarks = formData.get("remarks") as string | null;

  if (!event_id || !name || !email || isNaN(num_persons) || num_persons < 1 || num_persons > 10) {
    return NextResponse.redirect(new URL("/agenda?error=invalid", req.url));
  }

  const supabase = createServerClient();

  // Validate event exists and is published
  const { data: eventData } = await supabase
    .from("events")
    .select("slug, max_attendees")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();

  if (!eventData) {
    return NextResponse.redirect(new URL("/agenda?error=invalid", req.url));
  }

  const eventPath = `/agenda/${eventData.slug}`;

  // Check capacity if event has a limit
  if (eventData.max_attendees !== null) {
    const { data: regData } = await supabase
      .from("registrations")
      .select("num_persons")
      .eq("event_id", event_id);

    const totalRegistered = (regData ?? []).reduce((sum, r) => sum + (r.num_persons ?? 1), 0);
    const spotsLeft = Math.max(0, eventData.max_attendees - totalRegistered);

    if (num_persons > spotsLeft) {
      return NextResponse.redirect(new URL(`${eventPath}?error=volzet`, req.url));
    }
  }

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
