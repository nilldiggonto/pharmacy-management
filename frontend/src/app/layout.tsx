import type { Metadata } from "next";
import { Geist_Mono, Lexend } from "next/font/google";
import { AppProvider } from "@/context/app-context";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedGrid Command | Isometric Pharmacy Inventory & Operations",
  description:
    "Real time 3D isometric pharmacy inventory, batch FEFO tracking, multi branch transfers, and retail POS control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexend.variable} ${geistMono.variable} dark`}>
      <body className="font-sans bg-[#000000] text-[#f5f5f4] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-[#10b981] focus:bg-[#181818] focus:px-3 focus:py-2 focus:text-[#f5f5f4]"
        >
          Skip to main content
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

