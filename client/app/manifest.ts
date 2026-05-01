import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "My Crew Connections",
    short_name: "Crew",
    description: "A relationship-maintenance PWA for keeping up with the people and groups that matter.",
    start_url: "/dashboard",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f5efe4",
    theme_color: "#d1603d",
    scope: "/",
    categories: ["lifestyle", "productivity"],
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
