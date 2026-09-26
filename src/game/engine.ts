export type TileKind = 'start' | 'finish' | 'boost' | 'drain' | 'plain' | 'monster';
export type Tile = { kind: TileKind; amount: number; color: string };
export type Question = { a: number; b: number; operator: '+' | '−'; answer: number; choices: number[]; strategy: 'count-all' | 'make-ten' | 'split-number' | 'double'; rejected: number[] };
export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Record<Difficulty, { label: string; rows: number; cols: number }> = {
  easy: { label: '轻松探索', rows: 4, cols: 5 }, normal: { label: '勇敢冒险', rows: 5, cols: 6 }, hard: { label: '超级挑战', rows: 6, cols: 7 },
};
export const ABANDON_ENERGY_COST = 1;
export type GameState = { tiles: Tile[]; rows: number; cols: number; position: number; energy: number; steps: number; visited: number[]; status: 'playing' | 'question' | 'won' | 'lost'; question: Question | null; challengeTarget: number | null; message: string; lastEffect: 'boost' | 'drain' | 'move' | 'correct'; monsters: number; seed: number; level: number; difficulty: Difficulty };
export function seededRandom(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function makeQuestion(random = Math.random, level = 1): Question {
  const add = random() > .35;
  const max = Math.min(20, 5 + Math.ceil(level / 2) * 3);
  const a = Math.floor(random() * max) + 1;
  const b = Math.floor(random() * (add ? Math.max(1, max + 1 - a) : a + 1));
  const answer = add ? a + b : a - b;
  const wrong = Array.from({ length: 21 }, (_, i) => i).filter(i => i !== answer);
  for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
  const choices = [answer, ...wrong.slice(0, 3)];
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  const strategy = a === b ? 'double' : add && a < 10 && answer >= 10 ? 'make-ten' : Math.max(a, b) >= 10 ? 'split-number' : 'count-all';
  return { a, b, operator: add ? '+' : '−', answer, choices, strategy, rejected: [] };
}
export function createGame(difficulty: Difficulty = 'easy', seed = Math.floor(Math.random() * 1e8), level = 1): GameState {
  const { rows, cols } = DIFFICULTIES[difficulty]; const random = seededRandom(seed);
  const tiles: Tile[] = Array.from({ length: rows * cols }, (_, index) => {
    let kind: TileKind = 'plain'; const roll = random();
    if (roll < .27) kind = 'boost'; else if (roll < .52) kind = 'drain'; else if (roll < .71) kind = 'monster';
    // A safe energy route always exists across the top and down the right edge.
    if ((index < cols || index % cols === cols - 1) && kind === 'drain') kind = 'boost';
    if (index === 0) kind = 'start'; else if (index === rows * cols - 1) kind = 'finish';
    // Each board includes all mechanics, while preserving its safe route.
    if (index === cols) kind = 'drain'; if (index === 1) kind = 'boost'; if (index === 2) kind = 'monster';
    const hue = { start: 148, finish: 44, boost: 150, drain: 15, plain: 210, monster: 265 }[kind];
    return { kind, amount: kind === 'boost' ? 15 : kind === 'drain' ? -(20 + Math.min(level - 1, 4) * 5) : 0, color: `hsl(${hue + index * .31}  ${kind === 'plain' ? 36 : 58}% ${86 - index * .11}%)` };
  });
  return { tiles, rows, cols, position: 0, energy: 60, steps: 0, visited: [0], status: 'playing', question: null, challengeTarget: null, message: '点击相邻的格子，出发吧！', lastEffect: 'move', monsters: 0, seed, level, difficulty };
}
export function isAdjacent(state: GameState, target: number) {
  return target >= 0 && target < state.tiles.length && Math.abs(Math.floor(target / state.cols) - Math.floor(state.position / state.cols)) + Math.abs(target % state.cols - state.position % state.cols) === 1;
}
export function move(state: GameState, target: number): GameState {
  if (state.status !== 'playing' || !isAdjacent(state, target)) return state;
  const tile = state.tiles[target];
  const firstVisit = !state.visited.includes(target);
  // A monster blocks entry until its question is answered correctly.
  // Keep position, visited tiles, and completed steps unchanged during a challenge.
  if (tile.kind === 'monster' && firstVisit) {
    return {
      ...state, status: 'question', challengeTarget: target,
      question: makeQuestion(seededRandom(state.seed + target * 137 + state.steps), state.level),
      lastEffect: 'move', message: '小怪兽挡住了去路，答对题目就能通过！',
    };
  }
  const energy = Math.max(0, Math.min(100, state.energy + (firstVisit ? tile.amount : 0)));
  const status: GameState['status'] = energy <= 0 ? 'lost' : tile.kind === 'finish' ? 'won' : 'playing';
  return {
    ...state, position: target, energy, steps: state.steps + 1,
    visited: firstVisit ? [...state.visited, target] : state.visited,
    status, question: null, challengeTarget: null,
    lastEffect: firstVisit && (tile.kind === 'boost' || tile.kind === 'drain') ? tile.kind : 'move',
    message: status === 'lost' ? '能量耗尽了，下次试试绿色路线！' : status === 'won' ? '到达终点！你是真正的小小探险家！' : !firstVisit ? '这块格子已经探索过啦，继续前进吧。' : tile.kind === 'boost' ? '充能成功！能量 +15，感觉更有力量啦！' : tile.kind === 'drain' ? `小心！能量 ${tile.amount}，寻找绿色补给。` : '好样的，离终点又近了一步！',
  };
}
export function answerQuestion(state: GameState, answer: number): GameState {
  if (state.status !== 'question' || !state.question || state.challengeTarget === null) return state;
  const correct = answer === state.question.answer;
  if (!correct && state.question.rejected.length < 1) {
    return { ...state, question: { ...state.question, choices: state.question.choices.filter(choice => choice !== answer), rejected: [...state.question.rejected, answer] }, message: '这个答案先放一边，我们再看一看图形吧！' };
  }
  return {
    ...state, status: correct ? 'playing' : 'lost', question: null, challengeTarget: null,
    position: correct ? state.challengeTarget : state.position,
    visited: correct ? [...state.visited, state.challengeTarget] : state.visited,
    steps: state.steps + (correct ? 1 : 0), monsters: state.monsters + (correct ? 1 : 0),
    lastEffect: correct ? 'correct' : 'drain',
    message: correct ? '答对啦！小怪兽为你让路，继续探险！' : `正确答案是 ${state.question.answer}。再接再厉，你一定可以！`,
  };
}
export function abandonChallenge(state: GameState): GameState {
  if (state.status !== 'question' || !state.question || state.challengeTarget === null) return state;
  const energy = Math.max(0, state.energy - ABANDON_ENERGY_COST);
  return {
    ...state, energy, status: energy === 0 ? 'lost' : 'playing',
    question: null, challengeTarget: null, lastEffect: 'drain',
    message: energy === 0 ? '能量耗尽了，充好电再来探索吧！' : `暂时放弃，能量 −${ABANDON_ENERGY_COST}。留在原地，试试其他路线吧！`,
  };
}
