import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = (formData.get("event_id") as string)?.trim();
  const slot_id = (formData.get("slot_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const num_persons = parseInt(formData.get("num_persons") as string, 10);
  const remarks = (formData.get("remarks") as string) || null;

  if (!event_id || !slot_id || !name || !email || isNaN(num_persons) || num_persons < 1 || num_persons > 20) {
    return NextResponse.redirect(new URL("/agenda?error=invalid", req.url), 303);
  }

  const supabase = createServerClient();

  const { data: eventData } = await supabase
    .from("events")
    .select("slug")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();

  if (!eventData) {
    return NextResponse.redirect(new URL("/agenda?error=invalid", req.url), 303);
  }
  const eventPath = `/agenda/${eventData.slug}`;

  const { data: slot } = await supabase
    .from("event_slots")
    .select("id, event_id, max_attendees")
    .eq("id", slot_id)
    .single();

  if (!slot || slot.event_id !== event_id) {
    return NextResponse.redirect(new URL(`${eventPath}?error=invalid#inschrijven`, req.url), 303);
  }

  if (slot.max_attendees !== null) {
    const { data: regData } = await supabase
      .from("registrations")
      .select("num_persons")
      .eq("slot_id", slot.id);
    const taken = (regData ?? []).reduce((sum, r) => sum + (r.num_persons ?? 1), 0);
    if (taken + num_persons > slot.max_attendees) {
      return NextResponse.redirect(new URL(`${eventPath}?error=volzet#inschrijven`, req.url), 303);
    }
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("registrations").insert({
    event_id,
    slot_id: slot.id,
    name,
    email,
    num_persons,
    remarks,
    tickets: null,
    payment_status: "paid",
  });

  if (error) {
    console.error("Registration error:", error);
    return NextResponse.redirect(new URL(`${eventPath}?error=server#inschrijven`, req.url), 303);
  }

  return NextResponse.redirect(new URL(`${eventPath}?ingeschreven=1`, req.url), 303);
}
