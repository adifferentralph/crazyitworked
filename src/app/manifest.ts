import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fafaf9",
    description: siteConfig.description,
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/app-icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/app-icon-512.png",
        type: "image/png",
      },
    ],
    id: "/",
    name: siteConfig.name,
    orientation: "any",
    scope: "/",
    short_name: "22 Parts",
    start_url: "/",
    theme_color: "#e30613",
  };
}
