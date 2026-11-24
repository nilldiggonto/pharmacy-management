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
  Truck,
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
 * High-resolution geographic [lon, lat] outline of Bangladesh.
 * Projected around Dhaka (90.4125°E, 23.8103°N) into crisp 3D studio coordinates.
 */
const BD_LON_LAT: [number, number][] = [
  [88.42, 26.63], // Tetulia / Panchagarh
  [88.85, 26.45],
  [89.18, 26.25], // Lalmonirhat
  [89.62, 26.18], // Kurigram north
  [89.84, 25.88],
  [89.86, 25.52], // Jamalpur / Sherpur
  [90.28, 25.25], // Mymensingh north
  [90.78, 25.18], // Netrokona
  [91.32, 25.19], // Sunamganj
  [91.95, 25.18], // Sylhet north
  [92.42, 25.02], // Zakiganj east
  [92.36, 24.68], // Moulvibazar
  [92.05, 24.38],
  [91.68, 24.18], // Habiganj
  [91.34, 23.86], // Brahmanbaria / Akhaura
  [91.28, 23.46], // Comilla east
  [91.42, 23.06], // Feni
  [91.68, 22.92], // Khagrachhari
  [92.18, 23.22], // Sajek / Rangamati north
  [92.45, 22.75], // Rangamati east
  [92.55, 22.12], // Bandarban
  [92.64, 21.52], // Thanchi
  [92.38, 21.18], // Naikhongchhari
  [92.32, 20.74], // Teknaf tip
  [92.16, 20.92], // Cox's Bazar coast
  [91.94, 21.44], // Cox's Bazar
  [91.85, 21.92], // Maheshkhali / Kutubdia
  [91.74, 22.34], // Chattogram port
  [91.56, 22.72], // Sitakunda
  [91.36, 22.86], // Sandwip channel
  [91.08, 22.64], // Noakhali coast
  [90.82, 22.46], // Lakshmipur / Meghna estuary
  [90.66, 22.12], // Bhola island
  [90.42, 21.92], // Patuakhali
  [90.12, 21.84], // Kuakata / Barguna
  [89.84, 21.96], // Pirojpur / Bagerhat
  [89.56, 21.74], // Sundarbans east
  [89.22, 21.68], // Sundarbans central
  [89.02, 21.88], // Sundarbans west
  [88.96, 22.36], // Satkhira
  [88.88, 22.94], // Jessore / Benapole
  [88.74, 23.36], // Jhenaidah
  [88.62, 23.72], // Chuadanga / Meherpur
  [88.76, 24.08], // Kushtia
  [88.58, 24.36], // Rajshahi
  [88.14, 24.64], // Chapainawabganj
  [88.34, 25.02], // Naogaon
  [88.64, 25.28], // Joypurhat
  [88.42, 25.64], // Dinajpur west
  [88.16, 25.98], // Thakurgaon
  [88.24, 26.32], // Panchagarh west
];

function projectLonLat(lon: number, lat: number): [number, number] {
  const centerLon = 90.4125;
  const centerLat = 23.8103;
  const scale = 5.4;
  const x = (lon - centerLon) * scale * 0.92;
  const y = (lat - centerLat) * scale;
  return [x, y];
}

// Major rivers of Bangladesh in [lon, lat]
const RIVERS_LON_LAT: [number, number][][] = [
  // Jamuna -> Padma -> Lower Meghna
  [
    [89.76, 25.82],
    [89.72, 25.25],
    [89.76, 24.62],
    [89.78, 23.86],
    [90.12, 23.54],
    [90.52, 23.24],
    [90.72, 22.72],
    [90.84, 22.25],
  ],
  // Ganges / Padma from Rajshahi
  [
    [88.32, 24.48],
    [88.85, 24.18],
    [89.38, 23.92],
    [89.78, 23.86],
  ],
  // Upper Meghna from Sylhet
  [
    [91.86, 24.92],
    [91.32, 24.48],
    [90.96, 24.06],
    [90.72, 23.62],
    [90.52, 23.24],
  ],
];

const DIVISION_MARKERS: { name: string; lonLat: [number, number] }[] = [
  { name: "Rangpur", lonLat: [89.25, 25.74] },
  { name: "Rajshahi", lonLat: [88.6, 24.37] },
  { name: "Mymensingh", lonLat: [90.4, 24.75] },
  { name: "Sylhet", lonLat: [91.87, 24.89] },
  { name: "Khulna", lonLat: [89.54, 22.84] },
  { name: "Barisal", lonLat: [90.35, 22.7] },
  { name: "Chattogram", lonLat: [91.78, 22.35] },
];

/**
 * Geographic relative layout of Uttara Main Hub & 7 Dhaka branches on the Dhaka Metro plateau.
 */
const DHAKA_COORDS: Record<string, { pos: [number, number]; shortName: string }> = {
  "WH-01": { pos: [0.0, -2.55], shortName: "Uttara Main Hub" },
  "CW-01": { pos: [0.0, -2.55], shortName: "Uttara Main Hub" },
  "HQ-01": { pos: [-1.55, -2.75], shortName: "Head Office" },
  "BR-01": { pos: [1.75, -2.0], shortName: "Uttara Flagship" },
  "BR-02": { pos: [-2.6, -0.7], shortName: "Mirpur 10" },
  "BR-03": { pos: [2.7, -0.35], shortName: "Bashundhara R/A" },
  "BR-04": { pos: [1.7, 0.95], shortName: "Gulshan 2" },
  "BR-05": { pos: [0.0, 0.2], shortName: "Banani Rd 11" },
  "BR-06": { pos: [-2.15, 1.65], shortName: "Dhanmondi 27" },
  "BR-07": { pos: [1.6, 2.5], shortName: "Motijheel" },
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
}

function buildDeliveryVan(colorHex: number): THREE.Group {
  const van = new THREE.Group();
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
  );
  cargo.position.y = 0.09;
  van.add(cargo);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.23, 0.05, 0.35),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  stripe.position.y = 0.09;
  van.add(stripe);

  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 0.14),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 })
  );
  cab.position.set(0, 0.07, 0.22);
  van.add(cab);

  return van;
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
  const onSelectRef = useRef(onSelectCode);
  const focusedTransferIdRef = useRef(focusedTransferId);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);
  useEffect(() => {
    onSelectRef.current = onSelectCode;
  }, [onSelectCode]);
  useEffect(() => {
    focusedTransferIdRef.current = focusedTransferId;
  }, [focusedTransferId]);

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

  const inTransitCount = useMemo(
    () =>
      activeTransfers.filter((t) => t.status === "dispatched" || t.status === "in_transit").length,
    [activeTransfers]
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
    scene.background = new THREE.Color("#F4EDE2");
    scene.fog = new THREE.Fog("#F4EDE2", 34, 72);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 200);
    camera.position.set(0, 11.4, 11.2);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Realistic studio daylight + warm rim
    scene.add(new THREE.HemisphereLight(0xfffcf7, 0xd9cbb8, 1.05));

    const sun = new THREE.DirectionalLight(0xfff7ec, 1.05);
    sun.position.set(14, 26, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    const dShadow = 22;
    sun.shadow.camera.left = -dShadow;
    sun.shadow.camera.right = dShadow;
    sun.shadow.camera.top = dShadow;
    sun.shadow.camera.bottom = -dShadow;
    scene.add(sun);

    // Subtle Bay of Bengal / topographic water plane
    const waterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({
        color: 0xe9e1d4,
        roughness: 0.72,
        metalness: 0.05,
      })
    );
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = -0.05;
    waterPlane.receiveShadow = true;
    scene.add(waterPlane);

    const grid = new THREE.GridHelper(64, 48, 0xd8cab6, 0xe7dfd2);
    grid.position.y = -0.02;
    scene.add(grid);

    // 1. High-resolution Smooth 3D Bangladesh Landmass (Spline-smoothed ~160 border segments)
    const rawPts = BD_LON_LAT.map(([lon, lat]) => {
      const [px, py] = projectLonLat(lon, lat);
      return new THREE.Vector2(px, py);
    });
    const spline = new THREE.SplineCurve(rawPts);
    const smoothPts = spline.getPoints(160);
    const bdShape = new THREE.Shape(smoothPts);

    const bdGeo = new THREE.ExtrudeGeometry(bdShape, {
      depth: 0.58,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 4,
      curveSegments: 24,
    });
    bdGeo.rotateX(-Math.PI / 2);

    const bdMesh = new THREE.Mesh(
      bdGeo,
      new THREE.MeshStandardMaterial({
        color: 0xfffdf9,
        roughness: 0.48,
        metalness: 0.02,
      })
    );
    bdMesh.receiveShadow = true;
    bdMesh.castShadow = true;
    scene.add(bdMesh);

    // Crisp crimson national border contour on top face
    const borderPts3D = smoothPts.map((p) => new THREE.Vector3(p.x, 0.73, -p.y));
    borderPts3D.push(borderPts3D[0]);
    const borderLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(borderPts3D),
      new THREE.LineBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.55 })
    );
    scene.add(borderLine);

    // 2. Realistic Major Rivers (Jamuna, Padma, Meghna) carved across Bangladesh surface
    RIVERS_LON_LAT.forEach((riverCoords) => {
      const rPts = riverCoords.map(([lon, lat]) => {
        const [rx, ry] = projectLonLat(lon, lat);
        return new THREE.Vector3(rx, 0.74, -ry);
      });
      const rCurve = new THREE.CatmullRomCurve3(rPts);
      const rMesh = new THREE.Mesh(
        new THREE.TubeGeometry(rCurve, 48, 0.085, 8, false),
        new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.62,
        })
      );
      rMesh.scale.y = 0.25;
      scene.add(rMesh);
    });

    // 3. Elevated Dhaka Metropolitan Region Plateau
    const dhakaGroup = new THREE.Group();
    dhakaGroup.position.set(0, 0.72, 0);
    scene.add(dhakaGroup);

    // Two-tier architectural plinth for Dhaka
    const dhakaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.25, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0xf7eee3, roughness: 0.45 })
    );
    dhakaBase.position.y = 0.11;
    dhakaBase.receiveShadow = true;
    dhakaBase.castShadow = true;
    dhakaGroup.add(dhakaBase);

    const dhakaTop = new THREE.Mesh(
      new THREE.CylinderGeometry(3.85, 3.92, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0xfffaf5, roughness: 0.35 })
    );
    dhakaTop.position.y = 0.28;
    dhakaTop.receiveShadow = true;
    dhakaGroup.add(dhakaTop);

    const dhakaRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.88, 0.045, 16, 72),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.3 })
    );
    dhakaRim.rotation.x = Math.PI / 2;
    dhakaRim.position.y = 0.35;
    dhakaGroup.add(dhakaRim);

    // Subtle Dhaka urban road rings & arterials
    [1.6, 2.85].forEach((r) => {
      const roadRing = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.02, r + 0.02, 64),
        new THREE.MeshBasicMaterial({ color: 0xe7d9c6, side: THREE.DoubleSide })
      );
      roadRing.rotation.x = -Math.PI / 2;
      roadRing.position.y = 0.345;
      dhakaGroup.add(roadRing);
    });

    // 4. Architectural Pharmacy & Warehouse Buildings
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
      nodeGroup.position.set(bx, 0.35, bz);
      dhakaGroup.add(nodeGroup);

      if (isHub) {
        // Multi-bay Uttara Main Hub Logistics Warehouse
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.72, 0.86),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.32, metalness: 0.12 })
        );
        hall.position.y = 0.36;
        hall.castShadow = true;
        hall.receiveShadow = true;
        hall.userData = { code: loc.code };
        nodeGroup.add(hall);
        pickables.push(hall);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(1.22, 0.12, 0.92),
          new THREE.MeshStandardMaterial({ color: 0xfffdf9, roughness: 0.25 })
        );
        roof.position.y = 0.76;
        roof.castShadow = true;
        roof.userData = { code: loc.code };
        nodeGroup.add(roof);
        pickables.push(roof);

        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.48, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25 })
        );
        tower.position.set(0, 1.02, 0);
        tower.castShadow = true;
        tower.userData = { code: loc.code };
        nodeGroup.add(tower);
        pickables.push(tower);

        pinTopMap.set(loc.code, new THREE.Vector3(bx, 2.05, bz));
      } else {
        // Modern Architectural Dhaka Branch Pharmacy
        const plinth = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.12, 0.72),
          new THREE.MeshStandardMaterial({ color: 0xe7ddd0, roughness: 0.5 })
        );
        plinth.position.y = 0.06;
        plinth.receiveShadow = true;
        nodeGroup.add(plinth);

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.56, 0.46, 0.56),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 })
        );
        body.position.y = 0.35;
        body.castShadow = true;
        body.receiveShadow = true;
        body.userData = { code: loc.code };
        nodeGroup.add(body);
        pickables.push(body);

        const trimColor = hasExpiry ? 0xdc2626 : hasLow ? 0xd97706 : 0x059669;
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.09, 0.6),
          new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.25 })
        );
        crown.position.y = 0.62;
        crown.castShadow = true;
        crown.userData = { code: loc.code };
        nodeGroup.add(crown);
        pickables.push(crown);

        pinTopMap.set(loc.code, new THREE.Vector3(bx, 1.45, bz));
      }

      // Selection halo ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(isHub ? 0.72 : 0.44, isHub ? 0.84 : 0.54, 36),
        new THREE.MeshBasicMaterial({
          color: isHub ? 0xb91c1c : hasLow ? 0xd97706 : 0x059669,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.28,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      nodeGroup.add(ring);
      nodeRings.set(loc.code, ring);
    });

    // 5. Real-Data Transfer Routes:
    //    - ONLY `dispatched` / `in_transit` shipments animate a live 3D delivery van!
    //    - `submitted` / `approved` / `under_investigation` render calm static route arcs (no fake motion).
    const movingVans: { mesh: THREE.Group; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];

    activeTransfers.forEach((trf, idx) => {
      const fromLoc = locById.get(trf.from_location_id);
      const toLoc = locById.get(trf.to_location_id);
      const fromCfg = fromLoc ? DHAKA_COORDS[fromLoc.code] : null;
      const toCfg = toLoc ? DHAKA_COORDS[toLoc.code] : null;
      if (!fromCfg || !toCfg) return;

      const start = new THREE.Vector3(fromCfg.pos[0], 0.92, fromCfg.pos[1]);
      const end = new THREE.Vector3(toCfg.pos[0], 0.75, toCfg.pos[1]);
      const mid = new THREE.Vector3(
        (start.x + end.x) * 0.5,
        2.05 + (idx % 3) * 0.28,
        (start.z + end.z) * 0.5
      );
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

      const isDispatched = trf.status === "dispatched" || trf.status === "in_transit";
      const isShortage = trf.status === "under_investigation";

      if (isDispatched) {
        // Solid emerald active delivery route + live 3D cold-chain van moving along it!
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 36, 0.045, 8, false),
          new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.85 })
        );
        dhakaGroup.add(tube);

        const van = buildDeliveryVan(0x059669);
        dhakaGroup.add(van);
        movingVans.push({
          mesh: van,
          curve,
          t: (idx * 0.35) % 1,
          speed: 0.22,
        });
      } else {
        // Calm static dashed route preview for requested / approved / under_investigation (no fake animation!)
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
        const dashedLine = new THREE.Line(
          lineGeo,
          new THREE.LineDashedMaterial({
            color: isShortage ? 0xdc2626 : 0xd97706,
            dashSize: 0.16,
            gapSize: 0.12,
            transparent: true,
            opacity: 0.65,
          })
        );
        dashedLine.computeLineDistances();
        dhakaGroup.add(dashedLine);
      }
    });

    // Pointer orbit, wheel zoom & click raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let orbitAzimuth = 0.22;
    let zoomFactor = 1.0;
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
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomFactor = THREE.MathUtils.clamp(zoomFactor + e.deltaY * 0.0008, 0.72, 1.55);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
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
    const currentLook = new THREE.Vector3(0, 0.75, 0);

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      frame++;

      const baseRadius = viewModeRef.current === "dhaka" ? 10.6 : 29.0;
      const baseHeight = viewModeRef.current === "dhaka" ? 9.2 : 24.5;
      const radius = baseRadius * zoomFactor;
      const heightY = baseHeight * zoomFactor;
      const desiredCam = new THREE.Vector3(
        Math.sin(orbitAzimuth) * radius,
        heightY,
        Math.cos(orbitAzimuth) * radius
      );
      currentCamPos.lerp(desiredCam, 0.07);
      camera.position.copy(currentCamPos);

      const selCfg = selectedCodeRef.current ? DHAKA_COORDS[selectedCodeRef.current] : null;
      const desiredLook =
        viewModeRef.current === "dhaka" && selCfg
          ? new THREE.Vector3(selCfg.pos[0] * 0.2, 0.85, selCfg.pos[1] * 0.2)
          : new THREE.Vector3(0, 0.55, 0);
      currentLook.lerp(desiredLook, 0.07);
      camera.lookAt(currentLook);

      nodeRings.forEach((ring, code) => {
        const isSel = code === selectedCodeRef.current;
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, isSel ? 0.95 : 0.25, 0.1);
        const s = isSel ? 1.18 + Math.sin(elapsed * 3.5) * 0.08 : 1;
        ring.scale.set(s, s, 1);
      });

      // Only move real in-transit dispatched vans, oriented along their delivery arc
      movingVans.forEach((v) => {
        v.t = (v.t + dt * v.speed) % 1;
        const pos = v.curve.getPoint(v.t);
        const ahead = v.curve.getPoint(Math.min(0.999, v.t + 0.02));
        v.mesh.position.copy(pos);
        v.mesh.lookAt(ahead.x, ahead.y + 0.72, ahead.z);
      });

      renderer.render(scene, camera);

      if (frame % 2 === 0) {
        const w = container.clientWidth || 880;
        const h = container.clientHeight || 520;
        const nextPins: ProjectedPin[] = visibleLocs.map((loc) => {
          const v = (pinTopMap.get(loc.code) ?? new THREE.Vector3()).clone();
          v.y += 0.72;
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
          };
        });
        setPins(nextPins);

        if (viewModeRef.current === "bangladesh") {
          setDivPins(
            DIVISION_MARKERS.map((d) => {
              const [px, py] = projectLonLat(d.lonLat[0], d.lonLat[1]);
              const v = new THREE.Vector3(px, 0.95, -py);
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
      renderer.domElement.removeEventListener("wheel", onWheel);
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
      {/* 3D High-Detail Bangladesh & Dhaka Map */}
      <div className="relative h-[470px] sm:h-[520px] w-full overflow-hidden bg-[#F4EDE2]">
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D Bangladesh and Dhaka live pharmacy operations map"
        />

        {/* Projected Division Labels in National View */}
        {viewMode === "bangladesh" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {divPins.map((d) =>
              d.visible ? (
                <span
                  key={d.name}
                  style={{ transform: `translate3d(${d.x}px, ${d.y}px, 0) translate(-50%, -50%)` }}
                  className="absolute left-0 top-0 rounded-full border border-[#E2D6C5] bg-[#FFFDF9]/90 px-2.5 py-0.5 caption-5 font-medium text-[#57534E] shadow-xs"
                >
                  {d.name}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Projected Dhaka Branch & Hub Pins */}
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

        {/* Top Left Badge */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 shadow-xs backdrop-blur-md">
          <Compass size={16} weight="duotone" className="text-[#B91C1C]" />
          <span className="caption-3 font-semibold text-[#1C1917]">
            Bangladesh · Dhaka Operations Map
          </span>
          {inTransitCount > 0 ? (
            <Badge variant="emerald" pulse>
              <Truck size={12} weight="fill" />
              {inTransitCount} in transit
            </Badge>
          ) : (
            <Badge variant="neutral">No active vans</Badge>
          )}
        </div>

        {/* Top Right View Switcher */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 p-1 shadow-xs backdrop-blur-md">
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

        {/* Bottom Legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 caption-5 text-[#57534E] shadow-xs backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
              Dispatched Van (Live)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-[#D97706]" />
              Requested / Approved (Waiting)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B91C1C]" />
              Uttara Main Hub
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-1.5 caption-5 text-[#57534E] shadow-xs">
            <Crosshair size={13} />
            <span>Drag to rotate · Scroll to zoom · Click branch</span>
          </div>
        </div>
      </div>

      {/* Live Inter-Branch Order & Transfer Command Strip */}
      <div className="border-t border-[#E7DDD0] bg-[#FAF6F0]/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ArrowsLeftRight size={16} weight="bold" className="text-[#B91C1C]" />
            <h3 className="title-4 text-[#1C1917]">
              Active Branch Requests & Dispatches ({activeTransfers.length})
            </h3>
          </div>
          <span className="caption-5 text-[#57534E]">
            Delivery vans only move when a transfer is dispatched; confirm receipt to complete delivery
          </span>
        </div>

        {activeTransfers.length === 0 ? (
          <p className="rounded-xl border border-[#E7DDD0] bg-[#FFFDF9] px-4 py-3 caption-4 text-[#78716C]">
            No pending requests or in-transit dispatches right now.
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
              const isFocused = focusedTransferId === trf.id;

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
                  <div>
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
                        {isDispatched ? "In Transit (Van Live)" : trf.status.replace(/_/g, " ")}
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
                        <span>Dispatch Van from Hub</span>
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
