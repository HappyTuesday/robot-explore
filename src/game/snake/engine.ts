export type Direction = 'up' | 'down' | 'left' | 'right';
export type Point = { x: number; y: number };
export type SnakeState = { cols: number; rows: number; snake: Point[]; food: Point; direction: Direction; queued: Direction; score: number; status: 'playing' | 'won' | 'lost'; seed: number };

export function seeded(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function same(a: Point, b: Point) { return a.x === b.x && a.y === b.y; }
function foodFor(state: SnakeState, random = seeded(state.seed + state.score * 97)): Point {
  const open: Point[] = []; for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (!state.snake.some(p => same(p, { x, y }))) open.push({ x, y });
  return open[Math.floor(random() * open.length)] ?? state.snake[0];
}
export function createSnake(cols = 16, rows = 12, seed = Math.floor(Math.random() * 1e8)): SnakeState { const snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }, { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) }]; const state = { cols, rows, snake, food: { x: 2, y: 2 }, direction: 'right' as Direction, queued: 'right' as Direction, score: 0, status: 'playing' as const, seed }; return { ...state, food: foodFor(state) }; }
const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export function setDirection(state: SnakeState, direction: Direction): SnakeState { return opposite[state.direction] === direction ? state : { ...state, queued: direction }; }
export function tick(state: SnakeState): SnakeState {
  if (state.status !== 'playing') return state;
  const direction = state.queued; const head = state.snake[0]; const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction]; const next = { x: head.x + delta[0], y: head.y + delta[1] };
  const hitWall = next.x < 0 || next.x >= state.cols || next.y < 0 || next.y >= state.rows; const eating = same(next, state.food); const body = eating ? state.snake : state.snake.slice(0, -1); const hitBody = body.some(p => same(p, next));
  if (hitWall || hitBody) return { ...state, direction, status: 'lost' };
  const snake = [next, ...state.snake]; if (!eating) snake.pop(); const score = state.score + (eating ? 1 : 0); const nextState = { ...state, direction, snake, score }; return eating ? { ...nextState, food: foodFor(nextState), status: score >= state.cols * state.rows - 2 ? 'won' : 'playing' } : nextState;
}
