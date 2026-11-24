"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Compass, Crosshair, MapPin, Snowflake } from "@phosphor-icons/react";
import { DHAKA_BRANCHES, type PublicBranch } from "@/lib/public-catalog";

interface ProjectedPin {
  id: string;
  code: string;
  area: string;
  x: number;
  y: number;
  visible: boolean;
}

interface BangladeshDhakaMap3DProps {
  selectedBranchId: string;
  onSelectBranch: (branch: PublicBranch) => void;
}

/**
 * Simplified stylized architectural silhouette of Bangladesh in 2D shape coordinates
 * (centered around Dhaka at ~[0, 0]).
 */
const BANGLADESH_OUTLINE: [number, number][] = [
  [-3.8, 7.6],   // Panchagarh / Rangpur north-west
  [-2.0, 7.1],
  [-0.9, 6.2],
  [0.8, 5.4],    // Mymensingh north
  [2.9, 5.1],    // Sylhet north-east
  [4.8, 4.4],
  [4.2, 2.7],
  [3.0, 1.5],    // Comilla east
  [3.3, -0.4],
  [4.4, -2.5],   // Chittagong coast
  [5.2, -5.2],   // Cox's Bazar south-east
  [4.4, -6.2],
  [3.5, -4.4],
  [2.4, -2.2],
  [1.2, -2.9],   // Barisal / Delta
  [0.1, -3.5],
  [-1.3, -3.7],  // Sundarbans south-west
  [-2.8, -3.5],
  [-3.3, -1.5],  // Khulna
  [-3.6, 0.8],   // Jessore
  [-4.6, 2.6],   // Rajshahi west
  [-4.2, 4.8],   // Bogra / Dinajpur
];

export function BangladeshDhakaMap3D({
  selectedBranchId,
  onSelectBranch,
}: BangladeshDhakaMap3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"dhaka" | "bangladesh">("dhaka");
  const viewModeRef = useRef(viewMode);
  const selectedIdRef = useRef(selectedBranchId);
  const onSelectRef = useRef(onSelectBranch);
  const [pins, setPins] = useState<ProjectedPin[]>([]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    selectedIdRef.current = selectedBranchId;
  }, [selectedBranchId]);

  useEffect(() => {
    onSelectRef.current = onSelectBranch;
  }, [onSelectBranch]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 880;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#fafafa");

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 150);
    camera.position.set(0, 11.5, 11.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Clean bright daylight architectural lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(10, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const pinkGlow = new THREE.PointLight(0xff1f7a, 1.8, 22);
    pinkGlow.position.set(0, 4.5, 0);
    scene.add(pinkGlow);

    // Minimalist architectural coordinate grid floor
    const grid = new THREE.GridHelper(32, 32, 0xe5e5e5, 0xf0f0f0);
    grid.position.y = -0.02;
    scene.add(grid);

    // 1. Extruded 3D Bangladesh Map Base (scaled prominently around Dhaka)
    const bdShape = new THREE.Shape();
    BANGLADESH_OUTLINE.forEach(([x, y], idx) => {
      const sx = x * 1.95;
      const sy = y * 1.95;
      if (idx === 0) bdShape.moveTo(sx, sy);
      else bdShape.lineTo(sx, sy);
    });
    bdShape.closePath();

    const bdGeo = new THREE.ExtrudeGeometry(bdShape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
    bdGeo.rotateX(-Math.PI / 2);

    const bdMesh = new THREE.Mesh(
      bdGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.04,
      })
    );
    bdMesh.receiveShadow = true;
    bdMesh.castShadow = true;
    scene.add(bdMesh);

    // Crisp hot-pink accented border around Bangladesh
    const bdEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(bdGeo, 24),
      new THREE.LineBasicMaterial({ color: 0xff1f7a, transparent: true, opacity: 0.32 })
    );
    scene.add(bdEdge);

    // 2. Elevated Glowing Dhaka Sector Plateau (centered at 0, 0.62, 0)
    const dhakaGroup = new THREE.Group();
    dhakaGroup.position.set(0, 0.62, 0);
    scene.add(dhakaGroup);

    const dhakaPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.45, 0.28, 48),
      new THREE.MeshStandardMaterial({
        color: 0xfff0f6,
        roughness: 0.32,
        metalness: 0.05,
      })
    );
    dhakaPlate.position.y = 0.14;
    dhakaPlate.receiveShadow = true;
    dhakaPlate.castShadow = true;
    dhakaGroup.add(dhakaPlate);

    const dhakaRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.28, 0.045, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xff1f7a })
    );
    dhakaRim.rotation.x = Math.PI / 2;
    dhakaRim.position.y = 0.29;
    dhakaGroup.add(dhakaRim);

    // Central Tejgaon Cold-Chain Hub Tower at center of Dhaka Sector
    const hubTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.95, 6),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.3,
        metalness: 0.4,
      })
    );
    hubTower.position.set(0, 0.8, 0);
    hubTower.castShadow = true;
    dhakaGroup.add(hubTower);

    const hubBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xff1f7a })
    );
    hubBeacon.position.set(0, 1.42, 0);
    dhakaGroup.add(hubBeacon);

    // 3. Build all 8 Interactive Dhaka Branch Beacons + Supply Arcs
    const pickables: THREE.Object3D[] = [];
    const pinTopMap = new Map<string, THREE.Vector3>();
    const branchRings = new Map<string, THREE.Mesh>();
    const arcPackets: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];

    DHAKA_BRANCHES.forEach((branch, idx) => {
      const [bx, bz] = branch.dhakaPos;
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, 0.32, bz);
      dhakaGroup.add(bGroup);

      // Architectural branch pedestal
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.48, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.25,
          metalness: 0.1,
        })
      );
      pod.position.y = 0.24;
      pod.castShadow = true;
      pod.userData = { branch };
      bGroup.add(pod);
      pickables.push(pod);

      // Hot pink glowing pin head
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 0xff1f7a,
          emissive: 0xff1f7a,
          emissiveIntensity: 0.35,
          roughness: 0.2,
        })
      );
      pin.position.y = 0.72;
      pin.castShadow = true;
      pin.userData = { branch };
      bGroup.add(pin);
      pickables.push(pin);

      // Selection / pulse halo ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.36, 0.48, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff1f7a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      bGroup.add(ring);
      branchRings.set(branch.id, ring);

      // World space top position for 2D crisp label projection
      pinTopMap.set(branch.id, new THREE.Vector3(bx, 1.65, bz));

      // Glowing supply arc from Central Hub (0, 0.7, 0) to Branch
      const start = new THREE.Vector3(0, 0.75, 0);
      const end = new THREE.Vector3(bx, 0.65, bz);
      const mid = new THREE.Vector3(bx * 0.5, 1.9 + (idx % 3) * 0.25, bz * 0.5);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const arcLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),
        new THREE.LineBasicMaterial({ color: 0xff1f7a, transparent: true, opacity: 0.35 })
      );
      dhakaGroup.add(arcLine);

      // Animated light packet gliding along arc
      const pkt = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff1f7a })
      );
      dhakaGroup.add(pkt);
      arcPackets.push({
        mesh: pkt,
        curve,
        t: (idx / DHAKA_BRANCHES.length) % 1,
        speed: 0.22 + (idx % 3) * 0.05,
      });
    });

    // Pointer orbit & click raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let orbitAzimuth = 0.28;
    let isDragging = false;
    let dragMoved = 0;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragMoved = 0;
      lastX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dragMoved += Math.abs(dx);
      orbitAzimuth -= dx * 0.006;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (dragMoved < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickables, false);
        if (hits.length > 0) {
          const branch = hits[0].object.userData?.branch as PublicBranch | undefined;
          if (branch) onSelectRef.current(branch);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const w = container.clientWidth || 880;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Smooth animation loop
    let rafId = 0;
    let frame = 0;
    const clock = new THREE.Clock();
    const currentCamPos = camera.position.clone();
    const currentLook = new THREE.Vector3(0, 0.6, 0);

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      frame++;

      // Smooth camera preset: Dhaka Sector close-up vs Full Bangladesh silhouette
      const radius = viewModeRef.current === "dhaka" ? 9.6 : 26.5;
      const heightY = viewModeRef.current === "dhaka" ? 8.2 : 21.0;
      const desiredCam = new THREE.Vector3(
        Math.sin(orbitAzimuth) * radius,
        heightY,
        Math.cos(orbitAzimuth) * radius
      );
      currentCamPos.lerp(desiredCam, 0.06);
      camera.position.copy(currentCamPos);

      const selBranch = DHAKA_BRANCHES.find((b) => b.id === selectedIdRef.current);
      const desiredLook =
        viewModeRef.current === "dhaka" && selBranch
          ? new THREE.Vector3(selBranch.dhakaPos[0] * 0.28, 0.7, selBranch.dhakaPos[1] * 0.28)
          : new THREE.Vector3(0, 0.4, 0);
      currentLook.lerp(desiredLook, 0.06);
      camera.lookAt(currentLook);

      // Pulse hub beacon & selected branch ring
      const hubScale = 1 + Math.sin(elapsed * 3) * 0.14;
      hubBeacon.scale.setScalar(hubScale);

      branchRings.forEach((ring, id) => {
        const isSel = id === selectedIdRef.current;
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, isSel ? 0.9 : 0.25, 0.1);
        const s = isSel ? 1.25 + Math.sin(elapsed * 4) * 0.12 : 1;
        ring.scale.set(s, s, 1);
      });

      // Advance glowing supply packets along arcs
      arcPackets.forEach((p) => {
        p.t = (p.t + dt * p.speed) % 1;
        p.mesh.position.copy(p.curve.getPoint(p.t));
      });

      renderer.render(scene, camera);

      // Project 8 Dhaka branch pins to 2D crisp labels
      if (frame % 2 === 0) {
        const w = container.clientWidth || 880;
        const h = container.clientHeight || 540;
        const nextPins: ProjectedPin[] = DHAKA_BRANCHES.map((b) => {
          const v = (pinTopMap.get(b.id) ?? new THREE.Vector3()).clone();
          v.project(camera);
          return {
            id: b.id,
            code: b.code,
            area: b.area,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible: v.z < 1,
          };
        });
        setPins(nextPins);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-[480px] sm:h-[560px] w-full overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D map of Bangladesh highlighting Dhaka sector with 8 pharmacy branches"
      />

      {/* Crisp 2D Projected Dhaka Branch Pins */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pins.map((pin) => {
          if (!pin.visible) return null;
          const active = pin.id === selectedBranchId;
          const branch = DHAKA_BRANCHES.find((b) => b.id === pin.id);
          return (
            <button
              key={pin.id}
              type="button"
              onClick={() => branch && onSelectBranch(branch)}
              style={{
                transform: `translate3d(${pin.x}px, ${pin.y}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-md transition-colors duration-300 cursor-pointer ${
                active
                  ? "border-[#ff1f7a] bg-[#ff1f7a] text-[#ffffff] shadow-md"
                  : "border-[#e5e5e5] bg-[#ffffff]/90 text-[#0a0a0a] hover:border-[#ff1f7a]"
              }`}
            >
              <MapPin size={12} weight="fill" className={active ? "text-[#ffffff]" : "text-[#ff1f7a]"} />
              <span className="caption-3 whitespace-nowrap">{pin.area}</span>
            </button>
          );
        })}
      </div>

      {/* Top Left Badge */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#ffffff]/90 px-3 py-1.5 backdrop-blur-md">
        <Compass size={16} weight="duotone" className="text-[#ff1f7a]" />
        <span className="caption-3 text-[#0a0a0a]">Bangladesh · Dhaka Sector (8 Branches)</span>
      </div>

      {/* Top Right View Switcher */}
      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-xl border border-[#e5e5e5] bg-[#ffffff]/90 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setViewMode("dhaka")}
          className={`rounded-lg px-3 py-1.5 caption-4 transition-colors duration-300 cursor-pointer ${
            viewMode === "dhaka"
              ? "bg-[#ff1f7a] text-[#ffffff]"
              : "text-[#525252] hover:text-[#0a0a0a]"
          }`}
        >
          Dhaka Sector (8)
        </button>
        <button
          type="button"
          onClick={() => setViewMode("bangladesh")}
          className={`rounded-lg px-3 py-1.5 caption-4 transition-colors duration-300 cursor-pointer ${
            viewMode === "bangladesh"
              ? "bg-[#ff1f7a] text-[#ffffff]"
              : "text-[#525252] hover:text-[#0a0a0a]"
          }`}
        >
          Bangladesh Map
        </button>
      </div>

      {/* Bottom Hint Bar */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#ffffff]/90 px-3 py-1.5 caption-5 text-[#525252] backdrop-blur-md">
          <Snowflake size={14} weight="fill" className="text-[#ff1f7a]" />
          <span>Central Hub live cold chain links to all 8 Dhaka branches</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] bg-[#ffffff]/90 px-3 py-1.5 caption-5 text-[#525252] backdrop-blur-md">
          <Crosshair size={14} />
          <span>Drag to rotate 3D map, click any branch pin</span>
        </div>
      </div>
    </div>
  );
}

