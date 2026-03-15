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
    const ultraMsgToken = Deno.env.get("ULTRAMSG_TOKEN");
    const ultraMsgInstanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID") || "instance164290";

    if (!supabaseUrl || !supabaseServiceKey || !ultraMsgToken) {
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

    const message =
      `رمز التحقق الخاص بك في MauriPlay هو: ${codeData.code}\n\n` +
      `الرمز صالح لمدة 5 دقائق.`;

    const ultraMsgUrl = `https://api.ultramsg.com/${ultraMsgInstanceId}/messages/chat`;

    const whatsappResponse = await fetch(ultraMsgUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: ultraMsgToken,
        to: whatsappNumber,
        body: message
      })
    });

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
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
        message: "OTP sent successfully"
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