import type { Metadata } from "next";
import { Geist_Mono, Lexend } from "next/font/google";
import { AppProvider } from "@/context/app-context";
import { PublicCartProvider } from "@/context/public-cart-context";
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
  title: "MedGrid Pharmacy | Dhaka 8 Branch Network & Verified Medicine Care",
  description:
    "Eight retail pharmacy branches across Dhaka connected to one temperature controlled central warehouse with complete batch traceability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexend.variable} ${geistMono.variable}`}>
      <body className="font-sans bg-[#ffffff] text-[#0a0a0a] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-[#ff1f7a] focus:bg-[#ffffff] focus:px-3 focus:py-2 focus:text-[#0a0a0a]"
        >
          Skip to main content
        </a>
        <AppProvider>
          <PublicCartProvider>{children}</PublicCartProvider>
        </AppProvider>
      </body>
    </html>
  );
}
