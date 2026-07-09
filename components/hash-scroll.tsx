"use client";

import { useEffect } from "react";

// Cross-page anchor links (e.g. /#audit from /create or /try) do a full load
// of the homepage, then the browser jumps to the fragment BEFORE the heavy
// content (WaveMerge canvas, FlipBook, web fonts) finishes laying out — so the
// target has shifted by the time the jump lands, and Chrome doesn't reliably
// apply scroll-padding-top to that initial load-fragment. This re-scrolls to
// the target, offset by the sticky nav, once layout has settled.
const NAV_OFFSET = 96; // matches scroll-padding-top: 6rem

export function HashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const id = decodeURIComponent(hash.slice(1));

    let cancelled = false;
    const scrollToTarget = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
      window.scrollTo({ top: y, behavior: "auto" });
    };

    // A few passes as content settles: next frame, on full load, and a couple
    // of short delays to catch font/canvas-driven shifts.
    requestAnimationFrame(() => requestAnimationFrame(scrollToTarget));
    const onLoad = () => scrollToTarget();
    if (document.readyState === "complete") setTimeout(scrollToTarget, 50);
    else window.addEventListener("load", onLoad);
    const t1 = setTimeout(scrollToTarget, 300);
    const t2 = setTimeout(scrollToTarget, 700);

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
