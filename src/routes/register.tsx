import { createFileRoute } from "@tanstack/react-router";
import { MagicAuth } from "@/pages/MagicAuth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Registreren bij ROUT — je eigen privacy-alias" },
      {
        name: "description",
        content:
          "Maak je gratis ROUT-account met één e-mailadres. Claim je privacy-alias rout.be/u/naam99 en houd je data in eigen hand.",
      },
      { property: "og:title", content: "Registreren bij ROUT" },
      {
        property: "og:description",
        content: "Claim je gratis privacy-alias op rout.be — één e-mail, geen wachtwoord.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MagicAuth mode="register" />,
});
