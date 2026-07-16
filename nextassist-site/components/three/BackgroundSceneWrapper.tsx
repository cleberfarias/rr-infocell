"use client";

import dynamic from "next/dynamic";

const BackgroundScene = dynamic(() => import("./BackgroundScene"), { ssr: false });

export default function BackgroundSceneWrapper() {
  return <div className="background-scene" aria-hidden="true"><BackgroundScene /></div>;
}
