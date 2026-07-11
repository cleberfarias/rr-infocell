"use client";

import { useEffect, useRef, useState } from "react";
import ScrollReveal from "./ScrollReveal";
import styles from "./FeatureShowcase.module.css";
import { TOTAL_FRAMES, normalizeFrame, preloadPhoneFrames, drawPhoneFrameContain } from "@/lib/phoneFrames";

type Feature = { icon: string; title: string; desc: string };

const SMOOTHING = 0.14;

function targetFrameForIndex(index: number, total: number) {
  return Math.round((index / Math.max(total - 1, 1)) * (TOTAL_FRAMES - 1));
}

export default function FeatureShowcase({ features }: { features: Feature[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<HTMLImageElement[]>([]);
  const currentFrame = useRef(0);
  const lastDrawnIndex = useRef(-1);
  const lastActiveIndex = useRef(-1);
  const hoveredIndexRef = useRef<number | null>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeLabel, setActiveLabel] = useState(features[0]?.title ?? "");

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const visual = visualRef.current;
    if (!canvas || !section || !visual) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = visual.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      lastDrawnIndex.current = -1;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(visual);

    images.current = preloadPhoneFrames();

    let cancelled = false;
    let raf: number;

    const draw = () => {
      if (cancelled) return;

      const rect = section.getBoundingClientRect();
      const scrollableDistance = section.offsetHeight - window.innerHeight;
      const travelled = Math.min(Math.max(-rect.top, 0), Math.max(scrollableDistance, 1));
      const progress = scrollableDistance > 0 ? travelled / scrollableDistance : 0;
      const scrollFrame = progress * (TOTAL_FRAMES - 1);

      const target =
        hoveredIndexRef.current !== null
          ? targetFrameForIndex(hoveredIndexRef.current, features.length)
          : scrollFrame;

      currentFrame.current = normalizeFrame(currentFrame.current + (target - currentFrame.current) * SMOOTHING);

      const index = Math.round(currentFrame.current) % TOTAL_FRAMES;
      if (index !== lastDrawnIndex.current && canvas.width > 0) {
        const img = images.current[index];
        if (img.complete && img.naturalWidth > 0) {
          drawPhoneFrameContain(ctx, img, canvas.width, canvas.height);
          lastDrawnIndex.current = index;
        }
      }

      if (hoveredIndexRef.current === null) {
        const nearest = Math.round(progress * (features.length - 1));
        if (nearest !== lastActiveIndex.current) {
          lastActiveIndex.current = nearest;
          setActiveLabel(features[nearest]?.title ?? "");
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [features]);

  function handleEnter(index: number) {
    hoveredIndexRef.current = index;
    setHoveredIndex(index);
    setActiveLabel(features[index].title);
  }

  function handleLeave() {
    hoveredIndexRef.current = null;
    lastActiveIndex.current = -1;
    setHoveredIndex(null);
  }

  return (
    <div ref={sectionRef} className="features-showcase">
      <div ref={visualRef} className="features-showcase-visual">
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.label}>{activeLabel}</div>
      </div>

      <div className="features-showcase-list">
        {features.map((f, i) => (
          <ScrollReveal key={f.title}>
            <div
              className={`feature-card${hoveredIndex === i ? " active" : ""}`}
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={handleLeave}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
