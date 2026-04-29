import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Crew Connections",
    short_name: "Crew",
    description: "A relationship-maintenance PWA for keeping up with the people and groups that matter.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5efe4",
    theme_color: "#d1603d",
    scope: "/",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/app-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
