"use client";

import dynamic from "next/dynamic";

const BackgroundScene = dynamic(() => import("./BackgroundScene"), { ssr: false });

export default function BackgroundSceneWrapper() {
  return <BackgroundScene />;
}
