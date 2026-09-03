// PALVIN — send-push edge function
//
// Sends a real Web Push notification (shows up even with the app fully
// closed) to every device a given profile has subscribed on. Called
// server-to-server from a Postgres trigger via pg_net — see
// push_new_chat_message() in migrations/0066_push_notifications.sql — never
// invoked directly from the browser, so it's protected by a shared secret
// header instead of a Supabase user JWT.
//
// Deploy with (from backend/supabase):
//   npx supabase functions deploy send-push --no-verify-jwt --project-ref qxzordcbytsogzvndmas
//   npx supabase secrets set --project-ref qxzordcbytsogzvndmas \
//     VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... INTERNAL_PUSH_SECRET=... \
//     VAPID_SUBJECT=mailto:you@example.com

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
const INTERNAL_SECRET = Deno.env.get('INTERNAL_PUSH_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!INTERNAL_SECRET || req.headers.get('x-internal-secret') !== INTERNAL_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { profileId?: string; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { profileId, title, body, url } = payload;
  if (!profileId) return new Response('Missing profileId', { status: 400 });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', profileId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!subs || subs.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const notificationPayload = JSON.stringify({
    title: title ?? 'Palvin',
    body: body ?? '',
    url: url ?? '/',
  });

  let sent = 0;
  const staleIds: string[] = [];
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notificationPayload
      );
      sent++;
    } catch (err) {
      // 404/410 means the browser unsubscribed or the subscription expired —
      // clean it up so future messages don't keep retrying a dead endpoint.
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) staleIds.push(sub.id);
    }
  }));

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }

  return new Response(JSON.stringify({ sent, removed: staleIds.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
