/**
 * Edge Function: send OneSignal push notifications.
 * Triggered by the frontend after order/top-up/approval actions.
 * Requires: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY (Supabase secrets).
 */

const allowedOrigins = new Set([
  "https://mauriplay.store",
  "https://www.mauriplay.store",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function buildCorsHeaders(req: Request, forOptions = false): Record<string, string> {
  const requestOrigin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : "https://mauriplay.store";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function buildAdminPayload(type: NotificationType, baseUrl: string, body: RequestBody) {
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
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(req, true),
    });
  }

  const corsHeaders = buildCorsHeaders(req);

  try {
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !apiKey) {
      return new Response(JSON.stringify({ success: false, message: "OneSignal not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const { type, base_url: baseUrl } = body;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isAdmin = type === "new_order_admin" || type === "new_topup_admin";
    let payload: Record<string, unknown>;

    if (isAdmin) {
      payload = buildAdminPayload(type, baseUrl ?? "", body);
    } else {
      const userId = body.user_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing user_id for user notification" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      payload = buildUserPayload(type, userId, baseUrl ?? "", body);
    }

    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "OneSignal API error",
          details: data,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
