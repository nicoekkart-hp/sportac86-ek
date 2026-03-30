import { EventRecord } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDateUTC(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

export function generateICS(events: EventRecord[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sportac86//EK Ropeskipping//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const start = toICSDateUTC(ev.date, ev.time);
    // Default duration: 2 hours
    const endDate = new Date(`${ev.date}T${ev.time}`);
    endDate.setHours(endDate.getHours() + 2);
    const end =
      endDate.getUTCFullYear().toString() +
      pad(endDate.getUTCMonth() + 1) +
      pad(endDate.getUTCDate()) +
      "T" +
      pad(endDate.getUTCHours()) +
      pad(endDate.getUTCMinutes()) +
      "00Z";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@sportac86-ek`,
      `SUMMARY:${ev.title}`,
      `LOCATION:${ev.location}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
