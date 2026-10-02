export type SpaceTileKind = 'start' | 'empty' | 'alien' | 'body' | 'satellite';
export type SpaceTile = { kind: SpaceTileKind; label: string };
export type SpaceQuestion = { a: number; b: number; operator: '+' | '−'; answer: number; choices: number[]; rejected: number[] };
export type SpaceState = {
  rows: number; cols: number; tiles: SpaceTile[]; position: number; satellites: number;
  target: number; energy: number; steps: number; status: 'playing' | 'question' | 'crashed' | 'won';
  question: SpaceQuestion | null; challengeTarget: number | null; message: string; seed: number;
};

function random(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
export function makeSpaceQuestion(seed: number): SpaceQuestion {
  const r = random(seed); const add = r() > .42; const a = Math.floor(r() * 12) + 1;
  const b = add ? Math.floor(r() * (20 - a)) + 1 : Math.floor(r() * a) + 1; const answer = add ? a + b : a - b;
  const wrong = Array.from({ length: 21 }, (_, i) => i).filter(n => n !== answer).sort(() => r() - .5);
  const choices = [answer, ...wrong.slice(0, 3)].sort(() => r() - .5);
  return { a, b, operator: add ? '+' : '−', answer, choices, rejected: [] };
}
export function createSpaceGame(seed = Math.floor(Math.random() * 1e8)): SpaceState {
  const rows = 7, cols = 11, r = random(seed); const tiles: SpaceTile[] = Array.from({ length: rows * cols }, (_, i) => {
    if (i === 0) return { kind: 'start', label: '基地' };
    if (i === rows * cols - 1) return { kind: 'satellite', label: '卫星角落' };
    const roll = r(); if (roll < .15) return { kind: 'alien', label: '外星人' }; if (roll < .29) return { kind: 'body', label: '天体' }; return { kind: 'empty', label: '星尘' };
  });
  tiles[2] = { kind: 'alien', label: '外星人' }; tiles[12] = { kind: 'body', label: '天体' }; tiles[25] = { kind: 'alien', label: '外星人' }; tiles[37] = { kind: 'body', label: '天体' }; tiles[54] = { kind: 'alien', label: '外星人' }; tiles[63] = { kind: 'body', label: '天体' };
  return { rows, cols, tiles, position: 0, satellites: 0, target: rows * cols - 1, energy: 100, steps: 0, status: 'playing', question: null, challengeTarget: null, message: '滑动屏幕让机器人飞向卫星角落！', seed };
}
export function adjacent(state: SpaceState, target: number) { return target >= 0 && target < state.tiles.length && Math.abs(Math.floor(target / state.cols) - Math.floor(state.position / state.cols)) + Math.abs(target % state.cols - state.position % state.cols) === 1; }
export function moveSpace(state: SpaceState, target: number): SpaceState {
  if (state.status !== 'playing' || !adjacent(state, target)) return state; const tile = state.tiles[target];
  if (tile.kind === 'body') return { ...state, status: 'crashed', message: '靠近天体被引力吸引，飞船坠毁了！' };
  if (tile.kind === 'alien') return { ...state, status: 'question', challengeTarget: target, question: makeSpaceQuestion(state.seed + target * 97 + state.steps), message: '外星朋友想考考你：答对才能继续飞行！' };
  const next = { ...state, position: target, steps: state.steps + 1, message: tile.kind === 'satellite' ? '卫星释放成功！这片星空被你点亮啦！' : '飞行稳定，继续寻找卫星角落。' };
  return tile.kind === 'satellite' ? { ...next, satellites: 1, status: 'won' } : next;
}
export function answerSpace(state: SpaceState, answer: number): SpaceState {
  if (state.status !== 'question' || !state.question || state.challengeTarget === null) return state; const q = state.question;
  if (answer !== q.answer && q.rejected.length === 0) return { ...state, question: { ...q, choices: q.choices.filter(n => n !== answer), rejected: [answer] }, message: '这个答案先放一边，再观察一下算式。' };
  if (answer !== q.answer) return { ...state, status: 'crashed', question: null, challengeTarget: null, message: `答案是 ${q.answer}。飞船失去动力，回基地再试一次吧！` };
  const tile = state.tiles[state.challengeTarget]; return { ...state, position: state.challengeTarget, steps: state.steps + 1, status: tile.kind === 'satellite' ? 'won' : 'playing', question: null, challengeTarget: null, message: '回答正确！外星人让开了航线，继续前进！' };
}
