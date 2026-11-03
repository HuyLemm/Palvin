import { describe, expect, it } from 'vitest';
import { readableText } from './color';

describe('readableText', () => {
  it('uses white on dark/saturated colours', () => {
    expect(readableText('#24803C')).toBe('white');
    expect(readableText('#7A5CCB')).toBe('white');
    expect(readableText('#8B6FD4')).toBe('#241318'); // white on this violet is only ~4.0:1
  });
  it('uses dark text on light colours', () => {
    expect(readableText('#FADCE4')).toBe('#241318');
    expect(readableText('#C48A52')).toBe('#241318'); // white on this tan was only 2.96:1
  });
  it('falls back to white for non-hex values (CSS variables)', () => {
    expect(readableText('var(--sakura-deep)')).toBe('white');
  });
});
