"use client";

import React from "react";
import type { ThumbnailType } from "@/lib/public-catalog";

interface ProductThumbnailProps {
  type: ThumbnailType;
  brand: string;
  strength: string;
  isRx?: boolean;
}

/**
 * Crisp vector studio packshot thumbnails tailored to each pharmaceutical form factor.
 * Renders cleanly at any resolution with white, obsidian, and hot pink (#ff1f7a) styling.
 */
const PHOTO_MAP: Partial<Record<ThumbnailType, string>> = {
  "blister-box": "/products/paracetamol-box.jpg",
  "sachet-pack": "/products/electrolyte-sachets.jpg",
  "effervescent-tube": "/products/wellness-pack.jpg",
  "allergy-pack": "/products/wellness-pack.jpg",
  "insulin-pen": "/products/cold-chain-pen.jpg",
};

export function ProductThumbnail({
  type,
  brand,
  strength,
  isRx = false,
}: ProductThumbnailProps) {
  const accent = isRx ? "#0a0a0a" : "#ff1f7a";
  const softAccent = isRx ? "#f4f4f5" : "#fff0f6";
  const photoSrc = PHOTO_MAP[type];

  if (photoSrc) {
    return (
      <div className="relative h-44 w-full overflow-hidden rounded-xl border border-[#ececec] bg-[#f8f8fa]">
        <img
          src={photoSrc}
          alt={`${brand} ${strength}`}
          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-[#ececec] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
      style={{ backgroundColor: softAccent }}
    >
      {/* Subtle architectural studio grid */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${type}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill={accent} fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${type})`} />
      </svg>

      {/* Studio Pedestal Shadow */}
      <div className="pointer-events-none absolute bottom-5 h-3 w-36 rounded-full bg-[#0a0a0a]/10 blur-sm" />

      {/* Form-factor specific studio packshot */}
      {type === "vitamin-bottle" ? (
        <svg viewBox="0 0 220 150" className="relative z-10 h-36 w-52 drop-shadow-sm">
          {/* Cap */}
          <rect x="86" y="16" width="48" height="16" rx="5" fill="#0a0a0a" />
          <rect x="90" y="32" width="40" height="8" rx="2" fill="#262626" />
          {/* Bottle Body */}
          <rect x="74" y="40" width="72" height="90" rx="14" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />
          {/* Hot pink label band */}
          <rect x="74" y="62" width="72" height="44" fill="#ff1f7a" />
          <text x="110" y="81" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="sans-serif">
            {brand.toUpperCase()}
          </text>
          <text x="110" y="96" textAnchor="middle" fill="#ffe4ef" fontSize="8" fontFamily="monospace">
            {strength}
          </text>
          {/* Floating golden softgels */}
          <ellipse cx="164" cy="118" rx="11" ry="6" transform="rotate(-18 164 118)" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
          <ellipse cx="176" cy="126" rx="10" ry="5.5" transform="rotate(14 176 126)" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5" />
        </svg>
      ) : type === "insulin-pen" ? (
        <svg viewBox="0 0 220 150" className="relative z-10 h-36 w-52 drop-shadow-sm">
          {/* Cold chain medical box behind */}
          <rect x="34" y="28" width="122" height="62" rx="10" fill="#ffffff" stroke="#d4d4d4" strokeWidth="2" />
          <rect x="34" y="28" width="18" height="62" rx="8" fill="#0a0a0a" />
          <text x="64" y="54" fill="#0a0a0a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            {brand}
          </text>
          <text x="64" y="70" fill="#ff1f7a" fontSize="8.5" fontWeight="600" fontFamily="monospace">
            2°C–8°C · {strength}
          </text>
          {/* Sleek Prefilled Injector Pen */}
          <g transform="translate(22 86) rotate(-8)">
            <rect x="18" y="10" width="142" height="18" rx="9" fill="#ffffff" stroke="#0a0a0a" strokeWidth="2" />
            <rect x="128" y="10" width="32" height="18" rx="7" fill="#ff1f7a" />
            <rect x="158" y="14" width="10" height="10" rx="3" fill="#0a0a0a" />
            <rect x="44" y="14" width="38" height="10" rx="4" fill="#fff0f6" stroke="#ff1f7a" strokeWidth="1" />
          </g>
        </svg>
      ) : type === "effervescent-tube" ? (
        <svg viewBox="0 0 220 150" className="relative z-10 h-36 w-52 drop-shadow-sm">
          {/* Tall Cylinder Tube */}
          <rect x="88" y="16" width="44" height="14" rx="4" fill="#ff1f7a" />
          <rect x="84" y="30" width="52" height="102" rx="10" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />
          <rect x="84" y="52" width="52" height="48" fill="#0a0a0a" />
          <circle cx="110" cy="70" r="10" fill="#ff1f7a" />
          <text x="110" y="92" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="700" fontFamily="sans-serif">
            {brand.toUpperCase()}
          </text>
          {/* Chewable tablets */}
          <circle cx="158" cy="118" r="10" fill="#ffffff" stroke="#ff1f7a" strokeWidth="2" />
          <circle cx="172" cy="124" r="9" fill="#fff0f6" stroke="#ff1f7a" strokeWidth="2" />
        </svg>
      ) : type === "sachet-pack" ? (
        <svg viewBox="0 0 220 150" className="relative z-10 h-36 w-52 drop-shadow-sm">
          {/* Back sachet */}
          <rect x="96" y="24" width="70" height="96" rx="8" fill="#fff0f6" stroke="#ff1f7a" strokeWidth="2" transform="rotate(7 131 72)" />
          {/* Front matte foil sachet */}
          <rect x="58" y="28" width="76" height="100" rx="8" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />
          <rect x="58" y="28" width="76" height="22" rx="6" fill="#ff1f7a" />
          <text x="96" y="43" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">
            {brand.toUpperCase()}
          </text>
          <text x="96" y="76" textAnchor="middle" fill="#0a0a0a" fontSize="11" fontWeight="700" fontFamily="sans-serif">
            ORS+
          </text>
          <text x="96" y="94" textAnchor="middle" fill="#737373" fontSize="7.5" fontFamily="monospace">
            WHO FORMULA
          </text>
        </svg>
      ) : (
        /* Pharmaceutical Box + Glossy Blister Strip (Paracetamol / Omeprazole / Allergy / Antibiotic / Cardio) */
        <svg viewBox="0 0 220 150" className="relative z-10 h-36 w-52 drop-shadow-sm">
          {/* Primary Medicine Box */}
          <rect x="28" y="28" width="114" height="86" rx="12" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />
          <rect x="28" y="28" width="114" height="24" rx="10" fill={accent} />
          <text x="40" y="44" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="sans-serif">
            {brand.toUpperCase()}
          </text>
          <text x="40" y="72" fill="#0a0a0a" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            {strength}
          </text>
          <text x="40" y="88" fill="#737373" fontSize="8" fontFamily="monospace">
            {isRx ? "RX VERIFIED" : "OTC RAPID"}
          </text>
          <rect x="40" y="96" width="38" height="4" rx="2" fill={accent} fillOpacity="0.35" />

          {/* Angled Foil Blister Strip with Two-Tone Capsules/Tablets */}
          <g transform="translate(116 44) rotate(12)">
            <rect x="0" y="0" width="66" height="86" rx="9" fill="#f4f4f5" stroke="#d4d4d4" strokeWidth="2" />
            {[16, 36, 56, 72].map((cy, idx) => (
              <g key={cy}>
                <rect x="11" y={cy - 6} width="18" height="10" rx="5" fill={idx % 2 === 0 ? accent : "#ffffff"} stroke="#d4d4d4" strokeWidth="1" />
                <rect x="37" y={cy - 6} width="18" height="10" rx="5" fill={idx % 2 === 1 ? accent : "#ffffff"} stroke="#d4d4d4" strokeWidth="1" />
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
