import { afterEach, expect, it, vi } from 'vitest';
import { loadOceanProgress, saveOceanProgress } from './storage';
afterEach(() => vi.unstubAllGlobals());
it('loads old/absent progress without changing math records', () => {
  const data = new Map([['little-explorer-v1', '{"wins":8}']]);
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  const progress = loadOceanProgress(); expect(progress.highestLevel).toBe(1); expect(progress.learned).toEqual([]);
  saveOceanProgress({ ...progress, wins: 2, learned: ['cat'] });
  expect(loadOceanProgress().wins).toBe(2); expect(data.get('little-explorer-v1')).toBe('{"wins":8}');
});
it('handles damaged and unavailable browser storage', () => {
  for (const value of ['null', 'bad json', '{"wins":-1,"highestLevel":100,"learned":["cat","cat","invalid"],"missed":false}']) {
    vi.stubGlobal('localStorage', { getItem: () => value });
    const result = loadOceanProgress(); expect(result.wins).toBe(0); expect(result.highestLevel).toBeLessThanOrEqual(9); expect(result.learned.length).toBeLessThanOrEqual(1);
  }
  vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  expect(loadOceanProgress().highestLevel).toBe(1); expect(() => saveOceanProgress(loadOceanProgress())).not.toThrow();
});
