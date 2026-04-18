import { EventForm } from "../_EventForm";
import { createEvent } from "../actions";

export default function NieuwEventPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Nieuw evenement</h1>
      </div>
      <EventForm slots={[]} tickets={[]} action={createEvent} />
    </div>
  );
}
