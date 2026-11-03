import { beforeEach, describe, expect, it } from 'vitest';
import { enqueue, flushQueue, isNetworkError, pendingCount } from './offlineQueue';

beforeEach(() => localStorage.clear());

describe('offline queue', () => {
  it('keeps items per user and sends them in order', async () => {
    enqueue('expense', 'a', { n: 1 }); enqueue('todo', 'a', { n: 2 }); enqueue('expense', 'b', { n: 3 });
    expect(pendingCount('a')).toBe(2);
    const seen: unknown[] = [];
    const r = await flushQueue('a', async i => { seen.push(i.payload); return null; });
    expect(r).toEqual({ sent: 2, dropped: 0 });
    expect(seen).toEqual([{ n: 1 }, { n: 2 }]);
    expect(pendingCount('a')).toBe(0);
    expect(pendingCount('b')).toBe(1);
  });

  it('stops at a network error and keeps the rest', async () => {
    enqueue('expense', 'a', 1); enqueue('expense', 'a', 2);
    const r = await flushQueue('a', async () => ({ message: 'TypeError: Failed to fetch' }));
    expect(r.sent).toBe(0);
    expect(pendingCount('a')).toBe(2);
  });

  it('drops an item that keeps failing for another reason, without blocking the next', async () => {
    enqueue('expense', 'a', 'bad'); enqueue('expense', 'a', 'good');
    const send = async (i: { payload: unknown }) => (i.payload === 'bad' ? { message: 'violates check constraint', status: 400 } : null);
    for (let n = 0; n < 3; n++) await flushQueue('a', send);
    expect(pendingCount('a')).toBe(0);
  });

  it('tells network failures apart from server rejections', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
    expect(isNetworkError({ message: 'duplicate key', status: 409 })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
