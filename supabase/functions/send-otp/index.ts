import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  phone_number: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ultraMsgToken = Deno.env.get('ULTRAMSG_TOKEN');
    const ultraMsgInstanceId = Deno.env.get('ULTRAMSG_INSTANCE_ID') || 'instance164290';

    console.log('send-otp: Environment check', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      hasToken: !!ultraMsgToken,
      instanceId: ultraMsgInstanceId,
    });

    if (!supabaseUrl || !supabaseServiceKey || !ultraMsgToken) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone_number }: RequestBody = await req.json();
    console.log('send-otp: Request for phone:', phone_number);

    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('send-otp: Calling create_verification_code RPC');
    const { data: codeData, error: codeError } = await supabase.rpc(
      'create_verification_code',
      { p_phone_number: phone_number }
    );

    if (codeError) {
      console.error('send-otp: RPC Error:', codeError);
      throw codeError;
    }

    console.log('send-otp: RPC Response:', { success: codeData?.success, hasCode: !!codeData?.code });

    if (!codeData.success) {
      return new Response(
        JSON.stringify({ success: false, message: codeData.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const whatsappNumber = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    const message = `رمز التحقق الخاص بك في MauriPlay هو: ${codeData.code}\n\nالرمز صالح لمدة 5 دقائق.`;

    const ultraMsgUrl = `https://api.ultramsg.com/${ultraMsgInstanceId}/messages/chat`;
    console.log('send-otp: Sending WhatsApp to:', whatsappNumber);

    const ultraMsgBody = {
      token: ultraMsgToken,
      to: whatsappNumber,
      body: message,
    };

    const whatsappResponse = await fetch(ultraMsgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ultraMsgBody),
    });

    const whatsappData = await whatsappResponse.json();
    console.log('send-otp: WhatsApp response:', { ok: whatsappResponse.ok, data: whatsappData });

    if (!whatsappResponse.ok) {
      console.error('send-otp: UltraMsg API error:', whatsappData);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to send WhatsApp message',
          details: whatsappData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('send-otp: Success!');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('send-otp: Catch error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
