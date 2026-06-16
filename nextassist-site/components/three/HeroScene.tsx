"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Environment, Float } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function PhoneModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y +=
      (pointer.x * 0.4 + Math.sin(t * 0.4) * 0.12 - groupRef.current.rotation.y) * 0.04;
    groupRef.current.rotation.x +=
      (-pointer.y * 0.18 - groupRef.current.rotation.x) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.95, 3.9, 0.2]} />
        <meshStandardMaterial color="#080e1a" metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Frame edge highlight */}
      <mesh>
        <boxGeometry args={[1.98, 3.93, 0.17]} />
        <meshStandardMaterial
          color="#1a2d4a"
          metalness={0.95}
          roughness={0.05}
          wireframe
        />
      </mesh>

      {/* Screen glass */}
      <mesh position={[0, 0.06, 0.104]}>
        <boxGeometry args={[1.7, 3.35, 0.01]} />
        <meshStandardMaterial
          color="#000814"
          emissive={new THREE.Color("#00b4f5")}
          emissiveIntensity={0.22}
          metalness={0.1}
          roughness={0.4}
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* Screen OS bar */}
      <mesh position={[0, 1.42, 0.112]}>
        <boxGeometry args={[1.42, 0.28, 0.001]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive={new THREE.Color("#00b4f5")}
          emissiveIntensity={0.08}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Card 1 – blue */}
      <mesh position={[-0.38, 0.72, 0.112]}>
        <boxGeometry args={[0.58, 0.46, 0.001]} />
        <meshStandardMaterial
          color="#0d1f3c"
          emissive={new THREE.Color("#00b4f5")}
          emissiveIntensity={0.18}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Card 2 – green */}
      <mesh position={[0.38, 0.72, 0.112]}>
        <boxGeometry args={[0.58, 0.46, 0.001]} />
        <meshStandardMaterial
          color="#0a2416"
          emissive={new THREE.Color("#22c55e")}
          emissiveIntensity={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Card 3 – amber */}
      <mesh position={[-0.38, 0.16, 0.112]}>
        <boxGeometry args={[0.58, 0.46, 0.001]} />
        <meshStandardMaterial
          color="#221a08"
          emissive={new THREE.Color("#f59e0b")}
          emissiveIntensity={0.13}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* List item rows */}
      {[-0.5, -0.82, -1.14].map((y, i) => (
        <mesh key={i} position={[0, y, 0.112]}>
          <boxGeometry args={[1.38, 0.19, 0.001]} />
          <meshStandardMaterial
            color="#0d1626"
            emissive={new THREE.Color("#00b4f5")}
            emissiveIntensity={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {/* Camera bump */}
      <mesh position={[0, 1.84, 0.12]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 24]} />
        <meshStandardMaterial color="#0a0f1a" metalness={0.98} roughness={0.04} />
      </mesh>

      {/* Camera lens */}
      <mesh position={[0, 1.84, 0.148]}>
        <cylinderGeometry args={[0.055, 0.055, 0.01, 24]} />
        <meshStandardMaterial color="#030509" metalness={0.5} roughness={0.1} />
      </mesh>

      {/* Home indicator */}
      <mesh position={[0, -1.8, 0.112]}>
        <boxGeometry args={[0.46, 0.04, 0.001]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

function Orbiter({
  radius,
  speed,
  offset,
  color,
  size,
  tilt,
}: {
  radius: number;
  speed: number;
  offset: number;
  color: string;
  size: number;
  tilt: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const c = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t * 0.5) * 0.6 + Math.sin(t * tilt) * 0.4;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.rotation.x += 0.025;
    ref.current.rotation.y += 0.018;
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[size]} />
      <meshStandardMaterial
        color={color}
        emissive={c}
        emissiveIntensity={0.6}
        metalness={0.4}
        roughness={0.3}
      />
    </mesh>
  );
}

const ORBITERS = [
  { radius: 3.0, speed: 1.1,  offset: 0,           color: "#00b4f5", size: 0.18, tilt: 0.8 },
  { radius: 3.4, speed: -0.75, offset: Math.PI / 2, color: "#22c55e", size: 0.14, tilt: 1.2 },
  { radius: 2.6, speed: 1.4,  offset: Math.PI,      color: "#f59e0b", size: 0.12, tilt: 0.6 },
  { radius: 3.8, speed: -1.0, offset: Math.PI * 1.5,color: "#818cf8", size: 0.1,  tilt: 1.5 },
];

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.25} color="#b3d4f5" />
      <pointLight position={[4, 5, 4]} intensity={2.2} color="#00b4f5" />
      <pointLight position={[-4, -4, -4]} intensity={0.6} color="#1d4ed8" />
      <pointLight position={[0, -3, 3]} intensity={0.4} color="#ffffff" />

      <Float speed={1.4} floatIntensity={0.45} rotationIntensity={0}>
        <PhoneModel />
      </Float>

      {ORBITERS.map((o, i) => (
        <Orbiter key={i} {...o} />
      ))}

      <Sparkles
        count={90}
        scale={9}
        size={0.6}
        speed={0.28}
        color="#00b4f5"
        opacity={0.5}
      />

      <Environment preset="city" />
    </Canvas>
  );
}
