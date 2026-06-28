// Generates an offline .pptx of the eetfestijn slideshow from live Supabase data.
//
//   node scripts/generate-slideshow-pptx.mjs [output.pptx]
//
// Mirrors the web /slideshow deck slide-for-slide. Remote logos and photos are
// fetched and embedded so the file works without internet. If an image fetch
// fails, the slide falls back to the sponsor/skipper name so the deck never
// breaks on one bad URL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// --- env (read .env.local manually; no dotenv dependency) ---
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const NAVY = "1C2B4A";
const RED = "E9483B";
const WHITE = "FFFFFF";
const MUTED = "8FA0BC";

const LEVEL_LABEL = { gold: "Goud", silver: "Zilver", bronze: "Brons", partner: "Partner" };

const HEAD = { fontFace: "Barlow Condensed", bold: true, italic: true };
const BODY = { fontFace: "Barlow" };

// Downscale to keep the .pptx small. Logos: cap at 800px, preserve alpha (png).
// Photos: cap at 1920px, flatten to jpeg — plenty for a projector.
async function downscale(buf, kind) {
  const max = kind === "logo" ? 800 : 1920;
  let img = sharp(buf, { failOn: "none" }).resize({
    width: max, height: max, fit: "inside", withoutEnlargement: true,
  });
  if (kind === "logo") {
    const out = await img.png({ compressionLevel: 9 }).toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  }
  const out = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

async function fetchImage(url, kind = "logo") {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await downscale(Buffer.from(await res.arrayBuffer()), kind);
  } catch (e) {
    console.warn(`  ! image failed (${url.slice(0, 60)}…): ${e.message}`);
    return null;
  }
}

// Gallery photos may be remote Supabase URLs or site-relative public paths.
async function galleryImage(url) {
  if (url.startsWith("http")) return fetchImage(url, "photo");
  try {
    return await downscale(fs.readFileSync(path.join(root, "public", url)), "photo");
  } catch (e) {
    console.warn(`  ! local photo failed (${url}): ${e.message}`);
    return null;
  }
}

async function main() {
  const outPath = path.resolve(process.argv[2] || path.join(root, "eetfestijn-slideshow.pptx"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  console.log("Fetching data…");
  const [{ data: sponsorData }, { data: teamData }, { data: galleryData }] =
    await Promise.all([
      supabase.from("sponsors").select("*").order("sort_order"),
      supabase.from("team_members").select("*").order("sort_order"),
      supabase
        .from("gallery_photos")
        .select("*")
        .eq("is_published", true)
        .order("sort_order"),
    ]);

  const byOrder = (a, b) => a.sort_order - b.sort_order;
  const gold = (sponsorData || []).filter((s) => s.level === "gold").sort(byOrder);
  const silver = (sponsorData || []).filter((s) => s.level === "silver").sort(byOrder);
  const skippers = (teamData || []).filter((m) => m.role === "Skipper").sort(byOrder);
  const gallery = galleryData || [];
  const ekDate = process.env.EK_DATE || "2026-08-10T00:00:00+02:00";

  console.log(`  ${gold.length} gold, ${silver.length} silver sponsors, ${skippers.length} skippers, ${gallery.length} gallery photos`);
  console.log("Embedding images…");

  // Pre-fetch every remote image once.
  const logoCache = new Map();
  for (const s of [...gold, ...silver]) {
    if (s.logo_url) logoCache.set(s.id, await fetchImage(s.logo_url));
  }
  const skipperImg = new Map();
  for (const m of skippers) {
    if (m.image_url) skipperImg.set(m.id, await fetchImage(m.image_url, "photo"));
  }

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "W", width: 13.33, height: 7.5 });
  pptx.layout = "W";
  const W = 13.33, H = 7.5;

  const bg = (slide) => (slide.background = { color: NAVY });
  const eyebrow = (slide, text, x = 0.6, y = 0.5) =>
    slide.addText(text.toUpperCase(), {
      x, y, w: 6, h: 0.4, ...BODY, bold: true, color: RED,
      fontSize: 14, charSpacing: 3, align: "left",
    });

  // 1) Title
  {
    const s = pptx.addSlide(); bg(s);
    const d = new Date(ekDate).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
    s.addText(
      [
        { text: "Sportac ", options: { color: WHITE } },
        { text: "86", options: { color: RED } },
      ],
      { x: 0, y: 2.3, w: W, h: 1.8, ...HEAD, fontSize: 96, align: "center" },
    );
    s.addText("op weg naar het EK Ropeskipping", {
      x: 0, y: 4.0, w: W, h: 0.8, ...HEAD, bold: true, color: "CCD4E0", fontSize: 32, align: "center",
    });
    s.addText(`NOORWEGEN · ${d}`, {
      x: 0, y: 5.0, w: W, h: 0.5, ...BODY, color: MUTED, fontSize: 16, charSpacing: 4, align: "center",
    });
    s.addText("EETFESTIJN 2026", {
      x: 0, y: 1.6, w: W, h: 0.4, ...BODY, bold: true, color: RED, fontSize: 14, charSpacing: 4, align: "center",
    });
  }

  // 2) Sponsor wall
  {
    const s = pptx.addSlide(); bg(s);
    eyebrow(s, "Onze sponsors");
    s.addText("Bedankt aan al onze sponsors!", { x: 0.6, y: 0.95, w: 9, h: 0.5, ...BODY, color: MUTED, fontSize: 16 });

    const drawRow = (label, list, y, cols, cardH) => {
      s.addText(label.toUpperCase(), { x: 0.6, y: y - 0.45, w: 4, h: 0.35, ...BODY, bold: true, color: label === "Goud" ? RED : MUTED, fontSize: 12, charSpacing: 3 });
      const gap = 0.25, marginX = 0.6;
      const cardW = (W - marginX * 2 - gap * (cols - 1)) / cols;
      list.forEach((sp, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = marginX + col * (cardW + gap);
        const yy = y + row * (cardH + gap);
        s.addShape(pptx.ShapeType.roundRect, { x, y: yy, w: cardW, h: cardH, fill: { color: WHITE }, rectRadius: 0.08, line: { type: "none" } });
        const logo = logoCache.get(sp.id);
        if (logo) s.addImage({ data: logo, x: x + 0.15, y: yy + 0.12, w: cardW - 0.3, h: cardH - 0.24, sizing: { type: "contain", w: cardW - 0.3, h: cardH - 0.24 } });
        else s.addText(sp.name, { x, y: yy, w: cardW, h: cardH, ...HEAD, color: NAVY, fontSize: 14, align: "center", valign: "middle" });
      });
    };
    drawRow("Goud", gold, 2.1, 5, 1.3);
    drawRow("Zilver", silver, 5.5, 6, 1.0);
  }

  // 3) Per-sponsor slides
  for (const sp of [...gold, ...silver]) {
    const s = pptx.addSlide(); bg(s);
    s.addText(`${LEVEL_LABEL[sp.level].toUpperCase()} SPONSOR`, { x: 0, y: 0.7, w: W, h: 0.4, ...BODY, bold: true, color: RED, fontSize: 14, charSpacing: 3, align: "center" });
    const cardW = 7.5, cardH = 4.2, cx = (W - cardW) / 2, cy = 1.4;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: WHITE }, rectRadius: 0.12, line: { type: "none" } });
    const logo = logoCache.get(sp.id);
    if (logo) s.addImage({ data: logo, x: cx + 0.5, y: cy + 0.4, w: cardW - 1, h: cardH - 0.8, sizing: { type: "contain", w: cardW - 1, h: cardH - 0.8 } });
    else s.addText(sp.name, { x: cx, y: cy, w: cardW, h: cardH, ...HEAD, color: NAVY, fontSize: 40, align: "center", valign: "middle" });
    s.addText(sp.name, { x: 0, y: 5.9, w: W, h: 1, ...HEAD, color: WHITE, fontSize: 44, align: "center" });
  }

  // 4) Skipper roster
  {
    const s = pptx.addSlide(); bg(s);
    eyebrow(s, "Onze skippers");
    s.addText("De atletes die ons land vertegenwoordigen op het EK.", { x: 0.6, y: 0.95, w: 11, h: 0.5, ...BODY, color: MUTED, fontSize: 16 });
    const n = skippers.length;
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const photo = 1.7, gap = 0.4;
    const totalW = cols * photo + (cols - 1) * gap;
    const startX = (W - totalW) / 2;
    skippers.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (photo + gap);
      const y = 1.9 + row * 2.6;
      const img = skipperImg.get(m.id);
      if (img) {
        s.addImage({ data: img, x, y, w: photo, h: photo, rounding: true, sizing: { type: "cover", w: photo, h: photo } });
      } else {
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: photo, h: photo, fill: { color: "2A3B5C" }, rectRadius: 0.1, line: { type: "none" } });
      }
      s.addText(m.name, { x: x - 0.4, y: y + photo + 0.05, w: photo + 0.8, h: 0.4, ...HEAD, color: WHITE, fontSize: 20, align: "center" });
      if (m.discipline?.length)
        s.addText(m.discipline.join(" · ").toUpperCase(), { x: x - 0.4, y: y + photo + 0.45, w: photo + 0.8, h: 0.3, ...BODY, bold: true, color: RED, fontSize: 11, charSpacing: 2, align: "center" });
    });
  }

  // 5) Action photos from the homepage gallery
  for (const photo of gallery) {
    const data = await galleryImage(photo.image_url);
    if (!data) continue; // skip a photo whose image couldn't be loaded
    const s = pptx.addSlide(); bg(s);
    s.addImage({ data, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 2, w: W, h: 2, fill: { color: NAVY, transparency: 35 }, line: { type: "none" } });
    s.addText("Samen naar Noorwegen", { x: 0.6, y: H - 1.4, w: 10, h: 0.9, ...HEAD, color: WHITE, fontSize: 40 });
  }

  console.log(`Writing ${path.relative(root, outPath)}…`);
  await pptx.writeFile({ fileName: outPath });
  console.log(`Done. ${pptx.slides.length} slides.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
