// Tiny write queue for the two things people add on the go: expenses and to-dos.
// When there is no connection the item is kept on this device and sent later, so the
// form never ends in an error. Everything else still needs a connection.
export type QueueKind = 'expense' | 'todo';
export interface QueueItem { id: string; kind: QueueKind; userId: string; payload: unknown; attempts: number }

const KEY = 'palvin:offline-queue:v1';
const MAX_ATTEMPTS = 3;
const listeners = new Set<() => void>();

const read = (): QueueItem[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (items: QueueItem[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked: nothing to do */ }
  listeners.forEach(l => l());
};

export const pendingItems = (userId?: string) => read().filter(i => !userId || i.userId === userId);
export const pendingCount = (userId?: string) => pendingItems(userId).length;
export const subscribeQueue = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function enqueue(kind: QueueKind, userId: string, payload: unknown) {
  write([...read(), { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, kind, userId, payload, attempts: 0 }]);
}

/** A request that never reached the server (no connection, DNS, timeout) — worth retrying later. */
export const isNetworkError = (err: { message?: string; status?: number } | null | undefined) =>
  !!err && (!err.status || err.status === 0) && /fetch|network|failed|timeout|offline/i.test(err.message ?? '');

export const shouldQueue = (err?: { message?: string; status?: number } | null) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) || isNetworkError(err);

let flushing = false;
/**
 * Sends queued items in order. `send` returns null on success, or the error. Items that fail
 * for a network reason stay (and stop the run); other failures are retried up to 3 times and
 * then dropped, so one bad item can never block the rest. Returns how many were sent.
 */
export async function flushQueue(
  userId: string,
  send: (item: QueueItem) => Promise<{ message?: string; status?: number } | null>,
): Promise<{ sent: number; dropped: number }> {
  if (flushing) return { sent: 0, dropped: 0 };
  flushing = true;
  let sent = 0; let dropped = 0;
  try {
    for (const item of read().filter(i => i.userId === userId)) {
      const err = await send(item);
      if (!err) { write(read().filter(i => i.id !== item.id)); sent++; continue; }
      if (isNetworkError(err)) break;
      if (item.attempts + 1 >= MAX_ATTEMPTS) { write(read().filter(i => i.id !== item.id)); dropped++; }
      else write(read().map(i => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i)));
    }
  } finally { flushing = false; }
  return { sent, dropped };
}
