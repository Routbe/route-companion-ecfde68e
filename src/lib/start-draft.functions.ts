import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * RPC-laag voor de interactieve builder op `/start`.
 *
 * De eerste twee functies zijn publiek (een bezoeker heeft nog geen account),
 * `claimPendingDraft` loopt na de magic-link login onder auth.
 */

export type StartDraftInput = {
  email: string;
  aliasHandle: string;
  displayName?: string | null;
  bio?: string | null;
  themeId?: string | null;
  avatarUrl?: string | null;
  links?: { url: string; label: string }[];
  wantVcard?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Beschikbaarheidscheck voor de alias — geeft nooit prijs wie hem bezit. */
export const checkStartAlias = createServerFn({ method: "POST" })
  .inputValidator((input: { handle: string }) => ({
    handle: String(input?.handle ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const { isAliasHandleFree } = await import("./alias-profile.server");
    try {
      const result = await isAliasHandleFree(data.handle, null);
      return { available: result.ok, reason: result.reason ?? null };
    } catch (error) {
      console.error("[start] alias check failed:", error instanceof Error ? error.message : error);
      return { available: false, reason: "error" as const };
    }
  });

/** Bewaart het concept 24 uur en stuurt de magic link naar het opgegeven adres. */
export const submitStartDraft = createServerFn({ method: "POST" })
  .inputValidator((input: StartDraftInput) => input)
  .handler(async ({ data }) => {
    const email = String(data?.email ?? "").trim();
    if (email.length < 5 || email.length > 320 || !EMAIL_RE.test(email)) {
      return { ok: false as const, reason: "invalid_email" };
    }
    const { saveDraft, requestStartMagicLink } = await import("./start-draft.server");
    const { originFromRequest } = await import("@/lib/auth/serialize.server");
    try {
      await saveDraft(email, {
        aliasHandle: String(data.aliasHandle ?? ""),
        displayName: data.displayName ?? null,
        bio: data.bio ?? null,
        themeId: data.themeId || "noir",
        avatarUrl: data.avatarUrl ?? null,
        links: Array.isArray(data.links) ? data.links : [],
        wantVcard: data.wantVcard === true,
      });
      const delivered = await requestStartMagicLink(email, originFromRequest());
      return { ok: true as const, delivered, reason: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "save_failed";
      console.error("[start] draft submit failed:", reason);
      return { ok: false as const, reason };
    }
  });

/** Legt een wachtend concept vast op het net ingelogde account. */
export const claimPendingDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { commitDraftForUser } = await import("./start-draft.server");
    try {
      return await commitDraftForUser(context.userId, context.user?.email ?? null);
    } catch (error) {
      console.error("[start] draft claim failed:", error instanceof Error ? error.message : error);
      return { committed: false, handle: null };
    }
  });
