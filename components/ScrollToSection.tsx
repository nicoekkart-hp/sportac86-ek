"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ScrollToSection() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sectie = searchParams.get("sectie");
    const besteld = searchParams.get("besteld"); // value is "snoep" or "wijn"
    const bedankt = searchParams.get("bedankt");
    const aangevraagd = searchParams.get("aangevraagd");

    const targetId =
      sectie ??
      besteld ??
      (bedankt ? "doneer" : null) ??
      (aangevraagd ? "aanvragen" : null);

    if (targetId) {
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParams]);

  return null;
}
