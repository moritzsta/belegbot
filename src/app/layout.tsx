import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaInstaller } from "@/components/PwaInstaller";

export const metadata: Metadata = {
  title: "BelegBot",
  description: "Beleg- und Ausgaben-Erfassung",
  // PWA: Manifest + Icon-Familie (siehe scripts/generate-pwa-icons.mjs).
  // iOS liest kein Manifest, sondern apple-touch-icon und appleWebApp direkt.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "BelegBot" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Inhalt bis unter die System-Leisten, Abstand via env(safe-area-inset-*)
  viewportFit: "cover",
  themeColor: "#0D0F14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="root">{children}</div>
        <PwaInstaller />
      </body>
    </html>
  );
}
