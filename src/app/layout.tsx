import type { Metadata, Viewport } from "next";
// Fonts are bundled from npm so the app builds and runs with no internet access.
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";
import { PwaProvider } from "@/components/layout/pwa";


export const metadata: Metadata = {
  title: { default: "Infinity ZERO — AI Friction Elimination Engine", template: "%s · Infinity ZERO" },
  description: "Don't manage your work. Eliminate what slows it down. A validation prototype by Infinity Web & Apps.",
  applicationName: "Infinity ZERO",
  appleWebApp: { capable: true, title: "Infinity ZERO", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = { themeColor: "#070B16", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </PwaProvider>
      </body>
    </html>
  );
}
