"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Interactive 3D Three.js floating pharmaceutical capsules & molecular orbital cluster
 * styled for a minimalist white and hot pink (#ff1f7a) canvas.
 */
export function HeroCapsuleScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 9.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Bright studio lighting for crisp white & hot pink glossy capsules
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    const pinkRim = new THREE.PointLight(0xff1f7a, 3.2, 18);
    pinkRim.position.set(-4, -2, 4);
    scene.add(pinkRim);

    const coolFill = new THREE.DirectionalLight(0xfce7f3, 0.9);
    coolFill.position.set(-7, 4, -5);
    scene.add(coolFill);

    const root = new THREE.Group();
    scene.add(root);

    // Helper to build a two tone glossy medical capsule (Hot Pink + Pearl White)
    const createCapsule = (scale: number) => {
      const g = new THREE.Group();
      const pinkMat = new THREE.MeshPhysicalMaterial({
        color: 0xff1f7a,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      const whiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.15,
        metalness: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      });

      const cylTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.72, 28), pinkMat);
      cylTop.position.y = 0.36;
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 16), pinkMat);
      capTop.position.y = 0.72;

      const cylBot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.72, 28), whiteMat);
      cylBot.position.y = -0.36;
      const capBot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 16), whiteMat);
      capBot.position.y = -0.72;

      // Subtle rose seam ring
      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(0.455, 0.022, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 })
      );
      seam.rotation.x = Math.PI / 2;

      g.add(cylTop, capTop, cylBot, capBot, seam);
      g.scale.setScalar(scale);
      return g;
    };

    // Hero primary capsule
    const mainCapsule = createCapsule(1.38);
    mainCapsule.rotation.set(0.35, 0.2, -0.58);
    root.add(mainCapsule);

    // Satellite floating capsules
    const sat1 = createCapsule(0.62);
    sat1.position.set(-2.4, 1.3, -0.6);
    sat1.rotation.set(0.8, 0.4, 0.7);
    root.add(sat1);

    const sat2 = createCapsule(0.55);
    sat2.position.set(2.35, -1.2, -0.4);
    sat2.rotation.set(-0.5, 0.9, -0.8);
    root.add(sat2);

    // Precision architectural orbital rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.02, 16, 96),
      new THREE.MeshBasicMaterial({ color: 0xff1f7a, transparent: true, opacity: 0.42 })
    );
    ring1.rotation.set(1.18, 0.3, 0.2);
    root.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.15, 0.015, 16, 96),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.14 })
    );
    ring2.rotation.set(-0.95, 0.55, 0.1);
    root.add(ring2);

    // Floating molecular beads around the orbit
    const beads: { mesh: THREE.Mesh; radius: number; speed: number; angle: number; yOff: number }[] = [];
    const beadGeo = new THREE.SphereGeometry(0.11, 18, 18);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff1f7a : 0x171717,
        roughness: 0.25,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(beadGeo, mat);
      const angle = (i / 10) * Math.PI * 2;
      const radius = 2.4 + (i % 3) * 0.45;
      const yOff = ((i % 4) - 1.5) * 0.65;
      root.add(mesh);
      beads.push({ mesh, radius, speed: 0.32 + (i % 3) * 0.12, angle, yOff });
    }

    // Subtle pointer parallax
    let targetRotX = 0;
    let targetRotY = 0;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetRotY = nx * 0.35;
      targetRotX = ny * 0.22;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!prefersReduced) {
        mainCapsule.position.y = Math.sin(t * 1.4) * 0.24;
        mainCapsule.rotation.y = 0.2 + t * 0.42;

        sat1.position.y = 1.3 + Math.sin(t * 1.7 + 1.2) * 0.22;
        sat1.rotation.x = 0.8 + t * 0.35;

        sat2.position.y = -1.2 + Math.cos(t * 1.5 + 0.5) * 0.22;
        sat2.rotation.z = -0.8 - t * 0.3;

        ring1.rotation.z = t * 0.18;
        ring2.rotation.z = -t * 0.12;

        beads.forEach((b) => {
          const a = b.angle + t * b.speed;
          b.mesh.position.set(
            Math.cos(a) * b.radius,
            b.yOff + Math.sin(t * 1.6 + b.angle) * 0.22,
            Math.sin(a) * b.radius * 0.55
          );
        });
      }

      root.rotation.y += (targetRotY - root.rotation.y) * 0.05;
      root.rotation.x += (targetRotX - root.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-[380px] sm:h-[440px] w-full overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
      {/* Animated subtle architectural SVG vector grid behind Three.js canvas */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="med-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e5e5e5" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#med-grid)" />
        <circle cx="50%" cy="50%" r="150" fill="none" stroke="#ff1f7a" strokeOpacity="0.18" strokeDasharray="4 6" />
        <circle cx="50%" cy="50%" r="205" fill="none" stroke="#0a0a0a" strokeOpacity="0.08" />
      </svg>

      {/* Three.js Canvas */}
      <div ref={mountRef} className="relative z-10 h-full w-full" />

      {/* Crisp floating corner callouts */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-[#ff1f7a]/25 bg-[#ffffff]/90 px-3 py-1 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-[#ff1f7a]" />
        <span className="caption-4 text-[#0a0a0a]">FEFO Verified Supply</span>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-xl border border-[#e5e5e5] bg-[#ffffff]/90 px-3 py-1.5 backdrop-blur-md">
          <p className="caption-5 text-[#737373]">Dhaka Network</p>
          <p className="font-mono caption-3 text-[#0a0a0a]">8 Live Branches</p>
        </div>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#ffffff]/90 px-3 py-1.5 backdrop-blur-md">
          <p className="caption-5 text-[#737373]">Cold Chain Vault</p>
          <p className="font-mono caption-3 text-[#ff1f7a]">2°C to 8°C</p>
        </div>
      </div>
    </div>
  );
}
