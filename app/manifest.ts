import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nourish Lens",
    short_name: "Nourish Lens",
    description: "Track nutrition and save recipes from anywhere.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#16794d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    share_target: {
      action: "/app/recipes/import",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
