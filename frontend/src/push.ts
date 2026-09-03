import { supabase } from './lib/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

// PushManager wants the VAPID key as a raw Uint8Array, not the base64url
// string it's generated/stored as everywhere else.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function getPushPermissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

// Requests permission (if not already decided) and stores the resulting
// subscription for this device against the given profile — called from a
// deliberate user action (a Settings toggle), never automatically, since a
// silent permission prompt on load gets auto-denied by most browsers anyway.
export async function subscribeToPush(profileId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Push notifications are not supported on this browser.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Notification permission was not granted.' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  }, { onConflict: 'endpoint' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
