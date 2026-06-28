import { Sponsor, TeamMember, GalleryPhoto } from "@/lib/types";

// Shared slide model used by both the web slideshow and the .pptx generator.
// Keeping the slide order in one place means the deck stays identical across
// both deliverables.

export type Slide =
  | { kind: "title"; ekDate: string }
  | { kind: "sponsor-wall"; gold: Sponsor[]; silver: Sponsor[] }
  | { kind: "sponsor"; sponsor: Sponsor }
  | { kind: "roster"; skippers: TeamMember[] }
  | { kind: "photo"; src: string; index: number; total: number };

// Noun form — used as a standalone tier label (wall headers, badges).
export const LEVEL_LABEL: Record<Sponsor["level"], string> = {
  gold: "Goud",
  silver: "Zilver",
  bronze: "Brons",
  partner: "Partner",
};

// Adjective form — used before "sponsor" (e.g. "Gouden sponsor").
export const LEVEL_ADJECTIVE: Record<Sponsor["level"], string> = {
  gold: "Gouden",
  silver: "Zilveren",
  bronze: "Bronzen",
  partner: "Partner",
};

export function buildSlides(
  sponsors: Sponsor[],
  team: TeamMember[],
  ekDate: string,
  galleryPhotos: GalleryPhoto[] = [],
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

  // Action shots come from the homepage gallery (gallery_photos), already
  // filtered to published and ordered by sort_order by the caller.
  const photos = galleryPhotos;
  photos.forEach((p, i) =>
    slides.push({ kind: "photo", src: p.image_url, index: i + 1, total: photos.length }),
  );

  return slides;
}
