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
  if (typeof codeData === "string") {
    try {
      return JSON.parse(codeData) as { success: boolean; message?: string; code?: string };
    } catch {
      return null;
    }
  }
  if (typeof codeData === "object" && "success" in (codeData as object)) {
    return codeData as { success: boolean; message?: string; code?: string };
  }
  return null;
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
      throw new Error("Missing environment variables");
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
      throw codeError;
    }

    const payload = parseCodePayload(codeData);
    if (!payload || typeof payload.success !== "boolean") {
      console.error("[send-otp] unexpected RPC payload:", codeData);
      return jsonResponse(
        { success: false, message: "Invalid verification response" },
        500
      );
    }

    if (!payload.success) {
      return jsonResponse({ success: false, message: payload.message ?? "Could not create verification code" });
    }

    const whatsappNumber = phone_number.replace("+", "");

    const baseUrl = whatsappServiceUrl.replace(/\/$/, "");
    const sendUrl = `${baseUrl}/send-otp`;
    const whatsappResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(whatsappServiceToken ? { "Authorization": `Bearer ${whatsappServiceToken}` } : {}),
      },
      body: JSON.stringify({
        phone: whatsappNumber,
        otp: String(payload.code),
      })
    });

    const whatsappData = await whatsappResponse.json().catch(() => ({}));
    console.log("[send-otp] baileys-service response:", {
      ok: whatsappResponse.ok,
      status: whatsappResponse.status,
      to: whatsappNumber,
    });

    if (!whatsappResponse.ok || whatsappData?.success === false) {
      return jsonResponse(
        {
          success: false,
          message: "Failed to send WhatsApp message",
          details: whatsappData
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      message: "OTP sent successfully",
      provider: "baileys-service"
    });

  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ success: false, message }, 500);

  }

});
