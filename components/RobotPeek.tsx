"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Robot modelini public/robot.glb qoy: /public/robot.glb
function RobotModel({ open }: { open: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const { scene } = useGLTF("/robot.glb");

  // başlanğıc transformlar
  const hiddenX = 0.55; // kənarın arxasında (gizli)
  const shownX = 0.18; // daha çox görünsün

  const targetX = open ? shownX : hiddenX;

  // Smooth easing
  const v = useMemo(() => ({ x: hiddenX }), []);

  useFrame((state, delta) => {
    if (!group.current) return;

    // 1) kənardan çıxma (smooth)
    v.x = THREE.MathUtils.damp(v.x, targetX, 7, delta);
    group.current.position.x = v.x;

    // 2) idle movement (baş yüngül hərəkət)
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      open ? -0.25 : -0.15,
      0.08,
    );

    group.current.rotation.z = Math.sin(t * 1.4) * 0.03;
    group.current.position.y = Math.sin(t * 1.2) * 0.02;

    // 3) "baxır" effekti: kameraya yüngül yönəlmə
    // (istəsən, baş bone varsa onu ayrıca rotate eləyərik)
    group.current.lookAt(-0.2, 0.1, 0.8);
  });

  return (
    <group ref={group} position={[hiddenX, -0.15, 0]} rotation={[0, -0.2, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function RobotPeek() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // chat səhifəsində göstərmə
  if (pathname === "/chat") return null;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
      // mobil-də daha az yer tutsun
      style={{ width: 220, height: 220 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen((v) => !v)}
    >
      {/* 3D robot */}
      <div className="relative w-full h-full">
        <Canvas
          camera={{ position: [0.6, 0.2, 1.25], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 2, 2]} intensity={1.2} />
          <Environment preset="city" />

          {/* Float daha canlı “hover” verir */}
          <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
            <RobotModel open={open} />
          </Float>
        </Canvas>

        {/* click area: AI chat */}
        <Link
          href="/chat"
          className="absolute inset-0 rounded-full"
          aria-label="AI Söhbət"
        />

        {/* Optional: kiçik “baloncuk” */}
        <div
          className={[
            "absolute -left-2 top-8",
            "rounded-2xl border bg-background/80 backdrop-blur px-3 py-2",
            "text-xs text-muted-foreground shadow-sm",
            "transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          AI kömək edim? 🙂
        </div>
      </div>
    </div>
  );
}

useGLTF.preload("/robot.glb");
