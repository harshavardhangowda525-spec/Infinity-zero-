import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Infinity ZERO",
    short_name: "Infinity ZERO",
    description: "Don't manage your work. Eliminate what slows it down.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#070B16",
    theme_color: "#070B16",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Live Demo", short_name: "Demo", url: "/demo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Analyze Workflow", short_name: "Analyze", url: "/analyze", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Give Feedback", short_name: "Feedback", url: "/feedback", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
