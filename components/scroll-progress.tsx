"use client";

import { useEffect, useRef } from "react";

// Thin gradient bar under the nav whose width tracks scroll progress —
// ported from the design bundle (#att-progress). Writes width imperatively
// on scroll to avoid re-rendering the tree every frame.
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const update = () => {
      const d = document.documentElement;
      const total = d.scrollHeight - d.clientHeight;
      bar.style.width = (total > 0 ? (d.scrollTop / total) * 100 : 0) + "%";
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="h-0.5 w-0 bg-gradient-to-r from-rust-600 to-rust-400 transition-[width] duration-100 ease-linear"
    />
  );
}
