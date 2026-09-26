import { WORDS } from './engine';
export type OceanProgress = { wins: number; stars: number; correct: number; highestLevel: number; learned: string[]; missed: string[] };
const KEY = 'little-explorer-ocean-v1';
const number = (n: unknown, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
const ids = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === 'string' && WORDS.some(w => w.id === id)))] : [];
export function loadOceanProgress(): OceanProgress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}') ?? {};
    return { wins: number(p.wins), stars: number(p.stars), correct: number(p.correct), highestLevel: Math.max(1, Math.min(9, number(p.highestLevel, 1))), learned: ids(p.learned), missed: ids(p.missed) };
  } catch { return { wins: 0, stars: 0, correct: 0, highestLevel: 1, learned: [], missed: [] }; }
}
export function saveOceanProgress(progress: OceanProgress) { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* Storage is optional. */ } }
