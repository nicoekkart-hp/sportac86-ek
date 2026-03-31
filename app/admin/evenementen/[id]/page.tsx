import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord } from "@/lib/types";
import { EventForm } from "../_EventForm";
import { updateEvent } from "../actions";

export default async function BewerkenEvenementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).single();

  if (!data) notFound();

  const event = data as EventRecord;
  const action = updateEvent.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenement bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{event.title}</p>
      </div>
      <EventForm event={event} action={action} />
    </div>
  );
}
