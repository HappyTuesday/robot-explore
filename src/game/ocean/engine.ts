import { createGame, isAdjacent, move, seededRandom, ABANDON_ENERGY_COST } from '../engine';
import type { Difficulty, GameState } from '../engine';
import vocabulary from './words.json';

export type Word = (typeof vocabulary)[number];
export const WORDS: Word[] = vocabulary;
export const wordSheet = (word: Word) => `${import.meta.env.BASE_URL}assets/words/${word.sheet}`;
export const wordSpriteStyle = (word: Word) => ({ backgroundImage: `url(${wordSheet(word)})`, backgroundPosition: `${word.col * 50}% ${word.row * 50}%` });
export const wordSheetNames = [...new Set(WORDS.map(word => word.sheet))];
export const WRONG_COST = 10;
export type WordQuestion = { word: Word; choices: Word[]; rejected: string[] };
export type OceanState = Omit<GameState, 'question'> & {
  question: WordQuestion | null; learned: string[]; missed: string[]; recent: string[];
};
export function zone(level: number) { return level <= 3 ? '浅海湾' : level <= 6 ? '珊瑚花园' : '沉船遗迹'; }
function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function makeWordQuestion(level: number, seed: number, recent: string[] = [], missed: string[] = []): WordQuestion {
  const random = seededRandom(seed);
  const pool = WORDS.filter(w => level <= 3 ? ['animal', 'fruit'].includes(w.category) : level <= 6 ? ['food', 'vehicle', 'object'].includes(w.category) : true);
  // Review a mistake after another word, without repeatedly asking the same word.
  const review = level >= 7 ? missed.find(id => id !== recent.at(-1)) : undefined;
  const fresh = pool.filter(w => !recent.slice(-8).includes(w.id));
  const word = WORDS.find(w => w.id === review) ?? shuffle(fresh.length ? fresh : pool, random)[0];
  const sameCategory = WORDS.filter(w => w.category === word.category && w.id !== word.id);
  const alternatives = level <= 3 ? WORDS.filter(w => w.category !== word.category) : sameCategory.length >= 3 ? sameCategory : WORDS.filter(w => w.id !== word.id);
  return { word, choices: shuffle([word, ...shuffle(alternatives, random).slice(0, 3)], random), rejected: [] };
}
export function createOcean(difficulty: Difficulty = 'easy', seed = Math.floor(Math.random() * 1e8), level = 1, missed: string[] = []): OceanState {
  return { ...createGame(difficulty, seed, level), question: null, learned: [], recent: [], missed: [...missed], message: '收集氧气泡，读懂单词，找到海底宝箱！' };
}
export function moveOcean(state: OceanState, target: number): OceanState {
  if (state.status !== 'playing' || !isAdjacent({ ...state, question: null }, target)) return state;
  const base = move({ ...state, question: null }, target);
  // The chest itself is guarded if the player bypassed every optional guard.
  if (base.status === 'question' || (base.status === 'won' && state.monsters === 0)) {
    return { ...state, status: 'question', challengeTarget: target,
      question: makeWordQuestion(state.level, state.seed + target * 137 + state.monsters * 997, state.recent, state.missed),
      message: target === state.tiles.length - 1 ? '宝箱有单词锁，答对就能打开！' : '章鱼守卫：找到单词对应的图片吧！' };
  }
  return { ...state, ...base, question: null,
    message: base.status === 'lost' ? '氧气用完了，补充能量再出发！' : base.status === 'won' ? '宝箱打开啦！你是海底单词探险家！' : base.lastEffect === 'boost' ? '收集氧气泡，能量 +15！' : base.lastEffect === 'drain' ? `遇到海流，能量 ${state.tiles[target].amount}。` : '继续探索，宝箱就在前方。' };
}
export function answerOcean(state: OceanState, id: string): OceanState {
  if (state.status !== 'question' || !state.question || state.challengeTarget === null || state.question.rejected.includes(id) || !state.question.choices.some(w => w.id === id)) return state;
  const word = state.question.word;
  if (id !== word.id) {
    const energy = Math.max(0, state.energy - WRONG_COST);
    return { ...state, energy, status: energy ? 'question' : 'lost',
      question: energy ? { ...state.question, rejected: [...state.question.rejected, id] } : null,
      challengeTarget: energy ? state.challengeTarget : null,
      missed: [...new Set([...state.missed, word.id])], lastEffect: 'drain',
      message: energy ? '再观察一下！能量 −10，试试其他图片。' : `氧气用完了。${word.english} 是“${word.chinese}”，下次一定可以！` };
  }
  const target = state.challengeTarget;
  return { ...state, status: target === state.tiles.length - 1 ? 'won' : 'playing', position: target,
    visited: [...new Set([...state.visited, target])], steps: state.steps + 1, monsters: state.monsters + 1,
    learned: [...new Set([...state.learned, word.id])], recent: [...state.recent, word.id],
    // An initially wrong answer stays queued until a later clean answer.
    missed: state.question.rejected.length ? state.missed : state.missed.filter(id => id !== word.id),
    question: null, challengeTarget: null, lastEffect: 'correct', message: `答对啦！${word.english} · ${word.chinese}，继续寻宝！` };
}
export function abandonOcean(state: OceanState): OceanState {
  if (state.status !== 'question') return state;
  const energy = Math.max(0, state.energy - ABANDON_ENERGY_COST);
  return { ...state, energy, status: energy ? 'playing' : 'lost', question: null, challengeTarget: null, lastEffect: 'drain', message: energy ? '能量 −1，留在原地，换条路线试试吧。' : '氧气用完了，补充能量再出发！' };
}
