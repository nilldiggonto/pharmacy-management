"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowsOutSimple,
  Crosshair,
  Cube,
  Pause,
  Play,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  BranchPerformanceRow,
  ExpiryAlertItem,
  LiveFlowEvent,
  Location,
  LowStockItem,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface NodeSpec {
  code: string;
  name: string;
  kind: "warehouse" | "head_office" | "branch" | "supplier";
  pos: [number, number, number];
  inventoryValue: number;
  salesRevenue: number;
  alertLevel: "healthy" | "warning" | "critical";
}

interface ProjectedLabel {
  code: string;
  name: string;
  kind: NodeSpec["kind"];
  x: number;
  y: number;
  visible: boolean;
  alertLevel: NodeSpec["alertLevel"];
  inventoryValue: number;
}

interface ActivePacket {
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  progress: number;
  speed: number;
  targetPos: THREE.Vector3;
  color: number;
}

interface PulseRing {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

interface IsometricInventorySceneProps {
  locations: Location[];
  branchPerformance: BranchPerformanceRow[];
  lowStock: LowStockItem[];
  expiryAlerts: ExpiryAlertItem[];
  liveFlows: LiveFlowEvent[];
  selectedCode: string | null;
  onSelectCode: (code: string) => void;
  simulationRunning: boolean;
  onToggleSimulation: () => void;
}

const NODE_COORDS: Record<string, [number, number, number]> = {
  "CW-01": [0, 0, 0],
  "HO-01": [0, 0, -8.5],
  "SUP-SQR": [-9.5, 0, -5.5],
  "BR-01": [7.5, 0, -5.0],
  "BR-02": [9.0, 0, 1.5],
  "BR-03": [5.5, 0, 7.2],
  "BR-04": [-1.2, 0, 8.6],
  "BR-05": [-7.4, 0, 6.2],
  "BR-06": [-9.0, 0, 0.2],
  "BR-07": [4.2, 0, -8.2],
};

export function IsometricInventoryScene({
  locations,
  branchPerformance,
  lowStock,
  expiryAlerts,
  liveFlows,
  selectedCode,
  onSelectCode,
  simulationRunning,
  onToggleSimulation,
}: IsometricInventorySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);
  const [cameraPreset, setCameraPreset] = useState<"overview" | "hub" | "branches">("overview");
  const cameraPresetRef = useRef(cameraPreset);
  const selectedCodeRef = useRef(selectedCode);
  const onSelectRef = useRef(onSelectCode);
  const spawnFlowRef = useRef<((ev: LiveFlowEvent) => void) | null>(null);
  const lastFlowIdRef = useRef<string | null>(null);

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    onSelectRef.current = onSelectCode;
  }, [onSelectCode]);

  const nodes = useMemo<NodeSpec[]>(() => {
    const perfMap = new Map(branchPerformance.map((p) => [p.location_code, p]));
    const lowSet = new Set(lowStock.map((l) => l.location_code));
    const criticalExpirySet = new Set(
      expiryAlerts.filter((e) => e.days_remaining <= 30).map((e) => e.location_code)
    );

    const list: NodeSpec[] = locations.map((loc, idx) => {
      const perf = perfMap.get(loc.code);
      const fallbackAngle = (idx / Math.max(1, locations.length)) * Math.PI * 2;
      const pos: [number, number, number] = NODE_COORDS[loc.code] ?? [
        Math.cos(fallbackAngle) * 8,
        0,
        Math.sin(fallbackAngle) * 8,
      ];
      let alertLevel: NodeSpec["alertLevel"] = "healthy";
      if (criticalExpirySet.has(loc.code)) alertLevel = "critical";
      else if (lowSet.has(loc.code)) alertLevel = "warning";

      return {
        code: loc.code,
        name: loc.name,
        kind:
          loc.location_type === "warehouse"
            ? "warehouse"
            : loc.location_type === "main_office"
              ? "head_office"
              : "branch",
        pos,
        inventoryValue: perf?.inventory_value ?? (loc.location_type === "warehouse" ? 148000 : 18500),
        salesRevenue: perf?.sales_revenue ?? 0,
        alertLevel,
      };
    });

    // Always include supplier intake dock for visual completeness
    list.push({
      code: "SUP-SQR",
      name: "Supplier Intake Dock",
      kind: "supplier",
      pos: NODE_COORDS["SUP-SQR"],
      inventoryValue: 0,
      salesRevenue: 0,
      alertLevel: "healthy",
    });

    return list;
  }, [locations, branchPerformance, lowStock, expiryAlerts]);

  // Spawn a 3D animated packet whenever a new liveFlow event arrives
  useEffect(() => {
    if (liveFlows.length === 0) return;
    const latest = liveFlows[0];
    if (latest.id !== lastFlowIdRef.current) {
      lastFlowIdRef.current = latest.id;
      spawnFlowRef.current?.(latest);
    }
  }, [liveFlows]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");

    // True isometric OrthographicCamera
    const aspect = width / height;
    let frustumSize = 23;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      200
    );

    let orbitAngle = Math.PI / 4; // 45 deg true isometric azimuth
    const elevationAngle = Math.atan(1 / Math.sqrt(2)); // ~35.264 deg isometric tilt
    const orbitRadius = 32;
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentLookAt = new THREE.Vector3(0, 0, 0);

    const updateCameraPosition = () => {
      const horiz = orbitRadius * Math.cos(elevationAngle);
      camera.position.set(
        currentLookAt.x + horiz * Math.sin(orbitAngle),
        currentLookAt.y + orbitRadius * Math.sin(elevationAngle),
        currentLookAt.z + horiz * Math.cos(orbitAngle)
      );
      camera.lookAt(currentLookAt);
    };
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Crisp studio lighting
    const ambient = new THREE.AmbientLight(0xd6d3d1, 0.75);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
    dirLight.position.set(16, 28, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 70;
    const d = 18;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 0.35);
    rimLight.position.set(-18, 10, -14);
    scene.add(rimLight);

    // Architectural base slab + precision isometric grid
    const slabGeo = new THREE.BoxGeometry(27, 0.5, 27);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.9,
      metalness: 0.1,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.35, 0);
    slab.receiveShadow = true;
    scene.add(slab);

    const grid = new THREE.GridHelper(26, 26, 0x2a2a2a, 0x1f1f1f);
    grid.position.y = -0.09;
    scene.add(grid);

    // Build interactive 3D nodes & supply conduits
    const pickables: THREE.Object3D[] = [];
    const nodePosMap = new Map<string, THREE.Vector3>();
    const nodeTopMap = new Map<string, THREE.Vector3>();
    const selectionRings = new Map<string, THREE.Mesh>();
    const animatedRacks: THREE.Mesh[] = [];

    const createBuilding = (spec: NodeSpec) => {
      const group = new THREE.Group();
      group.position.set(spec.pos[0], 0, spec.pos[2]);
      nodePosMap.set(spec.code, new THREE.Vector3(spec.pos[0], 0.5, spec.pos[2]));

      const alertColor =
        spec.alertLevel === "critical"
          ? 0xf43f5e
          : spec.alertLevel === "warning"
            ? 0xf59e0b
            : 0x10b981;

      if (spec.kind === "warehouse") {
        // Central Distribution Warehouse Platform
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(5.6, 0.4, 5.6),
          new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.65, metalness: 0.25 })
        );
        base.position.y = 0.2;
        base.receiveShadow = true;
        base.castShadow = true;
        base.userData = { code: spec.code };
        group.add(base);
        pickables.push(base);

        // Glowing perimeter frame
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(5.65, 0.42, 5.65));
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.65 })
        );
        line.position.y = 0.2;
        group.add(line);

        // 4 Multi-tier Isometric Stock Racks with color-coded crates
        const rackCoords: [number, number][] = [
          [-1.5, -1.3],
          [1.5, -1.3],
          [-1.5, 1.3],
          [1.5, 1.3],
        ];
        rackCoords.forEach(([rx, rz], rIdx) => {
          for (let tier = 0; tier < 3; tier++) {
            const crateColor = rIdx === 1 ? 0x06b6d4 : tier === 2 && rIdx === 2 ? 0xf59e0b : 0x10b981;
            const crate = new THREE.Mesh(
              new THREE.BoxGeometry(1.6, 0.48, 1.1),
              new THREE.MeshStandardMaterial({
                color: 0x272727,
                emissive: crateColor,
                emissiveIntensity: 0.22 + tier * 0.08,
                roughness: 0.4,
                metalness: 0.35,
              })
            );
            crate.position.set(rx, 0.72 + tier * 0.62, rz);
            crate.castShadow = true;
            crate.receiveShadow = true;
            crate.userData = { code: spec.code };
            group.add(crate);
            pickables.push(crate);
            animatedRacks.push(crate);
          }
        });

        // Cold chain translucent glass canopy on bay 2
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 2.3, 1.6),
          new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.14,
            roughness: 0.2,
          })
        );
        canopy.position.set(1.5, 1.55, -1.3);
        group.add(canopy);

        nodeTopMap.set(spec.code, new THREE.Vector3(spec.pos[0], 3.1, spec.pos[2]));
      } else if (spec.kind === "head_office") {
        // Sleek architectural HQ Tower
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 3.6, 2.6),
          new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.35, metalness: 0.5 })
        );
        tower.position.y = 1.8;
        tower.castShadow = true;
        tower.receiveShadow = true;
        tower.userData = { code: spec.code };
        group.add(tower);
        pickables.push(tower);

        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 0.14, 2.7),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x10b981,
            emissiveIntensity: 0.8,
          })
        );
        crown.position.y = 3.65;
        group.add(crown);
        nodeTopMap.set(spec.code, new THREE.Vector3(spec.pos[0], 4.2, spec.pos[2]));
      } else if (spec.kind === "supplier") {
        // Supplier Intake Bay
        const dock = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 1.1, 2.0),
          new THREE.MeshStandardMaterial({
            color: 0x1f1f1f,
            emissive: 0x06b6d4,
            emissiveIntensity: 0.2,
            roughness: 0.5,
          })
        );
        dock.position.y = 0.55;
        dock.castShadow = true;
        dock.userData = { code: spec.code };
        group.add(dock);
        pickables.push(dock);
        nodeTopMap.set(spec.code, new THREE.Vector3(spec.pos[0], 1.7, spec.pos[2]));
      } else {
        // Retail Pharmacy Branch Pod
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 0.25, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 })
        );
        pad.position.y = 0.125;
        pad.receiveShadow = true;
        pad.userData = { code: spec.code };
        group.add(pad);
        pickables.push(pad);

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 1.15, 1.9),
          new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.45, metalness: 0.3 })
        );
        body.position.y = 0.82;
        body.castShadow = true;
        body.receiveShadow = true;
        body.userData = { code: spec.code };
        group.add(body);
        pickables.push(body);

        // Live Stock Value Pillar on top of branch
        const pillarH = Math.max(0.45, Math.min(2.2, spec.inventoryValue / 14000));
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, pillarH, 0.65),
          new THREE.MeshStandardMaterial({
            color: alertColor,
            emissive: alertColor,
            emissiveIntensity: 0.45,
            roughness: 0.3,
          })
        );
        pillar.position.set(0.35, 1.4 + pillarH / 2, 0.35);
        pillar.castShadow = true;
        pillar.userData = { code: spec.code };
        group.add(pillar);
        pickables.push(pillar);

        // Status beacon strip
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(1.96, 0.1, 1.96),
          new THREE.MeshStandardMaterial({
            color: alertColor,
            emissive: alertColor,
            emissiveIntensity: 0.9,
          })
        );
        strip.position.y = 1.42;
        group.add(strip);

        nodeTopMap.set(spec.code, new THREE.Vector3(spec.pos[0], 1.8 + pillarH, spec.pos[2]));
      }

      // Selection halo ring
      const ringRadius = spec.kind === "warehouse" ? 3.8 : 1.9;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(ringRadius - 0.12, ringRadius, 36),
        new THREE.MeshBasicMaterial({
          color: alertColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      group.add(ring);
      selectionRings.set(spec.code, ring);

      scene.add(group);
    };

    nodes.forEach(createBuilding);

    // Draw isometric logistics conduits from CW-01 to every branch and from SUP-SQR to CW-01
    const hubPos = nodePosMap.get("CW-01") ?? new THREE.Vector3(0, 0.5, 0);
    nodes.forEach((n) => {
      if (n.code === "CW-01") return;
      const p = nodePosMap.get(n.code);
      if (!p) return;
      const mid = new THREE.Vector3(
        (hubPos.x + p.x) / 2,
        0.18,
        (hubPos.z + p.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(hubPos.x, 0.12, hubPos.z),
        mid,
        new THREE.Vector3(p.x, 0.12, p.z)
      );
      const pts = curve.getPoints(24);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineColor =
        n.kind === "supplier" ? 0x06b6d4 : n.kind === "head_office" ? 0x52525b : 0x2f3b35;
      const line = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.75 })
      );
      scene.add(line);
    });

    // Active animated stock packets & arrival pulses
    const packets: ActivePacket[] = [];
    const pulses: PulseRing[] = [];

    const spawnPulse = (pos: THREE.Vector3, color: number) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.65, 28),
        new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.15, pos.z);
      scene.add(mesh);
      pulses.push({ mesh, age: 0, maxAge: 1.1 });
    };

    const spawnPacket = (ev: LiveFlowEvent) => {
      if (ev.kind === "sale") {
        const origin = nodePosMap.get(ev.fromCode);
        if (origin) spawnPulse(origin, 0x10b981);
        return;
      }

      const start =
        nodePosMap.get(ev.fromCode) ??
        (ev.kind === "receipt" ? nodePosMap.get("SUP-SQR") : hubPos) ??
        hubPos;
      const end = nodePosMap.get(ev.toCode) ?? hubPos;

      const color = ev.kind === "receipt" ? 0x06b6d4 : 0x34d399;
      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        2.6,
        (start.z + end.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(start.x, 0.9, start.z),
        mid,
        new THREE.Vector3(end.x, 0.9, end.z)
      );

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.42),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.1,
          roughness: 0.2,
        })
      );
      scene.add(mesh);
      packets.push({
        mesh,
        curve,
        progress: 0,
        speed: 0.42,
        targetPos: end.clone(),
        color,
      });
    };

    spawnFlowRef.current = spawnPacket;
    // Seed 2 initial moving packets so scene is immediately alive
    liveFlows.slice(0, 2).forEach(spawnPacket);

    // Pointer interaction (orbit + click selection + wheel zoom)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let dragDistance = 0;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      lastX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dragDistance += Math.abs(dx);
      orbitAngle -= dx * 0.0065;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (dragDistance < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickables, false);
        if (hits.length > 0) {
          const code = hits[0].object.userData?.code as string | undefined;
          if (code && code !== "SUP-SQR") {
            onSelectRef.current(code);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      frustumSize = Math.max(12, Math.min(34, frustumSize + e.deltaY * 0.015));
      const a = (container.clientWidth || 960) / (container.clientHeight || 540);
      camera.left = (-frustumSize * a) / 2;
      camera.right = (frustumSize * a) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      const a = w / h;
      camera.left = (-frustumSize * a) / 2;
      camera.right = (frustumSize * a) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let rafId = 0;
    const clock = new THREE.Clock();
    let frameCount = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      frameCount++;

      // Smooth camera target preset
      if (cameraPresetRef.current === "hub") {
        targetLookAt.set(0, 0.5, 0);
      } else if (cameraPresetRef.current === "branches" && selectedCodeRef.current) {
        const selPos = nodePosMap.get(selectedCodeRef.current);
        if (selPos) targetLookAt.set(selPos.x * 0.65, 0.3, selPos.z * 0.65);
      } else {
        targetLookAt.set(0, 0, 0);
      }
      currentLookAt.lerp(targetLookAt, 0.06);
      updateCameraPosition();

      // Subtle warehouse rack breathing
      animatedRacks.forEach((crate, i) => {
        const mat = crate.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.22 + Math.sin(elapsed * 2 + i * 0.7) * 0.07;
      });

      // Selection halo animation
      selectionRings.forEach((ring, code) => {
        const mat = ring.material as THREE.MeshBasicMaterial;
        const isSel = code === selectedCodeRef.current;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, isSel ? 0.85 : 0.0, 0.12);
        if (isSel) {
          const s = 1 + Math.sin(elapsed * 3.5) * 0.05;
          ring.scale.set(s, s, 1);
        }
      });

      // Advance moving stock packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += dt * p.speed;
        if (p.progress >= 1) {
          spawnPulse(p.targetPos, p.color);
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          packets.splice(i, 1);
        } else {
          const pos = p.curve.getPoint(p.progress);
          p.mesh.position.copy(pos);
          p.mesh.rotation.y += dt * 3;
          p.mesh.rotation.x += dt * 1.5;
        }
      }

      // Advance pulse rings
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pr = pulses[i];
        pr.age += dt;
        const t = pr.age / pr.maxAge;
        if (t >= 1) {
          scene.remove(pr.mesh);
          pr.mesh.geometry.dispose();
          (pr.mesh.material as THREE.Material).dispose();
          pulses.splice(i, 1);
        } else {
          const scale = 1 + t * 4.2;
          pr.mesh.scale.set(scale, scale, 1);
          (pr.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
        }
      }

      renderer.render(scene, camera);

      // Update projected 2D labels every 3 frames for smooth, crisp overlays
      if (frameCount % 3 === 0) {
        const w = container.clientWidth || 960;
        const h = container.clientHeight || 540;
        const nextLabels: ProjectedLabel[] = nodes.map((n) => {
          const top = (nodeTopMap.get(n.code) ?? new THREE.Vector3()).clone();
          top.project(camera);
          return {
            code: n.code,
            name: n.name,
            kind: n.kind,
            x: (top.x * 0.5 + 0.5) * w,
            y: (-top.y * 0.5 + 0.5) * h,
            visible: top.z < 1,
            alertLevel: n.alertLevel,
            inventoryValue: n.inventoryValue,
          };
        });
        setLabels(nextLabels);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  return (
    <div className="relative h-[500px] sm:h-[560px] w-full overflow-hidden rounded-2xl border border-[#272727] bg-[#09090b]">
      {/* Three.js Canvas Mount */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D isometric pharmacy inventory network"
      />

      {/* Projected 2D Crisp Node Labels */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((lbl) => {
          if (!lbl.visible) return null;
          const isSelected = lbl.code === selectedCode;
          return (
            <button
              key={lbl.code}
              type="button"
              onClick={() => lbl.kind !== "supplier" && onSelectCode(lbl.code)}
              style={{
                transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 rounded-lg border px-2 py-1 backdrop-blur-md transition-[border-color,background-color] duration-300 cursor-pointer ${
                isSelected
                  ? "border-[#10b981] bg-[#181818]/95 text-[#f5f5f4]"
                  : "border-[#313131] bg-[#181818]/80 text-[#d6d3d1] hover:border-[#44403c]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  lbl.kind === "supplier"
                    ? "bg-[#06b6d4]"
                    : lbl.alertLevel === "critical"
                      ? "bg-[#f43f5e]"
                      : lbl.alertLevel === "warning"
                        ? "bg-[#f59e0b]"
                        : "bg-[#10b981]"
                }`}
              />
              <span className="font-mono caption-3">{lbl.code}</span>
              {lbl.inventoryValue > 0 && (
                <span className="hidden sm:inline font-mono caption-5 text-[#a8a29e]">
                  {formatCurrency(lbl.inventoryValue).replace(".00", "")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top Left HUD Overlay */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#272727] bg-[#181818]/90 px-3 py-1.5 backdrop-blur-md">
          <Cube size={16} weight="duotone" className="text-[#10b981]" />
          <span className="title-5 text-[#f5f5f4]">Isometric Network Twin</span>
          <Badge variant="emerald" pulse>
            Real Time
          </Badge>
        </div>
      </div>

      {/* Top Right Camera & Stream Controls */}
      <div className="absolute right-3 top-3 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-xl border border-[#272727] bg-[#181818]/90 p-1 backdrop-blur-md">
          {(["overview", "hub", "branches"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCameraPreset(preset)}
              className={`rounded-lg px-2.5 py-1 caption-4 capitalize transition-colors duration-300 cursor-pointer ${
                cameraPreset === preset
                  ? "bg-[#272727] text-[#f5f5f4]"
                  : "text-[#a8a29e] hover:text-[#f5f5f4]"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleSimulation}
          className="bg-[#181818]/90 backdrop-blur-md"
        >
          {simulationRunning ? <Pause size={14} /> : <Play size={14} />}
          <span className="hidden sm:inline">
            {simulationRunning ? "Live Flow" : "Paused"}
          </span>
        </Button>
      </div>

      {/* Bottom Legend HUD */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-[#272727] bg-[#181818]/90 px-3 py-1.5 backdrop-blur-md">
          <span className="flex items-center gap-1.5 caption-5 text-[#d6d3d1]">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Transfer & Healthy Stock
          </span>
          <span className="flex items-center gap-1.5 caption-5 text-[#d6d3d1]">
            <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
            Supplier GRN & Cold Chain
          </span>
          <span className="flex items-center gap-1.5 caption-5 text-[#d6d3d1]">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            Low Stock Alert
          </span>
          <span className="flex items-center gap-1.5 caption-5 text-[#d6d3d1]">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
            Near Expiry / Quarantine
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-xl border border-[#272727] bg-[#181818]/90 px-3 py-1.5 caption-5 text-[#a8a29e] backdrop-blur-md">
          <Crosshair size={14} />
          <span>Drag to rotate, scroll to zoom, click any building to inspect</span>
          <ArrowsOutSimple size={14} />
        </div>
      </div>

      {expiryAlerts.some((e) => e.days_remaining <= 30) && (
        <div className="pointer-events-none absolute bottom-14 right-3 hidden sm:flex items-center gap-1.5 rounded-lg border border-[#f43f5e]/40 bg-[#181818]/95 px-2.5 py-1 caption-4 text-[#fb7185] backdrop-blur-md">
          <WarningCircle size={14} weight="fill" />
          <span>
            {expiryAlerts.filter((e) => e.days_remaining <= 30).length} batch expiring under 30 days
          </span>
        </div>
      )}
    </div>
  );
}

