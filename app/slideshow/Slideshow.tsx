"use client";

import { useCallback, useEffect, useState } from "react";
import { Slide } from "./slides";
import { SlideView } from "./SlideView";

// Per-slide dwell time (ms). Photos and the title get a touch longer.
function dwell(slide: Slide): number {
  if (slide.kind === "photo" || slide.kind === "title") return 10000;
  if (slide.kind === "sponsor-wall" || slide.kind === "roster") return 12000;
  return 8000;
}

export function Slideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setIndex((i) => (i + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slides.length) % slides.length),
    [slides.length],
  );

  // Auto-advance loop. Re-arms whenever the index changes so each slide gets
  // its own dwell time.
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setTimeout(next, dwell(slides[index]));
    return () => clearTimeout(id);
  }, [index, paused, next, slides]);

  // Optional manual override — handy if someone wants to drive it from a
  // clicker even though it auto-loops by default.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div className="fixed inset-0 bg-blue-night overflow-hidden font-sans select-none">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            pointerEvents: i === index ? "auto" : "none",
          }}
          aria-hidden={i !== index}
        >
          <SlideView slide={slide} active={i === index} />
        </div>
      ))}

      {/* Progress dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 20 : 6,
              backgroundColor:
                i === index ? "#E9483B" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      {paused && (
        <div className="absolute top-5 right-6 z-10 text-white/60 text-xs tracking-widest uppercase">
          Gepauzeerd
        </div>
      )}
    </div>
  );
}
