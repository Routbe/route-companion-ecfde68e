import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink } from "@/lib/auth.functions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimalistische, snelle magic-link pagina voor `/login` en `/register`.
 *
 * Bewuste keuze: geen tabs, geen wachtwoorden, geen providerraster. Wie de
 * volledige tour wil doet `/start`; wie terugkomt is hier in twee tikken klaar.
 */
export function MagicAuth({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const isRegister = mode === "register";
  const valid = EMAIL_RE.test(email.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const result = await requestMagicLink({ data: { email: email.trim() } }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      toast.error("We konden de inloglink niet versturen. Probeer het straks opnieuw.");
      return;
    }
    setSent(true);
  };

  return (
    <AppLayout
      title={isRegister ? "Registreren" : "Inloggen"}
      description={
        isRegister
          ? "Maak je ROUT-account met één e-mail — geen wachtwoord nodig."
          : "Log in met een magic link in je mailbox — geen wachtwoord nodig."
      }
      width="narrow"
    >
      <div className="mx-auto w-full max-w-sm py-10">
        {sent ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-foreground" aria-hidden />
            <h1 className="mt-4 text-lg font-semibold text-foreground">Check je mailbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We stuurden een inloglink naar <span className="font-medium">{email.trim()}</span>. De
              link is 15 minuten geldig.
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-2xl"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Ander e-mailadres gebruiken
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-8">
            <h1 className="text-xl font-semibold text-foreground">
              {isRegister ? "Maak je ROUT-account" : "Welkom terug"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRegister
                ? "Vul je e-mailadres in. Je krijgt direct een link om je account te activeren."
                : "Vul je e-mailadres in. Je krijgt direct een inloglink."}
            </p>

            <div className="mt-6 space-y-2">
              <Label htmlFor="magic-email">E-mailadres</Label>
              <Input
                id="magic-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="jij@voorbeeld.be"
                value={email}
                maxLength={320}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl"
              />
            </div>

            <Button type="submit" disabled={!valid || busy} className="mt-5 w-full rounded-2xl">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden />
              )}
              {isRegister ? "Account activeren" : "Stuur inloglink"}
            </Button>

            <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
              {isRegister ? (
                <p className="text-muted-foreground">
                  Al een account?{" "}
                  <Link to="/login" className="font-medium text-foreground underline">
                    Inloggen
                  </Link>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Nog geen account?{" "}
                  <Link to="/register" className="font-medium text-foreground underline">
                    Registreren
                  </Link>
                </p>
              )}
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                <Link to="/start" className="font-medium text-foreground underline">
                  Bouw eerst je profiel in de tour
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

export default MagicAuth;
