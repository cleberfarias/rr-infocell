"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

// Generated once at module load (not during render) so the particle
// network stays stable across re-renders without an impure useMemo call.
function buildParticleNetworkGeometry() {
  const count = 110;
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    pts.push(
      (Math.random() - 0.5) * 44,
      (Math.random() - 0.5) * 28,
      (Math.random() - 0.5) * 22,
    );
  }

  const lines: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = pts[i * 3] - pts[j * 3];
      const dy = pts[i * 3 + 1] - pts[j * 3 + 1];
      const dz = pts[i * 3 + 2] - pts[j * 3 + 2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 7.5) {
        lines.push(
          pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2],
          pts[j * 3], pts[j * 3 + 1], pts[j * 3 + 2],
        );
      }
    }
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lines), 3));

  return { pointsGeo, linesGeo };
}

const PARTICLE_NETWORK_GEOMETRY = buildParticleNetworkGeometry();

function ParticleNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const { pointsGeo, linesGeo } = PARTICLE_NETWORK_GEOMETRY;

  useFrame(({ pointer }, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;
    groupRef.current.rotation.y = elapsedRef.current * 0.016;
    groupRef.current.rotation.x +=
      (pointer.y * -0.06 - groupRef.current.rotation.x) * 0.02;
  });

  return (
    <group ref={groupRef}>
      <points geometry={pointsGeo}>
        <pointsMaterial
          color="#00b4f5"
          size={0.08}
          transparent
          opacity={0.55}
          sizeAttenuation
        />
      </points>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial color="#00b4f5" transparent opacity={0.07} />
      </lineSegments>
    </group>
  );
}

function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 2.5 - camera.position.x) * 0.012;
    camera.position.y += (-pointer.y * 1.8 - camera.position.y) * 0.012;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function BackgroundScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 22], fov: 65 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Stars
        radius={110}
        depth={60}
        count={3800}
        factor={3}
        saturation={0}
        fade
        speed={0.35}
      />
      <ParticleNetwork />
      <CameraRig />
    </Canvas>
  );
}
