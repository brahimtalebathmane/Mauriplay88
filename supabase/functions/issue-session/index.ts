/**
 * Issues a Supabase-compatible JWT after verify_user_login so Realtime postgres_changes
 * respect RLS (user_id / is_admin claims). Requires SUPABASE_JWT_SECRET in Edge Function secrets
 * (same value as Project Settings → API → JWT Secret).
 */
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow =
    origin.includes("localhost") || origin.includes("127.0.0.1")
      ? origin
      : "https://mauriplay.store";
  return {
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: { ...headers, "Access-Control-Max-Age": "86400" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    console.error("[issue-session] Missing SUPABASE_JWT_SECRET / JWT_SECRET");
    return new Response(
      JSON.stringify({ success: false, message: "Server misconfiguration" }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    phone_number?: string;
    pin?: string;
  };
  const phone = body.phone_number?.trim();
  const pin = body.pin;
  if (!phone || !pin) {
    return new Response(JSON.stringify({ success: false, message: "phone_number and pin required" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ success: false, message: "Server misconfiguration" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: loginData, error: rpcError } = await supabase.rpc("verify_user_login", {
    p_phone_number: phone,
    p_pin: pin,
  });

  if (rpcError) {
    console.error("[issue-session] verify_user_login error", rpcError);
    return new Response(JSON.stringify({ success: false, message: "Login verification failed" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const ld = loginData as { success?: boolean; user?: { id?: string } } | null;
  if (!ld?.success || !ld.user?.id) {
    return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const userId = ld.user.id as string;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const exp = getNumericDate(60 * 60 * 24 * 7);
  const payload: Record<string, unknown> = {
    aud: "authenticated",
    exp,
    iat: getNumericDate(0),
    iss: "supabase",
    sub: userId,
    role: "authenticated",
    user_id: userId,
  };

  const access_token = await create({ alg: "HS256", typ: "JWT" }, payload, key);
  const refresh_token = access_token;

  return new Response(JSON.stringify({ success: true, access_token, refresh_token }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
