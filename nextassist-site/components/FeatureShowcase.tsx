"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeatureShowcase.module.css";
import {
  TOTAL_FRAMES,
  drawPhoneFrameContain,
  normalizeFrame,
  preloadPhoneFrames,
} from "@/lib/phoneFrames";

type Feature = { icon: string; title: string; group: string; desc: string };
type PhonePose = { x: number; y: number; scale: number; rotate: number };

const SMOOTHING = 0.12;
const PHONE_PATH: PhonePose[] = [
  { x: 0.18, y: 18, scale: 0.96, rotate: 5 },
  { x: 0.2, y: 0, scale: 1.02, rotate: 3 },
  { x: 0.18, y: -12, scale: 1, rotate: -2 },
  { x: -0.19, y: 4, scale: 1.04, rotate: -5 },
  { x: -0.2, y: -10, scale: 0.98, rotate: 3 },
  { x: 0.18, y: 2, scale: 1.06, rotate: 5 },
  { x: 0.13, y: -8, scale: 1, rotate: -3 },
  { x: 0, y: -24, scale: 0.84, rotate: 0 },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function interpolatePose(progress: number) {
  const position = clamp(progress) * (PHONE_PATH.length - 1);
  const fromIndex = Math.floor(position);
  const toIndex = Math.min(fromIndex + 1, PHONE_PATH.length - 1);
  const amount = position - fromIndex;
  const from = PHONE_PATH[fromIndex];
  const to = PHONE_PATH[toIndex];
  const lerp = (a: number, b: number) => a + (b - a) * amount;

  return {
    x: lerp(from.x, to.x),
    y: lerp(from.y, to.y),
    scale: lerp(from.scale, to.scale),
    rotate: lerp(from.rotate, to.rotate),
  };
}

export default function FeatureShowcase({ features }: { features: Feature[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const momentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const images = useRef<HTMLImageElement[]>([]);
  const targetFrame = useRef(0);
  const currentFrame = useRef(0);
  const lastDrawnIndex = useRef(-1);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const phone = phoneRef.current;
    if (!canvas || !phone) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = phone.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      lastDrawnIndex.current = -1;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(phone);
    images.current = preloadPhoneFrames();

    let cancelled = false;
    let animationFrame = 0;
    const draw = () => {
      if (cancelled) return;
      currentFrame.current = normalizeFrame(
        currentFrame.current + (targetFrame.current - currentFrame.current) * SMOOTHING,
      );
      const index = Math.round(currentFrame.current) % TOTAL_FRAMES;
      const image = images.current[index];
      if (index !== lastDrawnIndex.current && image?.complete && image.naturalWidth > 0) {
        drawPhoneFrameContain(context, image, canvas.width, canvas.height);
        lastDrawnIndex.current = index;
      }
      animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const phone = phoneRef.current;
    if (!section || !phone) return;

    let animationFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncWithScroll = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
        const progress = clamp(-rect.top / distance);
        const mobile = window.innerWidth <= 900;
        const pose = interpolatePose(progress);
        const x = reducedMotion.matches || mobile ? 0 : pose.x * Math.min(window.innerWidth, 1400);
        const y = reducedMotion.matches ? 0 : mobile ? -window.innerHeight * 0.05 : pose.y;
        const scale = reducedMotion.matches ? 1 : mobile ? 0.82 : pose.scale;
        const rotate = reducedMotion.matches || mobile ? 0 : pose.rotate;

        phone.style.transform = `translate3d(${x}px, ${y}px, 0) rotateY(${rotate}deg) scale(${scale})`;
        phone.style.setProperty("--phone-progress", progress.toFixed(4));
        targetFrame.current = progress * (TOTAL_FRAMES - 1);

        const targetY = window.innerHeight * (mobile ? 0.78 : 0.5);
        const nearestIndex = momentRefs.current.reduce(
          (nearest, moment, index) => {
            if (!moment) return nearest;
            const momentRect = moment.getBoundingClientRect();
            const delta = Math.abs(momentRect.top + momentRect.height / 2 - targetY);
            return delta < nearest.delta ? { index, delta } : nearest;
          },
          { index: 0, delta: Number.POSITIVE_INFINITY },
        ).index;

        if (nearestIndex !== activeIndexRef.current) {
          activeIndexRef.current = nearestIndex;
          setActiveIndex(nearestIndex);
        }
      });
    };

    syncWithScroll();
    window.addEventListener("scroll", syncWithScroll, { passive: true });
    window.addEventListener("resize", syncWithScroll);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", syncWithScroll);
      window.removeEventListener("resize", syncWithScroll);
    };
  }, []);

  return (
    <div ref={sectionRef} className="cinematic-showcase">
      <div className="cinematic-stage" aria-hidden="true">
        <div className="cinematic-glow" />
        <div ref={phoneRef} className="cinematic-phone">
          <canvas ref={canvasRef} className={styles.canvas} />
          <div className={styles.label}>
            <span>{features[activeIndex]?.group}</span>
            {features[activeIndex]?.title}
          </div>
        </div>
        <div className="cinematic-progress">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <div><i style={{ transform: `scaleY(${(activeIndex + 1) / features.length})` }} /></div>
          <span>{String(features.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="cinematic-moments">
        {features.map((feature, index) => {
          const side = index === 3 || index === 4 ? "right" : "left";
          return (
            <div
              key={feature.title}
              ref={(node) => { momentRefs.current[index] = node; }}
              data-feature-index={index}
              className={`cinematic-moment moment-${side}${activeIndex === index ? " active" : ""}`}
            >
              <article className="cinematic-copy">
                <div className="cinematic-kicker">
                  <span>{feature.icon}</span>
                  {feature.group}
                </div>
                <div className="cinematic-number">{String(index + 1).padStart(2, "0")}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <div className="cinematic-line" />
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
