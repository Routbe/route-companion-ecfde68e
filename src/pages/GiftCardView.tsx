import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@/lib/router-compat";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { GiftCard3D } from "@/components/gift/GiftCard3D";
import { getPublicGiftCard } from "@/lib/gift-cards.functions";
import { euro, type PublicGiftCard } from "@/lib/gift-cards";
import { useI18n } from "@/lib/i18n";

/** Publieke 3D-weergave van één cadeaubon via de link in de mail. */
export default function GiftCardView() {
  const { t } = useI18n();
  const params = useParams({ strict: false }) as { code?: string };
  const load = useServerFn(getPublicGiftCard);
  const [card, setCard] = useState<PublicGiftCard | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const code = params.code;
    if (!code) {
      setState("missing");
      return;
    }
    load({ data: { code } })
      .then((result) => {
        if (result.card) {
          setCard(result.card);
          setState("ready");
        } else {
          setState("missing");
        }
      })
      .catch(() => setState("missing"));
  }, [params.code, load]);

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
        {state === "loading" ? <p className="text-muted-foreground">{t("giftcardview.loading")}</p> : null}

        {state === "missing" ? (
          <>
            <h1 className="text-2xl font-semibold">{t("giftcardview.missing.title")}</h1>
            <p className="mt-3 text-muted-foreground">
              {t("giftcardview.missing.body")}
            </p>
            <Button asChild className="mt-6">
              <Link to="/gift">{t("giftcardview.missing.cta")}</Link>
            </Button>
          </>
        ) : null}

        {state === "ready" && card ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("giftcardview.ready.title", { amount: euro(card.amountCents) })}
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              {card.redeemed
                ? t("giftcardview.ready.redeemed")
                : t("giftcardview.ready.notRedeemed")}
            </p>
            <div className="mt-10 flex justify-center">
              <GiftCard3D
                code={card.code}
                amountCents={card.amountCents}
                design={card.design}
                recipientName={card.recipientName}
                purchaserName={card.purchaserName}
                message={card.message}
                revealCode={!card.redeemed}
              />
            </div>
            {card.fulfilmentStatus !== "not_applicable" ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("giftcardview.fulfilment.label")}{" "}
                <strong className="text-foreground">
                  {card.fulfilmentStatus === "pending_print"
                    ? t("giftcardview.fulfilment.pendingPrint")
                    : card.fulfilmentStatus === "packaged"
                      ? t("giftcardview.fulfilment.packaged")
                      : t("giftcardview.fulfilment.shipped")}
                </strong>
                {card.trackingCode ? ` · ${t("giftcardview.fulfilment.tracking", { code: card.trackingCode })}` : ""}
              </p>
            ) : null}
            {!card.redeemed ? (
              <Button asChild className="mt-8">
                <Link to="/dashboard">{t("giftcardview.useCta")}</Link>
              </Button>
            ) : null}

          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
