import { RouteErrorFallback, RoutePendingSkeleton } from "@/components/RouteFallbacks";
import { createFileRoute } from "@tanstack/react-router";
import { canonicalLink, canonicalMeta, socialImageMeta } from "@/lib/site";
import { LegalActionBar } from "@/components/LegalActionBar";
import { LegalPage } from "@/components/LegalPage";
import { LegalChips, type LegalChip } from "@/components/LegalChips";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";



function numbered(n: string, text: string) {
  return (
    <h2 className="font-serif text-lg font-semibold text-foreground">
      <span className="mr-2 font-mono text-xs text-muted-foreground">{n}.</span>
      {text}
    </h2>
  );
}

const sectionWrapper = "mb-6 border-b border-border/40 pb-6 scroll-mt-24";
const bodyText = "text-sm leading-relaxed text-foreground/80";
const listClass = "space-y-2 pl-4 text-sm leading-relaxed text-foreground/80 [&>li]:list-disc";
const strong = "font-medium text-foreground";

const mailLink = (
  <a
    href="mailto:contact@rout.be"
    className="font-mono text-xs text-primary underline-offset-4 hover:underline"
  >
    contact@rout.be
  </a>
);

function TermsPage() {
  const { t } = useI18n();

  const chips: LegalChip[] = [
    { id: "scope", label: t("terms.chip.scope") },
    { id: "handles", label: t("terms.chip.handles") },
    { id: "payments", label: t("terms.chip.payments") },
    { id: "fair-use", label: t("terms.chip.fairUse") },
    { id: "print-warning", label: t("terms.chip.printWarning") },
    { id: "domains", label: t("terms.chip.domains") },
    { id: "api", label: t("terms.chip.api") },
    { id: "sla", label: t("terms.chip.sla") },
    { id: "licensing", label: t("terms.chip.licensing") },
    { id: "jurisdiction", label: t("terms.chip.jurisdiction") },
  ];

  return (
    <LegalPage
      title={t("terms.title")}
      updated={t("terms.updated")}
      card
      quickJump={<LegalChips chips={chips} />}
      footer={
        <LegalActionBar
          links={[
            { to: "/privacy", label: t("terms.footer.privacy") },
            { to: "/sovereignty", label: t("terms.footer.sovereignty") },
            { to: "/contact", label: t("terms.footer.contact") },
          ]}
        />
      }
      sections={[
        {
          id: "scope",
          heading: numbered("01", t("terms.section.scope.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <>
              <p className={bodyText}>{t("terms.section.scope.intro")}</p>
              <ul className={listClass}>
                <li>
                  <span className={strong}>{t("terms.section.scope.staticLabel")}</span>{" "}
                  {t("terms.section.scope.staticBody")}
                </li>
                <li>
                  <span className={strong}>{t("terms.section.scope.dynamicLabel")}</span>{" "}
                  {t("terms.section.scope.dynamicBody1")}{" "}
                  <span className="font-mono text-xs">rout.be</span>
                  {t("terms.section.scope.dynamicBody2")}
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "handles",
          heading: numbered("02", t("terms.section.handles.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>{t("terms.section.handles.fcfs")}</li>
              <li>{t("terms.section.handles.reclaim")}</li>
              <li>
                <span className={strong}>{t("terms.section.handles.trademarkLabel")}</span>{" "}
                {t("terms.section.handles.trademarkBody1")} {mailLink}
                {t("terms.section.handles.trademarkBody2")}
              </li>
              <li>{t("terms.section.handles.verificationFee")}</li>
            </ul>
          ),
        },
        {
          id: "domains",
          heading: numbered("03", t("terms.section.domains.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>{t("terms.section.domains.link")}</li>
              <li>{t("terms.section.domains.responsibility")}</li>
            </ul>
          ),
        },
        {
          id: "api",
          heading: numbered("04", t("terms.section.api.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>{t("terms.section.api.access")}</li>
              <li>{t("terms.section.api.rateLimits")}</li>
            </ul>
          ),
        },
        {
          id: "payments",
          heading: numbered("05", t("terms.section.payments.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>{t("terms.section.payments.processing")}</li>
              <li>
                {t("terms.section.payments.nonRefundable1")}{" "}
                <span className={strong}>{t("terms.section.payments.nonRefundableLabel")}</span>.
              </li>
              <li>
                <span className={strong}>{t("terms.section.payments.withdrawalLabel")}</span>{" "}
                {t("terms.section.payments.withdrawalBody1")}{" "}
                <span className={strong}>{t("terms.section.payments.withdrawalLoseLabel")}</span>
                {t("terms.section.payments.withdrawalBody2")} {mailLink}
                {t("terms.section.payments.withdrawalBody3")}
              </li>
            </ul>
          ),
        },
        {
          id: "fair-use",
          heading: numbered("06", t("terms.section.fairUse.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <>
              <p className={bodyText}>{t("terms.section.fairUse.intro")}</p>
              <ul className={listClass}>
                <li>{t("terms.section.fairUse.phishing")}</li>
                <li>{t("terms.section.fairUse.spam")}</li>
                <li>{t("terms.section.fairUse.loadTesting")}</li>
              </ul>
              <p className={bodyText}>
                <span className={strong}>{t("terms.section.fairUse.enforcementLabel")}</span>{" "}
                {t("terms.section.fairUse.enforcementBody")}
              </p>
              <ul className={listClass}>
                <li>
                  <span className={strong}>{t("terms.section.fairUse.noticeLabel")}</span>{" "}
                  {t("terms.section.fairUse.noticeBody1")}{" "}
                  <a
                    href="mailto:abuse@rout.id"
                    className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                  >
                    abuse@rout.id
                  </a>
                  . {t("terms.section.fairUse.noticeBody2")}
                </li>
                <li>
                  <span className={strong}>{t("terms.section.fairUse.reasonsLabel")}</span>{" "}
                  {t("terms.section.fairUse.reasonsBody")}
                </li>
                <li>
                  <span className={strong}>{t("terms.section.fairUse.appealLabel")}</span>{" "}
                  {t("terms.section.fairUse.appealBody1")} {mailLink}
                  {t("terms.section.fairUse.appealBody2")}
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "print-warning",
          heading: (
            <h2 className="flex items-start gap-2 font-serif text-lg font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="mr-2 font-mono text-xs text-muted-foreground">07.</span>
                {t("terms.section.printWarning.heading")}
              </span>
            </h2>
          ),
          wrapperClassName:
            "my-6 scroll-mt-24 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-6 dark:bg-amber-500/10",
          body: (
            <ul className={listClass}>
              <li>{t("terms.section.printWarning.liability")}</li>
              <li>
                <span className={strong}>{t("terms.section.printWarning.scanLabel")}</span>{" "}
                {t("terms.section.printWarning.scanBody1")}{" "}
                <em>{t("terms.section.printWarning.before")}</em>
                {t("terms.section.printWarning.scanBody2")}
              </li>
              <li>
                <span className={strong}>{t("terms.section.printWarning.indemnityLabel")}</span>{" "}
                {t("terms.section.printWarning.indemnityBody")}
              </li>
            </ul>
          ),
        },
        {
          id: "sla",
          heading: numbered("08", t("terms.section.sla.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>
                {t("terms.section.sla.asIs1")}{" "}
                <span className={strong}>{t("terms.section.sla.asIsLabel")}</span>{" "}
                {t("terms.section.sla.asIs2")}{" "}
                <span className={strong}>{t("terms.section.sla.asAvailableLabel")}</span>{" "}
                {t("terms.section.sla.asIs3")}
              </li>
              <li>{t("terms.section.sla.noGuarantee")}</li>
            </ul>
          ),
        },
        {
          id: "licensing",
          heading: numbered("09", t("terms.section.licensing.heading")),
          wrapperClassName: sectionWrapper,
          body: (
            <ul className={listClass}>
              <li>
                {t("terms.section.licensing.openSource1")}{" "}
                <span className={strong}>{t("terms.section.licensing.agplLabel")}</span>,{" "}
                {t("terms.section.licensing.openSource2")}
              </li>
              <li>
                {t("terms.section.licensing.hosted1")}{" "}
                <a
                  href="https://rout.be"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  rout.be
                </a>
                . {t("terms.section.licensing.hosted2")}
              </li>
            </ul>
          ),
        },
        {
          id: "creator",
          heading: numbered("10", t("terms.section.creator.heading")),
          wrapperClassName: sectionWrapper,
          body: <p className={bodyText}>{t("terms.section.creator.body")}</p>,
        },
        {
          id: "jurisdiction",
          heading: numbered("11", t("terms.section.jurisdiction.heading")),
          wrapperClassName: sectionWrapper,
          body: <p className={bodyText}>{t("terms.section.jurisdiction.body")}</p>,
        },
        {
          id: "contact",
          heading: numbered("12", t("terms.section.contact.heading")),
          wrapperClassName: "scroll-mt-24",
          body: (
            <p className={bodyText}>
              {t("terms.section.contact.body")} {mailLink}.
            </p>
          ),
        },
      ]}
    />
  );
}

export default TermsPage;
