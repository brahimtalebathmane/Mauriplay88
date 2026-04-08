/**
 * Edge Function: send OneSignal push notifications.
 * Triggered by the frontend after order/top-up/approval actions.
 * Requires: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY (Supabase secrets).
 */

const allowedOrigins = new Set([
  "https://mauriplay.store",
  "https://www.mauriplay.store",
]);

/** Match issue-session: allow local dev and preview deploys so functions.invoke does not fail CORS. */
function resolveCorsOrigin(requestOrigin: string): string {
  if (allowedOrigins.has(requestOrigin)) return requestOrigin;
  if (
    requestOrigin.includes("localhost") ||
    requestOrigin.includes("127.0.0.1") ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(requestOrigin)
  ) {
    return requestOrigin;
  }
  return "https://mauriplay.store";
}

function buildCorsHeaders(req: Request, forOptions = false): Record<string, string> {
  const requestOrigin = req.headers.get("Origin") ?? "";
  const allowOrigin = resolveCorsOrigin(requestOrigin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (forOptions) {
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

type NotificationType =
  | "new_order_admin"
  | "new_topup_admin"
  | "purchase_success_user"
  | "topup_approved_user"
  | "order_approved_user"
  | "wallet_activated_user";

interface RequestBody {
  type: NotificationType;
  base_url?: string;
  order_id?: string;
  topup_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
}

const ONESIGNAL_API = "https://api.onesignal.com/notifications";

function oneSignalHasMeaningfulErrors(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const e = (data as Record<string, unknown>).errors;
  if (e == null) return false;
  if (Array.isArray(e)) {
    return e.some((item) => {
      if (item == null) return false;
      if (typeof item === "string") return item.length > 0;
      if (typeof item === "object") return Object.keys(item as object).length > 0;
      return true;
    });
  }
  if (typeof e === "object") return Object.keys(e as object).length > 0;
  return true;
}

/**
 * HTTP 200 with empty id: no message created — usually unknown external_id or no opted-in push.
 * OneSignal may return `invalid_aliases` alone or alongside other error keys with empty values
 * (e.g. `invalid_player_ids: []`). Treat those as "no eligible recipient", not a hard failure.
 */
function oneSignalIndicatesNoEligiblePush(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const errors = (data as Record<string, unknown>).errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return false;
  const errObj = errors as Record<string, unknown>;
  if (!("invalid_aliases" in errObj)) return false;
  for (const key of Object.keys(errObj)) {
    if (key === "invalid_aliases") continue;
    const v = errObj[key];
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    return false;
  }
  return true;
}

function oneSignalErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const errors = o.errors;
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const msg = (first as Record<string, unknown>).message ?? (first as Record<string, unknown>).text;
      if (typeof msg === "string") return msg;
    }
  }
  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    const inv = (errors as Record<string, unknown>).invalid_aliases;
    if (inv && typeof inv === "object" && inv !== null && "external_id" in inv) {
      const ids = (inv as { external_id?: unknown }).external_id;
      if (Array.isArray(ids)) {
        return `invalid_aliases.external_id: ${ids.join(", ")} (user not in OneSignal or no opted-in Web Push)`;
      }
    }
    try {
      const s = JSON.stringify(errors);
      if (s !== "{}") return s.length > 500 ? `${s.slice(0, 500)}…` : s;
    } catch {
      /* ignore */
    }
  }
  if (typeof o.message === "string") return o.message;
  return null;
}

function normalizeNotificationId(data: unknown): string | null {
  const raw = (data as { id?: unknown })?.id;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

function buildAdminPayload(type: NotificationType, baseUrl: string) {
  const base = (baseUrl || "").replace(/\/$/, "");
  let heading_ar = "MauriPlay";
  let content_ar = "إشعار جديد";
  let url = `${base}/admin/orders`;

  if (type === "new_order_admin") {
    heading_ar = "طلب جديد";
    content_ar = "تم استلام طلب شراء جديد. راجع الطلبات.";
    url = `${base}/admin/orders`;
  } else if (type === "new_topup_admin") {
    heading_ar = "طلب شحن محفظة";
    content_ar = "طلب شحن محفظة جديد بانتظار المراجعة.";
    url = `${base}/admin/wallet-topups`;
  }

  return {
    app_id: Deno.env.get("ONESIGNAL_APP_ID")!,
    target_channel: "push",
    filters: [{ field: "tag", key: "role", relation: "=", value: "admin" }],
    headings: { ar: heading_ar, en: heading_ar },
    contents: { ar: content_ar, en: content_ar },
    url,
    data: { url },
  };
}

function buildUserPayload(
  type: NotificationType,
  userId: string,
  baseUrl: string,
  body: RequestBody
) {
  const base = (baseUrl || "").replace(/\/$/, "");
  let heading_ar = "MauriPlay";
  let content_ar = "إشعار";
  let url = `${base}/`;

  switch (type) {
    case "purchase_success_user":
      heading_ar = "تمت عملية الشراء";
      content_ar = body.product_name
        ? `تم شراء ${body.product_name} بنجاح من المحفظة.`
        : "تمت عملية الشراء من المحفظة بنجاح.";
      url = body.order_id ? `${base}/wallet-purchase-success?order=${body.order_id}` : `${base}/my-purchases`;
      break;
    case "topup_approved_user":
      heading_ar = "تمت الموافقة على الشحن";
      content_ar =
        body.amount != null
          ? `تمت الموافقة على شحن محفظتك بمبلغ ${body.amount} MRU.`
          : "تمت الموافقة على طلب شحن المحفظة.";
      url = `${base}/wallet`;
      break;
    case "order_approved_user":
      heading_ar = "تمت الموافقة على الطلب";
      content_ar = "تمت الموافقة على طلب الشراء. راجع مشترياتك.";
      url = `${base}/my-purchases`;
      break;
    case "wallet_activated_user":
      heading_ar = "تم تفعيل المحفظة";
      content_ar = "تم تفعيل محفظتك. يمكنك الآن الشراء باستخدام المحفظة.";
      url = `${base}/wallet`;
      break;
    default:
      break;
  }

  return {
    app_id: Deno.env.get("ONESIGNAL_APP_ID")!,
    target_channel: "push",
    include_aliases: { external_id: [userId] },
    headings: { ar: heading_ar, en: heading_ar },
    contents: { ar: content_ar, en: content_ar },
    url,
    data: { url },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: buildCorsHeaders(req, true),
    });
  }

  const corsHeaders = buildCorsHeaders(req);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !apiKey) {
      console.error("[send-notification] Missing OneSignal secrets", {
        hasAppId: Boolean(appId),
        hasApiKey: Boolean(apiKey),
      });
      return new Response(JSON.stringify({ success: false, message: "OneSignal not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<RequestBody>;
    const { type, base_url: baseUrl } = body;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing type" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isAdmin = type === "new_order_admin" || type === "new_topup_admin";
    let payload: Record<string, unknown>;

    if (isAdmin) {
      payload = buildAdminPayload(type, baseUrl ?? "");
    } else {
      const userId = body.user_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing user_id for user notification" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      payload = buildUserPayload(type, userId, baseUrl ?? "", body as RequestBody);
    }

    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const requestId = res.headers.get("x-request-id") ?? res.headers.get("x-onesignal-request-id") ?? null;
    const rawText = await res.text().catch(() => "");
    const data = (() => {
      try {
        return rawText ? JSON.parse(rawText) : {};
      } catch {
        return { raw: rawText };
      }
    })();

    if (!res.ok) {
      console.error("[send-notification] OneSignal API error", {
        status: res.status,
        requestId,
        details: data,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message: oneSignalErrorMessage(data) ?? "OneSignal API error",
          status: res.status,
          request_id: requestId,
          details: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // HTTP 200: OneSignal may omit id when no message was created (no push subscriptions for target).
    // See: https://documentation.onesignal.com/reference/create-notification — "If no id is returned..."
    const id = normalizeNotificationId(data);

    if (id) {
      return new Response(JSON.stringify({ success: true, id, status: res.status, request_id: requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // invalid_aliases (+ optional empty error slots): no opted-in push for this external_id — not worth retrying.
    if (oneSignalIndicatesNoEligiblePush(data)) {
      console.warn("[send-notification] invalid_aliases (no eligible subscription)", { requestId, details: data });
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "external_id_invalid_or_no_push_subscription",
          status: res.status,
          request_id: requestId,
          details: data,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const meaningfulErrors = oneSignalHasMeaningfulErrors(data);

    if (meaningfulErrors) {
      console.error("[send-notification] OneSignal returned errors in body", { requestId, details: data });
      return new Response(
        JSON.stringify({
          success: false,
          message: oneSignalErrorMessage(data) ?? "OneSignal rejected notification",
          status: res.status,
          request_id: requestId,
          details: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        reason: "no_push_recipients",
        status: res.status,
        request_id: requestId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[send-notification] Unhandled error", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
