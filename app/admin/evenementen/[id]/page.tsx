import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { EventForm } from "../_EventForm";
import { updateEvent } from "../actions";

export default async function BewerkenEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: eventData }, { data: slotsData }, { data: ticketsData }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("event_slots").select("*").eq("event_id", id).order("sort_order").order("date"),
    supabase.from("event_tickets").select("*").eq("event_id", id).order("sort_order"),
  ]);

  if (!eventData) notFound();

  const event = eventData as EventRecord;
  const slots: EventSlot[] = slotsData ?? [];
  const tickets: EventTicket[] = ticketsData ?? [];

  const action = updateEvent.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenement bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{event.title}</p>
      </div>
      <EventForm event={event} slots={slots} tickets={tickets} action={action} />
    </div>
  );
}
