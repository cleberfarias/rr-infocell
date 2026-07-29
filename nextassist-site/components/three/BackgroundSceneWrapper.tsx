"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const BackgroundScene = dynamic(() => import("./BackgroundScene"), { ssr: false });

export default function BackgroundSceneWrapper() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (
      motionQuery.matches ||
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      return;
    }

    const schedule = window.requestIdleCallback ?? ((callback: IdleRequestCallback) =>
      window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = schedule(() => setEnabled(true));

    return () => cancel(idleId);
  }, []);

  if (!enabled) return null;

  return (
    <div className="background-scene" aria-hidden="true">
      <BackgroundScene />
    </div>
  );
}
