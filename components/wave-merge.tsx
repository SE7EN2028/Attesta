"use client";

import { useEffect, useRef } from "react";

/* Attesta wave-merge canvas — diarized speaker waveforms converging into
   structured transcript lines. Ported from the design bundle's wavemerge.js.
   mode="merge" is the hero motif; mode="voice" is the assistant voice bar,
   which reacts to `active`. */

const SPEAKERS = ["#D9705F", "#8FB39A", "#C9A25E", "#88A0BC"];
const TXT = "#E7E3D8";

function noise(x: number, t: number) {
  return (
    Math.sin(x * 1.7 + t) * 0.55 +
    Math.sin(x * 3.1 - t * 1.4) * 0.3 +
    Math.sin(x * 7.3 + t * 0.7) * 0.15
  );
}
// deterministic pseudo-random for stable "word" widths
function prand(i: number) {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function WaveMerge({
  mode = "merge",
  active = false,
  className,
}: {
  mode?: "merge" | "voice";
  active?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const cv = document.createElement("canvas");
    cv.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amps: number[] = [];
    let w = 10,
      h = 10;
    let visible = true;
    let raf = 0;

    const size = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = Math.max(10, r.width);
      h = Math.max(10, r.height);
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(2.5);
    };

    const drawVoice = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const n = Math.floor(w / 7);
      const act = activeRef.current;
      for (let i = 0; i < n; i++) {
        const x = i * 7 + 3;
        const targ = act
          ? Math.abs(noise(i * 0.6, t * 3.4)) * 0.85 + 0.08
          : 0.06 + Math.abs(Math.sin(i * 0.4 + t * 0.8)) * 0.05;
        if (!amps[i]) amps[i] = 0.06;
        amps[i] += (targ - amps[i]) * (reduced ? 1 : 0.18);
        const a = amps[i] * h * 0.46;
        ctx.fillStyle = act ? "#D9705F" : "#8E97A3";
        ctx.globalAlpha = act ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.roundRect(x, h / 2 - a, 3.4, a * 2 + 1, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number) => {
      if (mode === "voice") return drawVoice(t);
      const c = ctx;
      c.clearRect(0, 0, w, h);
      const waveEnd = w * 0.4,
        mergeEnd = w * 0.58;
      // 1. diarized speaker waveforms (left)
      for (let s = 0; s < 4; s++) {
        const y = h * (0.14 + 0.24 * s);
        const col = SPEAKERS[s];
        c.fillStyle = col;
        c.globalAlpha = 0.9;
        c.font = '600 9px "IBM Plex Mono",monospace';
        c.fillText("S" + (s + 1), 2, y - h * 0.075);
        for (let x = 10; x < waveEnd; x += 4) {
          const gate = Math.max(0, Math.sin(x * 0.021 + s * 2.1 + t * 0.5));
          const on = gate > 0.28 ? 1 : 0.06;
          const a =
            Math.abs(noise(x * 0.045 + s * 9, t * 2.2 + s)) * h * 0.085 * on +
            0.8;
          c.globalAlpha = on === 1 ? 0.85 : 0.3;
          c.fillRect(x, y - a, 2.2, a * 2);
        }
      }
      // 2. convergence strands
      c.globalAlpha = 0.5;
      c.lineWidth = 1.1;
      const lines = 5;
      for (let s = 0; s < 4; s++) {
        const y0 = h * (0.14 + 0.24 * s);
        const li = [0, 1, 2, 3][s] + (s === 3 ? 1 : 0);
        const y1 = h * (0.16 + (li / (lines - 0.4)) * 0.68);
        c.strokeStyle = SPEAKERS[s];
        c.setLineDash([5, 4]);
        c.lineDashOffset = -t * 22;
        c.beginPath();
        c.moveTo(waveEnd + 2, y0);
        c.bezierCurveTo(
          waveEnd + (mergeEnd - waveEnd) * 0.5,
          y0,
          waveEnd + (mergeEnd - waveEnd) * 0.5,
          y1,
          mergeEnd,
          y1
        );
        c.stroke();
      }
      c.setLineDash([]);
      // 3. structured transcript lines (right)
      const x0 = mergeEnd + 6;
      c.textBaseline = "middle";
      for (let l = 0; l < lines; l++) {
        const y = h * (0.16 + (l / (lines - 0.4)) * 0.68);
        const sp = l % 4;
        const cycle = reduced
          ? 1
          : Math.min(1, Math.max(0, ((t * 0.35) % 1.6) * 2.2 - l * 0.28));
        c.globalAlpha = 0.95;
        c.fillStyle = SPEAKERS[sp];
        c.fillRect(x0, y - 4, 2.5, 8);
        c.font = '8px "IBM Plex Mono",monospace';
        c.globalAlpha = 0.55;
        c.fillText("00:" + String(12 + l * 7).padStart(2, "0"), x0 + 8, y);
        let wx = x0 + 42;
        const maxX = w - 8;
        let i = 0;
        while (wx < maxX) {
          const ww = 8 + prand(l * 13 + i) * 26;
          if (wx + ww > maxX) break;
          const frac = (wx - x0 - 42) / (maxX - x0 - 42);
          if (frac > cycle) break;
          c.globalAlpha = 0.85;
          c.fillStyle = TXT;
          c.beginPath();
          c.roundRect(wx, y - 2.6, ww, 5.2, 2.6);
          c.fill();
          wx += ww + 5;
          i++;
        }
      }
      c.globalAlpha = 1;
    };

    const ro = new ResizeObserver(() => size());
    ro.observe(host);
    const io = new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
    });
    io.observe(host);
    size();

    if (reduced) {
      draw(2.5);
    } else {
      const loop = (ts: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible) return;
        draw(ts / 1000);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.remove();
    };
  }, [mode]);

  return <div ref={hostRef} className={className} style={{ overflow: "hidden" }} />;
}
