"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MedicineVisualProps {
  sku?: string;
  name?: string;
  category?: string;
  dosageForm?: string | null;
  requiresPrescription?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getPhotoForMedicine(sku = "", name = "", category = ""): string | null {
  const key = `${sku} ${name} ${category}`.toLowerCase();
  if (key.includes("napa") || key.includes("paracetamol") || key.includes("pain")) {
    return "/products/paracetamol-box.jpg";
  }
  if (key.includes("ors") || key.includes("saline") || key.includes("hydration")) {
    return "/products/electrolyte-sachets.jpg";
  }
  if (key.includes("insulin") || key.includes("cold chain") || key.includes("glargine")) {
    return "/products/cold-chain-pen.jpg";
  }
  if (key.includes("vit") || key.includes("d-rise") || key.includes("alatrol") || key.includes("cetirizine")) {
    return "/products/wellness-pack.jpg";
  }
  return null;
}

function getVisualType(sku = "", name = "", category = "", dosageForm = ""): string {
  const key = `${sku} ${name} ${category} ${dosageForm ?? ""}`.toLowerCase();
  if (key.includes("mask") || key.includes("surgical")) return "mask";
  if (key.includes("bpm") || key.includes("monitor") || key.includes("diagnostic")) return "monitor";
  if (key.includes("insulin") || key.includes("pen") || key.includes("cold")) return "pen";
  if (key.includes("ors") || key.includes("sachet")) return "sachet";
  if (key.includes("capsule") || key.includes("seclo") || key.includes("moxacil") || key.includes("amox")) return "capsule";
  if (key.includes("cardio") || key.includes("losartan") || key.includes("angilock")) return "cardio";
  if (key.includes("respiratory") || key.includes("monas") || key.includes("montelukast")) return "respiratory";
  return "tablet";
}

export function MedicineVisual({
  sku = "",
  name = "",
  category = "",
  dosageForm = null,
  requiresPrescription = false,
  size = "md",
  className,
}: MedicineVisualProps) {
  const photo = getPhotoForMedicine(sku, name, category);
  const vtype = getVisualType(sku, name, category, dosageForm ?? "");
  const dims =
    size === "sm"
      ? "h-10 w-10 rounded-lg"
      : size === "lg"
        ? "h-28 w-full rounded-xl"
        : "h-14 w-14 rounded-xl";

  if (photo) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-[#E7DDD0] bg-[#FAF6F0]",
          dims,
          className
        )}
      >
        <img
          src={photo}
          alt={name || sku}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {size === "lg" && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-xs",
              requiresPrescription
                ? "bg-[#1C1917]/85 text-[#FFFDF9]"
                : "bg-[#B91C1C]/90 text-[#FFFDF9]"
            )}
          >
            {requiresPrescription ? "Rx Only" : "OTC"}
          </span>
        )}
      </div>
    );
  }

  const accent = requiresPrescription ? "#991B1B" : "#B91C1C";
  const softBg = requiresPrescription ? "#FEF2F2" : "#FAF6F0";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-[#E7DDD0]",
        dims,
        className
      )}
      style={{ backgroundColor: softBg }}
    >
      {vtype === "mask" ? (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <path d="M16 18 C28 14, 52 14, 64 18 L62 42 C50 46, 30 46, 18 42 Z" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="2.5" />
          <line x1="22" y1="25" x2="58" y2="25" stroke="#FECACA" strokeWidth="2" />
          <line x1="22" y1="31" x2="58" y2="31" stroke="#FECACA" strokeWidth="2" />
          <line x1="22" y1="37" x2="58" y2="37" stroke="#FECACA" strokeWidth="2" />
          <path d="M16 20 C6 20, 6 40, 18 40" fill="none" stroke="#991B1B" strokeWidth="2" />
          <path d="M64 20 C74 20, 74 40, 62 40" fill="none" stroke="#991B1B" strokeWidth="2" />
        </svg>
      ) : vtype === "monitor" ? (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <rect x="18" y="10" width="44" height="40" rx="8" fill="#FFFFFF" stroke="#1C1917" strokeWidth="2.5" />
          <rect x="24" y="16" width="32" height="18" rx="4" fill="#FEF2F2" stroke="#FECACA" strokeWidth="1.5" />
          <path d="M27 26 L33 26 L36 20 L40 30 L43 24 L47 26 L53 26" fill="none" stroke="#B91C1C" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="42" r="4" fill="#B91C1C" />
        </svg>
      ) : vtype === "capsule" ? (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <g transform="rotate(-24 40 30)">
            <rect x="16" y="20" width="48" height="20" rx="10" fill="#FFFFFF" stroke="#1C1917" strokeWidth="2.2" />
            <path d="M40 20 L54 20 A10 10 0 0 1 54 40 L40 40 Z" fill={accent} />
            <line x1="40" y1="20" x2="40" y2="40" stroke="#1C1917" strokeWidth="2" />
          </g>
        </svg>
      ) : vtype === "cardio" ? (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <rect x="14" y="12" width="52" height="36" rx="8" fill="#FFFFFF" stroke="#E7DDD0" strokeWidth="2" />
          <path
            d="M40 41 C40 41, 25 32, 25 23 A7 7 0 0 1 40 21 A7 7 0 0 1 55 23 C55 32, 40 41, 40 41 Z"
            fill="#B91C1C"
          />
          <path d="M31 28 L37 28 L39 23 L42 32 L44 28 L49 28" fill="none" stroke="#FFFDF9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : vtype === "respiratory" ? (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <rect x="20" y="10" width="40" height="40" rx="8" fill="#FFFFFF" stroke="#DDD2C2" strokeWidth="2" />
          <circle cx="32" cy="24" r="5" fill="#B91C1C" />
          <circle cx="48" cy="24" r="5" fill="#FECACA" stroke="#B91C1C" strokeWidth="1.5" />
          <circle cx="32" cy="38" r="5" fill="#FECACA" stroke="#B91C1C" strokeWidth="1.5" />
          <circle cx="48" cy="38" r="5" fill="#B91C1C" />
        </svg>
      ) : (
        <svg viewBox="0 0 80 60" className="h-[80%] w-[80%]">
          <rect x="14" y="12" width="52" height="36" rx="8" fill="#FFFFFF" stroke="#DDD2C2" strokeWidth="2" />
          <rect x="14" y="12" width="52" height="12" rx="6" fill={accent} />
          <circle cx="28" cy="36" r="5" fill="#FEF2F2" stroke={accent} strokeWidth="1.8" />
          <circle cx="42" cy="36" r="5" fill="#FEF2F2" stroke={accent} strokeWidth="1.8" />
          <circle cx="56" cy="36" r="5" fill={accent} />
        </svg>
      )}
    </div>
  );
}
