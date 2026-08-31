import { createFileRoute } from "@tanstack/react-router";
import { InteractiveStart } from "@/pages/InteractiveStart";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Bouw je privacy-profiel — ROUT tour in 4 stappen" },
      {
        name: "description",
        content:
          "Kies je privacy-alias, je stijl en je links in vier stappen. Je account maak je pas op het einde: je ontwerp blijft bewaard, ook op een ander toestel.",
      },
      { property: "og:title", content: "Bouw je ROUT-profiel in 4 stappen" },
      {
        property: "og:description",
        content:
          "Claim rout.be/u/jouwalias, kies een thema en zet je links live — zonder account vooraf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InteractiveStart,
});
