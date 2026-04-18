import { EventRecord, EventSlot } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSLocal(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

export type EventWithSlots = EventRecord & { slots: EventSlot[] };

export function generateICS(events: EventWithSlots[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sportac86//EK Ropeskipping//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    for (const slot of ev.slots) {
      const time = slot.time ?? "00:00";
      const start = toICSLocal(slot.date, time);
      const [hour, minute] = time.split(":").map(Number);
      const endHour = hour + 2;
      const [year, month, day] = slot.date.split("-").map(Number);
      const end = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`;

      const description = ev.description
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");

      const location = slot.location ?? ev.location;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${slot.id}@sportac86-ek`,
        `SUMMARY:${ev.title}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        `DTSTART;TZID=Europe/Brussels:${start}`,
        `DTEND;TZID=Europe/Brussels:${end}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
