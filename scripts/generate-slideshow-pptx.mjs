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
import JSZip from "jszip";
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
const LEVEL_ADJECTIVE = { gold: "Gouden", silver: "Zilveren", bronze: "Bronzen", partner: "Partner" };

const HEAD = { fontFace: "Barlow Condensed", bold: true, italic: true };
const BODY = { fontFace: "Barlow" };

// Largest box of the given aspect ratio (w/h) that fits inside maxW × maxH.
function fitBox(maxW, maxH, aspect) {
  let w = maxW, h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  return { w, h };
}

const ADVANCE_MS = 8000; // auto-advance every slide after 8s

// pptxgenjs can't emit slide-advance timing or a kiosk loop, so patch the
// written .pptx (a zip) directly: add a fade transition + timed auto-advance
// to every slide, and set the show to loop continuously.
async function addAutoLoop(filePath, advanceMs) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);

  const slideNames = Object.keys(zip.files).filter((n) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(n),
  );
  for (const name of slideNames) {
    let xml = await zip.file(name).async("string");
    if (!xml.includes("<p:transition")) {
      // The transition element must sit right after </p:cSld>.
      const transition =
        `<p:transition spd="med" advTm="${advanceMs}"><p:fade/></p:transition>`;
      xml = xml.replace("</p:cSld>", `</p:cSld>${transition}`);
      zip.file(name, xml);
    }
  }

  // Loop the slideshow (kiosk-style) and advance using the slide timings.
  let pres = await zip.file("ppt/presentation.xml").async("string");
  if (!pres.includes("<p:showPr")) {
    const showPr = `<p:showPr loop="1" showNarration="0"><p:present/><p:sldAll/></p:showPr>`;
    pres = pres.replace("</p:presentation>", `${showPr}</p:presentation>`);
    zip.file("ppt/presentation.xml", pres);
  }

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(filePath, out);
}

// Pre-shape every image to the EXACT aspect ratio of the box it will sit in,
// so addImage can place it 1:1 with no `sizing` option. Passing `sizing` to
// pptxgenjs is what makes LibreOffice/PowerPoint stretch (skew) images, so we
// avoid it entirely by baking the fit into the pixels with sharp.
//
//   kind "logo"     → contain onto a white canvas (no crop, no stretch)
//   kind "portrait" → 3:4 cover, top-anchored (heads never cut off)
//   kind "photo"    → 16:9 cover (full-bleed action shots)
async function shape(buf, kind) {
  const img = sharp(buf, { failOn: "none" }).rotate(); // honor EXIF orientation
  if (kind === "logo") {
    const out = await img
      .resize({
        width: 1000, height: 750, fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      // Flatten any remaining transparency onto white (not black) before JPEG.
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  }
  if (kind === "portrait") {
    const out = await img
      .resize({ width: 600, height: 800, fit: "cover", position: "top" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  }
  const out = await img
    .resize({ width: 1920, height: 1080, fit: "cover" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

async function fetchImage(url, kind = "logo") {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await shape(Buffer.from(await res.arrayBuffer()), kind);
  } catch (e) {
    console.warn(`  ! image failed (${url.slice(0, 60)}…): ${e.message}`);
    return null;
  }
}

// Gallery photos may be remote Supabase URLs or site-relative public paths.
async function galleryImage(url) {
  if (url.startsWith("http")) return fetchImage(url, "photo");
  try {
    return await shape(fs.readFileSync(path.join(root, "public", url)), "photo");
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
    if (m.image_url) skipperImg.set(m.id, await fetchImage(m.image_url, "portrait"));
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
        if (logo) {
          // Logo is baked to 4:3 on white; place it as the largest 4:3 box
          // that fits inside the card padding, centered. No `sizing` → no skew.
          const box = fitBox(cardW - 0.24, cardH - 0.2, 4 / 3);
          s.addImage({ data: logo, x: x + (cardW - box.w) / 2, y: yy + (cardH - box.h) / 2, w: box.w, h: box.h });
        } else s.addText(sp.name, { x, y: yy, w: cardW, h: cardH, ...HEAD, color: NAVY, fontSize: 14, align: "center", valign: "middle" });
      });
    };
    drawRow("Goud", gold, 2.1, 5, 1.3);
    drawRow("Zilver", silver, 5.5, 6, 1.0);
  }

  // 3) Per-sponsor slides
  for (const sp of [...gold, ...silver]) {
    const s = pptx.addSlide(); bg(s);
    s.addText(`${LEVEL_ADJECTIVE[sp.level].toUpperCase()} SPONSOR`, { x: 0, y: 0.7, w: W, h: 0.4, ...BODY, bold: true, color: RED, fontSize: 14, charSpacing: 3, align: "center" });
    const cardW = 7.5, cardH = 4.2, cx = (W - cardW) / 2, cy = 1.4;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: WHITE }, rectRadius: 0.12, line: { type: "none" } });
    const logo = logoCache.get(sp.id);
    if (logo) {
      const box = fitBox(cardW - 1, cardH - 0.8, 4 / 3);
      s.addImage({ data: logo, x: cx + (cardW - box.w) / 2, y: cy + (cardH - box.h) / 2, w: box.w, h: box.h });
    } else s.addText(sp.name, { x: cx, y: cy, w: cardW, h: cardH, ...HEAD, color: NAVY, fontSize: 40, align: "center", valign: "middle" });
    s.addText(sp.name, { x: 0, y: 5.9, w: W, h: 1, ...HEAD, color: WHITE, fontSize: 44, align: "center" });
  }

  // 4) Skipper roster
  {
    const s = pptx.addSlide(); bg(s);
    eyebrow(s, "Onze skippers");
    const n = skippers.length;
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const pw = 1.5, ph = 2.0, gap = 0.45; // 3:4 portrait frames
    const rowPitch = ph + 0.9;
    const totalW = cols * pw + (cols - 1) * gap;
    const startX = (W - totalW) / 2;
    skippers.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (pw + gap);
      const y = 1.8 + row * rowPitch;
      const img = skipperImg.get(m.id);
      if (img) {
        // Image is baked to 3:4 already; box is 3:4 → place 1:1, no `sizing`.
        s.addImage({ data: img, x, y, w: pw, h: ph, rounding: true });
      } else {
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: pw, h: ph, fill: { color: "2A3B5C" }, rectRadius: 0.1, line: { type: "none" } });
      }
      s.addText(m.name, { x: x - 0.4, y: y + ph + 0.05, w: pw + 0.8, h: 0.4, ...HEAD, color: WHITE, fontSize: 20, align: "center" });
      if (m.discipline?.length)
        s.addText(m.discipline.join(" · ").toUpperCase(), { x: x - 0.4, y: y + ph + 0.45, w: pw + 0.8, h: 0.3, ...BODY, bold: true, color: RED, fontSize: 11, charSpacing: 2, align: "center" });
    });
  }

  // 5) Action photos from the homepage gallery
  for (const photo of gallery) {
    const data = await galleryImage(photo.image_url);
    if (!data) continue; // skip a photo whose image couldn't be loaded
    const s = pptx.addSlide(); bg(s);
    // Image baked to 16:9; slide is 16:9 → place full-bleed, no `sizing`.
    s.addImage({ data, x: 0, y: 0, w: W, h: H });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 2, w: W, h: 2, fill: { color: NAVY, transparency: 35 }, line: { type: "none" } });
    s.addText("Samen naar Noorwegen", { x: 0.6, y: H - 1.4, w: 10, h: 0.9, ...HEAD, color: WHITE, fontSize: 40 });
  }

  console.log(`Writing ${path.relative(root, outPath)}…`);
  await pptx.writeFile({ fileName: outPath });

  console.log("Adding auto-advance timings + loop…");
  await addAutoLoop(outPath, ADVANCE_MS);

  console.log(`Done. ${pptx.slides.length} slides.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
