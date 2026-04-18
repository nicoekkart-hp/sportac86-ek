import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateICS, EventWithSlots } from "@/lib/ics";
import { EventSlot } from "@/lib/types";

export async function GET() {
  const supabase = createServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true);
  const { data: slots } = await supabase.from("event_slots").select("*");

  const slotsByEvent = new Map<string, EventSlot[]>();
  for (const s of (slots ?? []) as EventSlot[]) {
    const list = slotsByEvent.get(s.event_id) ?? [];
    list.push(s);
    slotsByEvent.set(s.event_id, list);
  }

  const withSlots: EventWithSlots[] = (events ?? []).map((e) => ({
    ...(e as EventWithSlots),
    slots: slotsByEvent.get(e.id) ?? [],
  }));

  return new NextResponse(generateICS(withSlots), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sportac86-ek.ics"',
    },
  });
}
