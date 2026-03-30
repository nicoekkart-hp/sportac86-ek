import { createServerClient } from "@/lib/supabase";
import { generateICS } from "@/lib/ics";
import { EventRecord } from "@/lib/types";

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("date");

  const ics = generateICS((data ?? []) as EventRecord[]);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sportac86-ek.ics"',
    },
  });
}
