/**
 * Calls the send-notification Edge Function like the web app (anon key + JWT-style invoke).
 * Does not expose secrets; uses the same env as Vite (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 *
 * Usage (Node 20+):
 *   node --env-file=.env scripts/test-send-notification.mjs <user_uuid>
 *
 * Or set env in the shell, then:
 *   node scripts/test-send-notification.mjs <user_uuid>
 */

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const userId = process.argv[2];
const baseUrl = process.env.TEST_BASE_URL || 'https://mauriplay.store';

if (!url || !key || !userId) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or user UUID argument.');
  console.error('Example: node --env-file=.env scripts/test-send-notification.mjs <uuid>');
  process.exit(1);
}

const endpoint = `${url.replace(/\/$/, '')}/functions/v1/send-notification`;
const body = {
  type: 'order_approved_user',
  user_id: userId,
  base_url: baseUrl,
};

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    apikey: key,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = text;
}

console.log('HTTP', res.status);
console.log(JSON.stringify(parsed, null, 2));

if (!res.ok || (parsed && typeof parsed === 'object' && parsed.success === false)) {
  process.exit(1);
}
