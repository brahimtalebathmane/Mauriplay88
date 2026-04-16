import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function parseCodePayload(codeData: unknown): { success: boolean; message?: string; code?: string } | null {
  if (codeData == null) return null;
  let o: Record<string, unknown>;
  if (typeof codeData === "string") {
    try {
      o = JSON.parse(codeData) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof codeData === "object") {
    o = codeData as Record<string, unknown>;
  } else {
    return null;
  }
  const s = o.success;
  if (s === undefined) return null;
  const success = s === true || s === "true";
  return {
    success,
    message: typeof o.message === "string" ? o.message : undefined,
    code: o.code != null ? String(o.code) : undefined,
  };
}

function whatsappUserMessage(status: number, data: Record<string, unknown>): string {
  const upstream =
    (typeof data.error === "string" && data.error) ||
    (typeof data.message === "string" && data.message) ||
    "";

  if (status === 503 || /not connected/i.test(upstream)) {
    return "خدمة واتساب غير متصلة على الخادم. يرجى إعادة ربط الحساب من لوحة خدمة OTP أو المحاولة لاحقاً.";
  }
  if (status === 400 && upstream) {
    return upstream;
  }
  if (upstream) {
    return `فشل إرسال واتساب: ${upstream}`;
  }
  return "فشل إرسال الرمز عبر واتساب. تحقق من خدمة OTP أو حاول لاحقاً.";
}

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const whatsappServiceUrl = Deno.env.get("WHATSAPP_OTP_SERVICE_URL");
    const whatsappServiceToken = Deno.env.get("WHATSAPP_OTP_SERVICE_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey || !whatsappServiceUrl) {
      return jsonResponse({
        success: false,
        message: "إعدادات الخادم ناقصة (Supabase / WhatsApp).",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const raw = await req.json().catch(() => ({})) as Record<string, unknown>;
    const phone_number = String(raw.phone_number ?? raw.phoneNumber ?? "").trim();

    if (!phone_number) {
      return jsonResponse({ success: false, message: "Phone number is required" });
    }

    const { data: codeData, error: codeError } = await supabase.rpc(
      "create_verification_code",
      { p_phone_number: phone_number }
    );

    if (codeError) {
      console.error("[send-otp] RPC create_verification_code:", codeError);
      return jsonResponse({
        success: false,
        message: codeError.message || "تعذر إنشاء رمز التحقق",
      });
    }

    const payload = parseCodePayload(codeData);
    if (!payload) {
      console.error("[send-otp] unexpected RPC payload:", codeData);
      return jsonResponse({
        success: false,
        message: "استجابة غير متوقعة من قاعدة البيانات",
      });
    }

    if (!payload.success) {
      return jsonResponse({
        success: false,
        message: payload.message ?? "Could not create verification code",
      });
    }

    const whatsappNumber = phone_number.replace("+", "");

    const baseUrl = whatsappServiceUrl.replace(/\/$/, "");
    const sendUrl = `${baseUrl}/send-otp`;

    let whatsappResponse: Response;
    try {
      whatsappResponse = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(whatsappServiceToken ? { "Authorization": `Bearer ${whatsappServiceToken}` } : {}),
        },
        body: JSON.stringify({
          phone: whatsappNumber,
          otp: String(payload.code),
        }),
      });
    } catch (fetchErr) {
      console.error("[send-otp] fetch WhatsApp service failed:", fetchErr);
      return jsonResponse({
        success: false,
        message:
          "تعذر الاتصال بخدمة واتساب. تحقق من عنوان WHATSAPP_OTP_SERVICE_URL وأن الخدمة تعمل.",
      });
    }

    const whatsappData = (await whatsappResponse.json().catch(() => ({}))) as Record<string, unknown>;
    console.log("[send-otp] baileys-service response:", {
      ok: whatsappResponse.ok,
      status: whatsappResponse.status,
      to: whatsappNumber,
    });

    if (!whatsappResponse.ok || whatsappData.success === false) {
      const msg = whatsappUserMessage(whatsappResponse.status, whatsappData);
      return jsonResponse({
        success: false,
        message: msg,
        details: { status: whatsappResponse.status, body: whatsappData },
      });
    }

    return jsonResponse({
      success: true,
      message: "OTP sent successfully",
      provider: "baileys-service"
    });

  } catch (error: unknown) {

    console.error("[send-otp] unhandled:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ success: false, message });

  }

});
