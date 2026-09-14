import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bon Panier · Digital Menu",
    short_name: "Bon Panier",
    description: "Bon Panier digital restaurant menu — NFC/QR table ordering.",
    start_url: "/r/bon-panier/t/1",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1c1412",
    theme_color: "#a67066",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
