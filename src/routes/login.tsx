import { createFileRoute } from "@tanstack/react-router";
import { MagicAuth } from "@/pages/MagicAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Inloggen bij ROUT — magic link zonder wachtwoord" },
      {
        name: "description",
        content:
          "Log in op je ROUT-profiel met één e-mail. Geen wachtwoord, geen tracking — je link is 15 minuten geldig.",
      },
      { property: "og:title", content: "Inloggen bij ROUT" },
      {
        property: "og:description",
        content: "Log in met een magic link — zonder wachtwoord, zonder tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MagicAuth mode="login" />,
});
