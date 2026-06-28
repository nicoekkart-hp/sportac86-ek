import { createServerClient } from "@/lib/supabase";
import { Sponsor, TeamMember } from "@/lib/types";
import { buildSlides } from "./slides";
import { Slideshow } from "./Slideshow";

export const metadata = {
  title: "Sportac 86 — Eetfestijn",
};

// Always render fresh so a sponsor/team edit shows up next time the laptop
// reloads the page.
export const dynamic = "force-dynamic";

export default async function SlideshowPage() {
  const supabase = createServerClient();
  const [{ data: sponsorData }, { data: teamData }] = await Promise.all([
    supabase.from("sponsors").select("*").order("sort_order"),
    supabase.from("team_members").select("*").order("sort_order"),
  ]);

  const sponsors: Sponsor[] = sponsorData ?? [];
  const team: TeamMember[] = teamData ?? [];
  const ekDate = process.env.EK_DATE ?? "2026-08-10T00:00:00+02:00";

  const slides = buildSlides(sponsors, team, ekDate);

  return <Slideshow slides={slides} />;
}
