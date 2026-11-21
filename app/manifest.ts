import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GigleNode — AI Tools, Ratings & Comparisons",
    short_name: "GigleNode",
    description: "Independent AI directory with real user ratings, model-level comparisons and expert guides.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon.png", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/brand/logo.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
