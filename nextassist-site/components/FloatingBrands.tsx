import type { CSSProperties } from "react";

type Brand = {
  label: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  dur: number;
  rot: number;
  anim: "a" | "b";
  op: number;
};

const brands: Brand[] = [
  { label: "Apple",    x: 4,  y: 14, size: 15, delay: 0,   dur: 9,  rot: -8,  anim: "a", op: 0.07 },
  { label: "Sony",     x: 7,  y: 58, size: 13, delay: 2.5, dur: 12, rot: -10, anim: "a", op: 0.05 },
  { label: "Infinix",  x: 2,  y: 82, size: 11, delay: 8,   dur: 11, rot: 9,   anim: "b", op: 0.04 },
  { label: "OnePlus",  x: 28, y: 17, size: 12, delay: 1.5, dur: 14, rot: -6,  anim: "a", op: 0.04 },
  { label: "Vivo",     x: 18, y: 44, size: 14, delay: 4.5, dur: 10, rot: 5,   anim: "b", op: 0.05 },
  { label: "Xiaomi",   x: 22, y: 86, size: 14, delay: 4,   dur: 8,  rot: -5,  anim: "a", op: 0.06 },
  { label: "LG",       x: 46, y: 5,  size: 18, delay: 3,   dur: 7,  rot: -15, anim: "a", op: 0.07 },
  { label: "Realme",   x: 52, y: 47, size: 11, delay: 7,   dur: 8,  rot: 12,  anim: "b", op: 0.04 },
  { label: "Asus",     x: 42, y: 74, size: 13, delay: 0.5, dur: 13, rot: -14, anim: "a", op: 0.04 },
  { label: "Motorola", x: 63, y: 78, size: 12, delay: 1,   dur: 13, rot: 10,  anim: "b", op: 0.05 },
  { label: "Nokia",    x: 69, y: 34, size: 14, delay: 3.5, dur: 11, rot: -9,  anim: "a", op: 0.05 },
  { label: "OPPO",     x: 73, y: 91, size: 14, delay: 6,   dur: 9,  rot: 8,   anim: "b", op: 0.05 },
  { label: "Samsung",  x: 85, y: 20, size: 13, delay: 2,   dur: 11, rot: 7,   anim: "b", op: 0.05 },
  { label: "Huawei",   x: 91, y: 56, size: 12, delay: 5,   dur: 10, rot: 4,   anim: "b", op: 0.04 },
  { label: "iPhone",   x: 80, y: 72, size: 14, delay: 2.2, dur: 9,  rot: -7,  anim: "a", op: 0.05 },
  { label: "Tecno",    x: 36, y: 62, size: 11, delay: 6.5, dur: 12, rot: 6,   anim: "b", op: 0.04 },
];

export default function FloatingBrands() {
  return (
    <div className="brands-bg" aria-hidden="true">
      {brands.map((b) => (
        <span
          key={b.label}
          className={`brands-item brands-item-${b.anim}`}
          style={
            {
              left: `${b.x}%`,
              top: `${b.y}%`,
              fontSize: `${b.size}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
              opacity: b.op,
              "--rot": `${b.rot}deg`,
            } as CSSProperties
          }
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
