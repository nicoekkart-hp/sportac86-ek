import { EventRecord } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`);
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    "00"
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
    const start = toICSDate(ev.date, ev.time);
    // Default duration: 2 hours
    const endDate = new Date(`${ev.date}T${ev.time}`);
    endDate.setHours(endDate.getHours() + 2);
    const end =
      endDate.getFullYear().toString() +
      pad(endDate.getMonth() + 1) +
      pad(endDate.getDate()) +
      "T" +
      pad(endDate.getHours()) +
      pad(endDate.getMinutes()) +
      "00";

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
