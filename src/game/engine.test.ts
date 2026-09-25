import { describe, expect, it } from 'vitest';
import { answerQuestion, createGame, isAdjacent, makeQuestion, move, seededRandom } from './engine';
import type { Difficulty } from './engine';
describe('彩虹能量迷宫', () => {
  it('creates deterministic M×N boards with distinct colors and all mechanics', () => {
    for (const difficulty of ['easy','normal','hard'] as Difficulty[]) {
      const s = createGame(difficulty, 42);
      expect(s.tiles.length).toBe(s.rows*s.cols);
      expect(new Set(s.tiles.map(t=>t.color)).size).toBe(s.tiles.length);
      expect(s.tiles[0].kind).toBe('start');expect(s.tiles.at(-1)?.kind).toBe('finish');
      expect(createGame(difficulty,42)).toEqual(s);
      expect(s.tiles.some(t=>t.kind==='drain')).toBe(true);
      expect(s.tiles.some(t=>t.kind==='monster')).toBe(true);
    }
  });
  it('never permits diagonal, wraparound, or out-of-bounds moves', () => {
    const s=createGame();expect(move(s,-1)).toBe(s);expect(move(s,6)).toBe(s);
    expect(isAdjacent({...s,position:4},5)).toBe(false);
    expect(move({...s,status:'question'},1).position).toBe(0);
  });
  it('applies tile energy exactly once and caps energy at 100', () => {
    let s=createGame('easy',1);s=move(s,1);expect(s.energy).toBe(75);
    s=move(s,0);s=move(s,1);expect(s.energy).toBe(75);expect(s.steps).toBe(3);
    expect(move({...createGame('easy',1),energy:95},1).energy).toBe(100);
  });
  it('explodes when energy reaches zero', () => {
    const s=createGame('easy',1);const lost=move({...s,energy:20},s.cols);
    expect(lost.energy).toBe(0);expect(lost.status).toBe('lost');expect(move(lost,0)).toBe(lost);
  });
  it('blocks movement during a question and loses on an incorrect answer', () => {
    const s=move(move(createGame('easy',1),1),2);
    expect(s.status).toBe('question');expect(move(s,3)).toBe(s);
    expect(answerQuestion(s,s.question!.answer+1).status).toBe('lost');
    const passed=answerQuestion(s,s.question!.answer);
    expect(passed.status).toBe('playing');expect(passed.monsters).toBe(1);
    expect(move(move(passed,1),2).status).toBe('playing');
  });
  it('all generated questions and choices stay within 0–20 with one correct choice', () => {
    const random=seededRandom(2026);
    for(let n=0;n<1000;n++){const q=makeQuestion(random);expect(q.a).toBeLessThanOrEqual(20);expect(q.b).toBeLessThanOrEqual(20);expect(q.answer).toBeGreaterThanOrEqual(0);expect(q.answer).toBeLessThanOrEqual(20);expect(q.choices).toHaveLength(4);expect(new Set(q.choices).size).toBe(4);expect(q.choices.filter(c=>c===q.answer)).toHaveLength(1);expect(q.choices.every(c=>c>=0&&c<=20)).toBe(true);}
  });
  it('every seed, size, and level has a survivable route to the goal', () => {
    for(const difficulty of ['easy','normal','hard'] as Difficulty[])for(let seed=0;seed<100;seed++)for(let level=1;level<=9;level++) {
      let s=createGame(difficulty,seed,level);
      const path=[...Array.from({length:s.cols-1},(_,i)=>i+1),...Array.from({length:s.rows-1},(_,i)=>(i+2)*s.cols-1)];
      for(const target of path){s=move(s,target);if(s.status==='question')s=answerQuestion(s,s.question!.answer);expect(s.energy).toBeGreaterThan(0);}
      expect(s.status).toBe('won');
    }
  });
});
