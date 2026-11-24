"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowsLeftRight,
  CheckCircle,
  Compass,
  Crosshair,
  MapPin,
  Package,
  PaperPlaneTilt,
  Pause,
  Play,
  Warning,
} from "@phosphor-icons/react";
import type {
  BranchPerformanceRow,
  ExpiryAlertItem,
  LiveFlowEvent,
  Location,
  LowStockItem,
  Product,
  Transfer,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface IsometricInventorySceneProps {
  locations: Location[];
  branchPerformance: BranchPerformanceRow[];
  lowStock: LowStockItem[];
  expiryAlerts: ExpiryAlertItem[];
  liveFlows: LiveFlowEvent[];
  transfers?: Transfer[];
  products?: Product[];
  selectedCode: string | null;
  onSelectCode: (code: string) => void;
  simulationRunning: boolean;
  onToggleSimulation: () => void;
  canApprove?: boolean;
  canDispatchOrReceive?: boolean;
  allowedLocationIds?: number[];
  isGlobalRole?: boolean;
  onApproveTransfer?: (id: number) => Promise<void>;
  onDispatchTransfer?: (id: number) => Promise<void>;
  onQuickReceiveTransfer?: (trf: Transfer) => Promise<void>;
}

/**
 * Architectural 3D silhouette of Bangladesh (centered around Dhaka at [0, 0]).
 */
const BANGLADESH_OUTLINE: [number, number][] = [
  [-3.8, 7.6],
  [-2.0, 7.1],
  [-0.9, 6.2],
  [0.8, 5.4],
  [2.9, 5.1],
  [4.8, 4.4],
  [4.2, 2.7],
  [3.0, 1.5],
  [3.3, -0.4],
  [4.4, -2.5],
  [5.2, -5.2],
  [4.4, -6.2],
  [3.5, -4.4],
  [2.4, -2.2],
  [1.2, -2.9],
  [0.1, -3.5],
  [-1.3, -3.7],
  [-2.8, -3.5],
  [-3.3, -1.5],
  [-3.6, 0.8],
  [-4.6, 2.6],
  [-4.2, 4.8],
];

const DIVISION_MARKERS: { name: string; pos: [number, number] }[] = [
  { name: "Rangpur", pos: [-4.6, -10.8] },
  { name: "Rajshahi", pos: [-6.8, -4.4] },
  { name: "Sylhet", pos: [6.2, -7.8] },
  { name: "Khulna", pos: [-4.8, 4.6] },
  { name: "Barisal", pos: [0.8, 5.8] },
  { name: "Chattogram", pos: [7.2, 7.0] },
];

/**
 * Real relative Dhaka geographic layout on the elevated Dhaka plateau.
 * Spaced cleanly so labels never collide!
 */
const DHAKA_COORDS: Record<string, { pos: [number, number]; shortName: string }> = {
  "WH-01": { pos: [0.0, -2.55], shortName: "Uttara Main Hub" },
  "CW-01": { pos: [0.0, -2.55], shortName: "Uttara Main Hub" },
  "HQ-01": { pos: [-1.55, -2.75], shortName: "Head Office" },
  "BR-01": { pos: [1.75, -2.05], shortName: "Uttara Flagship" },
  "BR-02": { pos: [-2.65, -0.75], shortName: "Mirpur 10" },
  "BR-03": { pos: [2.75, -0.45], shortName: "Bashundhara R/A" },
  "BR-04": { pos: [1.75, 0.95], shortName: "Gulshan 2" },
  "BR-05": { pos: [0.0, 0.25], shortName: "Banani Rd 11" },
  "BR-06": { pos: [-2.2, 1.65], shortName: "Dhanmondi 27" },
  "BR-07": { pos: [1.65, 2.55], shortName: "Motijheel" },
};

interface ProjectedPin {
  code: string;
  label: string;
  revenue: number;
  x: number;
  y: number;
  visible: boolean;
  isHub: boolean;
  hasAlert: boolean;
  isActiveOrderNode: boolean;
}

export function IsometricInventoryScene({
  locations,
  branchPerformance,
  lowStock,
  expiryAlerts,
  transfers = [],
  products = [],
  selectedCode,
  onSelectCode,
  simulationRunning,
  onToggleSimulation,
  canApprove = false,
  canDispatchOrReceive = false,
  allowedLocationIds = [],
  isGlobalRole = true,
  onApproveTransfer,
  onDispatchTransfer,
  onQuickReceiveTransfer,
}: IsometricInventorySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"dhaka" | "bangladesh">("dhaka");
  const [pins, setPins] = useState<ProjectedPin[]>([]);
  const [divPins, setDivPins] = useState<{ name: string; x: number; y: number; visible: boolean }[]>([]);
  const [focusedTransferId, setFocusedTransferId] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  const viewModeRef = useRef(viewMode);
  const selectedCodeRef = useRef(selectedCode);
  const simRunningRef = useRef(simulationRunning);
  const onSelectRef = useRef(onSelectCode);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);
  useEffect(() => {
    simRunningRef.current = simulationRunning;
  }, [simulationRunning]);
  useEffect(() => {
    onSelectRef.current = onSelectCode;
  }, [onSelectCode]);

  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const perfByCode = useMemo(
    () => new Map(branchPerformance.map((b) => [b.location_code, b])),
    [branchPerformance]
  );

  const activeTransfers = useMemo(
    () =>
      transfers.filter((t) =>
        ["submitted", "requested", "approved", "dispatched", "in_transit", "under_investigation"].includes(
          t.status
        )
      ),
    [transfers]
  );

  const focusedTransfer = useMemo(
    () =>
      activeTransfers.find((t) => t.id === focusedTransferId) ?? activeTransfers[0] ?? null,
    [activeTransfers, focusedTransferId]
  );

  const lowStockCodes = useMemo(() => new Set(lowStock.map((l) => l.location_code)), [lowStock]);
  const expiryCodes = useMemo(
    () => new Set(expiryAlerts.filter((e) => e.days_remaining <= 30).map((e) => e.location_code)),
    [expiryAlerts]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 880;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F6EFE6");

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 180);
    camera.position.set(0, 11.2, 11.0);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Warm creamy architectural daylight
    scene.add(new THREE.AmbientLight(0xfffaf3, 1.25));

    const sun = new THREE.DirectionalLight(0xfff5e8, 0.95);
    sun.position.set(12, 24, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const crimsonGlow = new THREE.PointLight(0xb91c1c, 1.4, 24);
    crimsonGlow.position.set(0, 5.5, -2.5);
    scene.add(crimsonGlow);

    // Soft warm coordinate grid
    const grid = new THREE.GridHelper(36, 36, 0xe2d6c5, 0xede5d8);
    grid.position.y = -0.02;
    scene.add(grid);

    // 1. Extruded 3D Bangladesh Map Silhouette (Creamy Ivory + Crimson Border)
    const bdShape = new THREE.Shape();
    BANGLADESH_OUTLINE.forEach(([x, y], idx) => {
      const sx = x * 2.15;
      const sy = y * 2.15;
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
        color: 0xfffdf9,
        roughness: 0.42,
        metalness: 0.03,
      })
    );
    bdMesh.receiveShadow = true;
    bdMesh.castShadow = true;
    scene.add(bdMesh);

    const bdEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(bdGeo, 24),
      new THREE.LineBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.38 })
    );
    scene.add(bdEdge);

    // 2. Elevated Dhaka Metropolitan Region Plateau
    const dhakaGroup = new THREE.Group();
    dhakaGroup.position.set(0, 0.62, 0);
    scene.add(dhakaGroup);

    const dhakaPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(3.85, 4.05, 0.3, 56),
      new THREE.MeshStandardMaterial({
        color: 0xfef2f2,
        roughness: 0.35,
        metalness: 0.04,
      })
    );
    dhakaPlate.position.y = 0.15;
    dhakaPlate.receiveShadow = true;
    dhakaPlate.castShadow = true;
    dhakaGroup.add(dhakaPlate);

    const dhakaRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.88, 0.05, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xb91c1c })
    );
    dhakaRim.rotation.x = Math.PI / 2;
    dhakaRim.position.y = 0.31;
    dhakaGroup.add(dhakaRim);

    // 3. Plot Locations (Uttara Main Hub + 7 Dhaka Branches)
    const pickables: THREE.Object3D[] = [];
    const pinTopMap = new Map<string, THREE.Vector3>();
    const nodeRings = new Map<string, THREE.Mesh>();

    const visibleLocs = locations.filter((l) => DHAKA_COORDS[l.code] && l.code !== "HQ-01");

    visibleLocs.forEach((loc) => {
      const cfg = DHAKA_COORDS[loc.code];
      if (!cfg) return;
      const [bx, bz] = cfg.pos;
      const isHub = loc.code === "WH-01" || loc.code === "CW-01" || loc.location_type === "central_warehouse";
      const hasExpiry = expiryCodes.has(loc.code);
      const hasLow = lowStockCodes.has(loc.code);

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(bx, 0.32, bz);
      dhakaGroup.add(nodeGroup);

      const bHeight = isHub ? 1.15 : 0.52;
      const bWidth = isHub ? 0.82 : 0.56;
      const bodyColor = isHub ? 0x991b1b : hasExpiry ? 0xb91c1c : hasLow ? 0xd97706 : 0xffffff;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(bWidth, bHeight, bWidth),
        new THREE.MeshStandardMaterial({
          color: bodyColor,
          roughness: 0.28,
          metalness: isHub ? 0.18 : 0.08,
        })
      );
      building.position.y = bHeight / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      building.userData = { code: loc.code };
      nodeGroup.add(building);
      pickables.push(building);

      // Beacon orb on top
      const orbColor = isHub ? 0xfef2f2 : hasExpiry ? 0xdc2626 : hasLow ? 0xf59e0b : 0x059669;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(isHub ? 0.22 : 0.15, 20, 20),
        new THREE.MeshStandardMaterial({
          color: orbColor,
          emissive: orbColor,
          emissiveIntensity: 0.35,
          roughness: 0.2,
        })
      );
      orb.position.y = bHeight + 0.26;
      orb.userData = { code: loc.code };
      nodeGroup.add(orb);
      pickables.push(orb);

      // Selection / status halo ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(isHub ? 0.52 : 0.36, isHub ? 0.66 : 0.48, 32),
        new THREE.MeshBasicMaterial({
          color: isHub ? 0xb91c1c : hasLow ? 0xd97706 : 0x059669,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      nodeGroup.add(ring);
      nodeRings.set(loc.code, ring);

      pinTopMap.set(loc.code, new THREE.Vector3(bx, bHeight + 1.3, bz));
    });

    // 4. Real-Time Transfer & Supply Arcs between actual source & destination regions!
    const arcPackets: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];

    const transfersToDraw = activeTransfers.length > 0 ? activeTransfers : [];
    transfersToDraw.forEach((trf, idx) => {
      const fromLoc = locById.get(trf.from_location_id);
      const toLoc = locById.get(trf.to_location_id);
      const fromCfg = fromLoc ? DHAKA_COORDS[fromLoc.code] : null;
      const toCfg = toLoc ? DHAKA_COORDS[toLoc.code] : null;
      if (!fromCfg || !toCfg) return;

      const start = new THREE.Vector3(fromCfg.pos[0], 1.15, fromCfg.pos[1]);
      const end = new THREE.Vector3(toCfg.pos[0], 0.85, toCfg.pos[1]);
      const mid = new THREE.Vector3(
        (start.x + end.x) * 0.5,
        2.35 + (idx % 3) * 0.35,
        (start.z + end.z) * 0.5
      );
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

      const isDispatched = trf.status === "dispatched" || trf.status === "in_transit";
      const isShortage = trf.status === "under_investigation";
      const arcColor = isShortage ? 0xdc2626 : isDispatched ? 0x059669 : 0xd97706;

      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, isDispatched ? 0.055 : 0.035, 8, false),
        new THREE.MeshBasicMaterial({
          color: arcColor,
          transparent: true,
          opacity: isDispatched ? 0.85 : 0.55,
        })
      );
      dhakaGroup.add(tube);

      const pkt = new THREE.Mesh(
        new THREE.SphereGeometry(isDispatched ? 0.13 : 0.095, 14, 14),
        new THREE.MeshBasicMaterial({ color: arcColor })
      );
      dhakaGroup.add(pkt);
      arcPackets.push({
        mesh: pkt,
        curve,
        t: (idx * 0.27) % 1,
        speed: isDispatched ? 0.36 : 0.2,
      });
    });

    // Subtle hub-to-branch baseline links when no transfer on a branch
    const hubPos = DHAKA_COORDS["WH-01"].pos;
    visibleLocs.forEach((loc) => {
      if (loc.code === "WH-01") return;
      const cfg = DHAKA_COORDS[loc.code];
      if (!cfg) return;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(hubPos[0], 0.7, hubPos[1]),
        new THREE.Vector3((hubPos[0] + cfg.pos[0]) * 0.5, 1.25, (hubPos[1] + cfg.pos[1]) * 0.5),
        new THREE.Vector3(cfg.pos[0], 0.5, cfg.pos[1])
      );
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),
        new THREE.LineBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.16 })
      );
      dhakaGroup.add(line);
    });

    // Pointer orbit & click raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let orbitAzimuth = 0.22;
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
          const code = hits[0].object.userData?.code as string | undefined;
          if (code) onSelectRef.current(code);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const w = container.clientWidth || 880;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    let frame = 0;
    const clock = new THREE.Clock();
    const currentCamPos = camera.position.clone();
    const currentLook = new THREE.Vector3(0, 0.7, 0);

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      frame++;

      const radius = viewModeRef.current === "dhaka" ? 10.6 : 28.5;
      const heightY = viewModeRef.current === "dhaka" ? 9.2 : 22.5;
      const desiredCam = new THREE.Vector3(
        Math.sin(orbitAzimuth) * radius,
        heightY,
        Math.cos(orbitAzimuth) * radius
      );
      currentCamPos.lerp(desiredCam, 0.06);
      camera.position.copy(currentCamPos);

      const selCfg = selectedCodeRef.current ? DHAKA_COORDS[selectedCodeRef.current] : null;
      const desiredLook =
        viewModeRef.current === "dhaka" && selCfg
          ? new THREE.Vector3(selCfg.pos[0] * 0.22, 0.75, selCfg.pos[1] * 0.22)
          : new THREE.Vector3(0, 0.45, 0);
      currentLook.lerp(desiredLook, 0.06);
      camera.lookAt(currentLook);

      nodeRings.forEach((ring, code) => {
        const isSel = code === selectedCodeRef.current;
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, isSel ? 0.95 : 0.3, 0.1);
        const s = isSel ? 1.25 + Math.sin(elapsed * 4) * 0.12 : 1;
        ring.scale.set(s, s, 1);
      });

      if (simRunningRef.current) {
        arcPackets.forEach((p) => {
          p.t = (p.t + dt * p.speed) % 1;
          p.mesh.position.copy(p.curve.getPoint(p.t));
        });
      }

      renderer.render(scene, camera);

      if (frame % 2 === 0) {
        const w = container.clientWidth || 880;
        const h = container.clientHeight || 520;
        const activeNodeCodes = new Set<string>();
        activeTransfers.forEach((t) => {
          const f = locById.get(t.from_location_id)?.code;
          const to = locById.get(t.to_location_id)?.code;
          if (f) activeNodeCodes.add(f);
          if (to) activeNodeCodes.add(to);
        });

        const nextPins: ProjectedPin[] = visibleLocs.map((loc) => {
          const v = (pinTopMap.get(loc.code) ?? new THREE.Vector3()).clone();
          v.y += 0.62; // dhakaGroup y offset
          v.project(camera);
          const cfg = DHAKA_COORDS[loc.code];
          return {
            code: loc.code,
            label: cfg?.shortName ?? loc.name,
            revenue: perfByCode.get(loc.code)?.inventory_value ?? 0,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible: v.z < 1,
            isHub: loc.code === "WH-01",
            hasAlert: lowStockCodes.has(loc.code) || expiryCodes.has(loc.code),
            isActiveOrderNode: activeNodeCodes.has(loc.code),
          };
        });
        setPins(nextPins);

        if (viewModeRef.current === "bangladesh") {
          setDivPins(
            DIVISION_MARKERS.map((d) => {
              const v = new THREE.Vector3(d.pos[0], 0.8, d.pos[1]);
              v.project(camera);
              return {
                name: d.name,
                x: (v.x * 0.5 + 0.5) * w,
                y: (-v.y * 0.5 + 0.5) * h,
                visible: v.z < 1,
              };
            })
          );
        } else {
          setDivPins([]);
        }
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
  }, [locations, activeTransfers, locById, perfByCode, lowStockCodes, expiryCodes]);

  const runMapAction = async (id: number, fn: () => Promise<void>) => {
    setActionBusy(id);
    try {
      await fn();
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9] shadow-xs">
      {/* 3D Bangladesh & Dhaka Operations Map */}
      <div className="relative h-[470px] sm:h-[520px] w-full overflow-hidden bg-[#F6EFE6]">
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D Bangladesh and Dhaka live pharmacy supply map"
        />

        {/* Projected Division Labels when zoomed out to Bangladesh */}
        {viewMode === "bangladesh" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {divPins.map((d) =>
              d.visible ? (
                <span
                  key={d.name}
                  style={{ transform: `translate3d(${d.x}px, ${d.y}px, 0) translate(-50%, -50%)` }}
                  className="absolute left-0 top-0 rounded-full border border-[#E7DDD0] bg-[#FFFDF9]/85 px-2.5 py-0.5 caption-5 font-medium text-[#57534E]"
                >
                  {d.name}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Projected Dhaka Region Pins */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {pins.map((pin) => {
            if (!pin.visible) return null;
            const active = pin.code === selectedCode;
            return (
              <button
                key={pin.code}
                type="button"
                onClick={() => onSelectCode(pin.code)}
                style={{
                  transform: `translate3d(${pin.x}px, ${pin.y}px, 0) translate(-50%, -100%)`,
                }}
                className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-xs backdrop-blur-md transition-all cursor-pointer ${
                  active
                    ? "border-[#991B1B] bg-[#B91C1C] text-[#FFFDF9] scale-105 z-20"
                    : pin.isHub
                      ? "border-[#B91C1C] bg-[#FEF2F2]/95 text-[#991B1B] font-semibold z-10"
                      : "border-[#E2D6C5] bg-[#FFFDF9]/95 text-[#1C1917] hover:border-[#B91C1C]"
                }`}
              >
                <MapPin
                  size={12}
                  weight="fill"
                  className={
                    active
                      ? "text-[#FFFDF9]"
                      : pin.isHub
                        ? "text-[#B91C1C]"
                        : pin.hasAlert
                          ? "text-[#D97706]"
                          : "text-[#059669]"
                  }
                />
                <span className="caption-4 whitespace-nowrap font-medium">{pin.label}</span>
                {viewMode === "dhaka" && pin.revenue > 0 && (
                  <span
                    className={`hidden sm:inline font-mono text-[10px] ${
                      active ? "text-[#FEE2E2]" : "text-[#78716C]"
                    }`}
                  >
                    {formatCurrency(pin.revenue)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Top Left Title */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 shadow-xs backdrop-blur-md">
          <Compass size={16} weight="duotone" className="text-[#B91C1C]" />
          <span className="caption-3 font-semibold text-[#1C1917]">
            Bangladesh · Dhaka Live Operations Map
          </span>
          <Badge variant="emerald" pulse>
            Live
          </Badge>
        </div>

        {/* Top Right Controls */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 p-1 shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode("dhaka")}
              className={`rounded-lg px-2.5 py-1 caption-4 font-medium transition-colors cursor-pointer ${
                viewMode === "dhaka"
                  ? "bg-[#B91C1C] text-[#FFFDF9]"
                  : "text-[#57534E] hover:text-[#1C1917]"
              }`}
            >
              Dhaka Regions
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bangladesh")}
              className={`rounded-lg px-2.5 py-1 caption-4 font-medium transition-colors cursor-pointer ${
                viewMode === "bangladesh"
                  ? "bg-[#B91C1C] text-[#FFFDF9]"
                  : "text-[#57534E] hover:text-[#1C1917]"
              }`}
            >
              Bangladesh Map
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleSimulation}
            title={simulationRunning ? "Pause flow animation" : "Resume flow animation"}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 text-[#1C1917] shadow-xs hover:border-[#B91C1C] cursor-pointer"
          >
            {simulationRunning ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </button>
        </div>

        {/* Bottom Legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 caption-5 text-[#57534E] shadow-xs backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B91C1C]" />
              Uttara Main Hub / Alert
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
              In-Transit Dispatch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
              Requested / Pending
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 caption-5 text-[#57534E] shadow-xs">
            <Crosshair size={13} />
            <span>Drag to rotate · Click any Dhaka branch</span>
          </div>
        </div>
      </div>

      {/* Live Inter-Branch Order & Transfer Command Strip right below the map */}
      <div className="border-t border-[#E7DDD0] bg-[#FAF6F0]/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ArrowsLeftRight size={16} weight="bold" className="text-[#B91C1C]" />
            <h3 className="title-4 text-[#1C1917]">
              Live Branch Stock Orders & Dispatches ({activeTransfers.length})
            </h3>
          </div>
          <span className="caption-5 text-[#57534E]">
            See which branch requested what, approve, dispatch, or confirm receipt directly
          </span>
        </div>

        {activeTransfers.length === 0 ? (
          <p className="rounded-xl border border-[#E7DDD0] bg-[#FFFDF9] px-4 py-3 caption-4 text-[#78716C]">
            All inter-branch transfers are currently completed.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {activeTransfers.slice(0, 4).map((trf) => {
              const from = locById.get(trf.from_location_id);
              const to = locById.get(trf.to_location_id);
              const firstItem = trf.items[0];
              const prod = firstItem ? prodById.get(firstItem.product_id) : null;
              const isSubmitted = trf.status === "submitted" || trf.status === "requested";
              const isApproved = trf.status === "approved";
              const isDispatched = trf.status === "dispatched" || trf.status === "in_transit";
              const canDispatchThis =
                canDispatchOrReceive &&
                (isGlobalRole || allowedLocationIds.includes(trf.from_location_id));
              const canReceiveThis =
                canDispatchOrReceive &&
                (isGlobalRole || allowedLocationIds.includes(trf.to_location_id));
              const isFocused = focusedTransfer?.id === trf.id;

              return (
                <div
                  key={trf.id}
                  onClick={() => {
                    setFocusedTransferId(trf.id);
                    if (to?.code) onSelectCode(to.code);
                  }}
                  className={`flex flex-col justify-between gap-2 rounded-xl border p-3 transition-colors cursor-pointer ${
                    isFocused
                      ? "border-[#B91C1C] bg-[#FFFDF9] shadow-xs"
                      : "border-[#E7DDD0] bg-[#FFFDF9]/90 hover:border-[#FECACA]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono caption-4 font-semibold text-[#B91C1C]">
                          {from?.code ?? "WH-01"} → {to?.code ?? "BR"}
                        </span>
                        <Badge
                          variant={
                            isDispatched
                              ? "emerald"
                              : trf.status === "under_investigation"
                                ? "crimson"
                                : "amber"
                          }
                        >
                          {trf.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate body-6 font-semibold text-[#1C1917]">
                        {prod?.name ?? "Medicine Restock"} ({firstItem?.requested_quantity ?? 0} units
                        {trf.items.length > 1 ? ` +${trf.items.length - 1} more` : ""})
                      </p>
                      <p className="truncate caption-5 text-[#57534E]">
                        {from?.name ?? "Uttara Hub"} → {to?.name ?? "Branch"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {isSubmitted && canApprove && onApproveTransfer && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={actionBusy === trf.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void runMapAction(trf.id, () => onApproveTransfer(trf.id));
                        }}
                        className="w-full"
                      >
                        <CheckCircle size={14} weight="bold" />
                        <span>Approve Request</span>
                      </Button>
                    )}
                    {isApproved && canDispatchThis && onDispatchTransfer && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={actionBusy === trf.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void runMapAction(trf.id, () => onDispatchTransfer(trf.id));
                        }}
                        className="w-full"
                      >
                        <PaperPlaneTilt size={14} weight="bold" />
                        <span>Dispatch from Hub</span>
                      </Button>
                    )}
                    {isDispatched && canReceiveThis && onQuickReceiveTransfer && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={actionBusy === trf.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void runMapAction(trf.id, () => onQuickReceiveTransfer(trf));
                        }}
                        className="w-full"
                      >
                        <Package size={14} weight="bold" />
                        <span>Confirm Received</span>
                      </Button>
                    )}
                    {trf.status === "under_investigation" && (
                      <span className="flex items-center gap-1 caption-5 font-medium text-[#B91C1C]">
                        <Warning size={13} weight="fill" />
                        Shortage under investigation
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
