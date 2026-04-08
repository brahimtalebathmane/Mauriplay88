import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

interface RequestBody {
  phone_number: string;
}

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // Your own Baileys WhatsApp service (Node) must be deployed somewhere that stays running.
    // Example: https://your-whatsapp-otp-service.onrender.com
    const whatsappServiceUrl = Deno.env.get("WHATSAPP_OTP_SERVICE_URL");
    const whatsappServiceToken = Deno.env.get("WHATSAPP_OTP_SERVICE_TOKEN"); // optional

    if (!supabaseUrl || !supabaseServiceKey || !whatsappServiceUrl) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone_number }: RequestBody = await req.json();

    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, message: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { data: codeData, error: codeError } = await supabase.rpc(
      "create_verification_code",
      { p_phone_number: phone_number }
    );

    if (codeError) {
      throw codeError;
    }

    if (!codeData.success) {
      return new Response(
        JSON.stringify({ success: false, message: codeData.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const whatsappNumber = phone_number.replace("+", "");

    // Send through your Baileys service (it will send: "Your verification code is: 1234")
    const sendUrl = `${whatsappServiceUrl.replace(/\\/$/, "")}/send-otp`;
    const whatsappResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(whatsappServiceToken ? { "Authorization": `Bearer ${whatsappServiceToken}` } : {}),
      },
      body: JSON.stringify({
        phone: whatsappNumber,
        otp: String(codeData.code),
      })
    });

    const whatsappData = await whatsappResponse.json().catch(() => ({}));
    console.log("[send-otp] baileys-service response:", {
      ok: whatsappResponse.ok,
      status: whatsappResponse.status,
      to: whatsappNumber,
    });

    if (!whatsappResponse.ok || whatsappData?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to send WhatsApp message",
          details: whatsappData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        provider: "baileys-service"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Internal server error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  }

});