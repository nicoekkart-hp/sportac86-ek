import { EventRecord } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSLocal(dateStr: string, timeStr: string): string {
  // Parse date and time components directly — no timezone conversion
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return (
    year.toString() +
    pad(month) +
    pad(day) +
    "T" +
    pad(hour) +
    pad(minute) +
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
    const start = toICSLocal(ev.date, ev.time);
    // Add 2 hours for end time
    const [hour, minute] = ev.time.split(":").map(Number);
    const endHour = hour + 2;
    const [year, month, day] = ev.date.split("-").map(Number);
    const end =
      year.toString() +
      pad(month) +
      pad(day) +
      "T" +
      pad(endHour) +
      pad(minute) +
      "00";

    const description = ev.description
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@sportac86-ek`,
      `SUMMARY:${ev.title}`,
      `LOCATION:${ev.location}`,
      `DESCRIPTION:${description}`,
      `DTSTART;TZID=Europe/Brussels:${start}`,
      `DTEND;TZID=Europe/Brussels:${end}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
