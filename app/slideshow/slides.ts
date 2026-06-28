import { Sponsor, TeamMember } from "@/lib/types";

// Shared slide model used by both the web slideshow and the .pptx generator.
// Keeping the slide order in one place means the deck stays identical across
// both deliverables.

export type Slide =
  | { kind: "title"; ekDate: string }
  | { kind: "sponsor-wall"; gold: Sponsor[]; silver: Sponsor[] }
  | { kind: "sponsor"; sponsor: Sponsor }
  | { kind: "roster"; skippers: TeamMember[] }
  | { kind: "photo"; src: string; index: number; total: number };

export const LEVEL_LABEL: Record<Sponsor["level"], string> = {
  gold: "Goud",
  silver: "Zilver",
  bronze: "Brons",
  partner: "Partner",
};

// Group photos shipped in /public/groepsfotos. Web-relative paths.
export const GROUP_PHOTOS = [
  "/groepsfotos/IMG_6011.jpeg",
  "/groepsfotos/IMG_6015.jpeg",
  "/groepsfotos/IMG_6016.jpeg",
  "/groepsfotos/IMG_6017.jpeg",
];

export function buildSlides(
  sponsors: Sponsor[],
  team: TeamMember[],
  ekDate: string,
): Slide[] {
  // Gold first, then silver — each ordered by sort_order.
  const byOrder = (a: Sponsor, b: Sponsor) => a.sort_order - b.sort_order;
  const gold = sponsors.filter((s) => s.level === "gold").sort(byOrder);
  const silver = sponsors.filter((s) => s.level === "silver").sort(byOrder);

  // Roster = skippers only (coaches excluded by design).
  const skippers = team
    .filter((m) => m.role === "Skipper")
    .sort((a, b) => a.sort_order - b.sort_order);

  const slides: Slide[] = [];
  slides.push({ kind: "title", ekDate });
  slides.push({ kind: "sponsor-wall", gold, silver });
  for (const sponsor of [...gold, ...silver]) {
    slides.push({ kind: "sponsor", sponsor });
  }
  slides.push({ kind: "roster", skippers });
  GROUP_PHOTOS.forEach((src, i) =>
    slides.push({ kind: "photo", src, index: i + 1, total: GROUP_PHOTOS.length }),
  );

  return slides;
}
