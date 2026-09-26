import { describe, expect, it } from 'vitest';
import { answerOcean, abandonOcean, createOcean, makeWordQuestion, moveOcean, WORDS } from './engine';
import type { OceanState } from './engine';
import type { Difficulty } from '../engine';

function challenge() { return moveOcean(moveOcean(createOcean('easy', 42), 1), 2); }
describe('ocean word quest', () => {
  it('has 36 unique concrete words and four distinct, unambiguous options', () => {
    expect(WORDS).toHaveLength(63);
    expect(new Set(WORDS.map(w => w.id)).size).toBe(63);
    for (let level = 1; level <= 9; level++) for (let seed = 1; seed <= 100; seed++) {
      const q = makeWordQuestion(level, seed * 917);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map(w => w.id)).size).toBe(4);
      expect(q.choices.filter(w => w.id === q.word.id)).toHaveLength(1);
      expect(q.choices.some(w => w.id !== q.word.id && (level < 4 ? w.category === q.word.category : w.category !== q.word.category))).toBe(false);
    }
    expect(new Set(Array.from({ length: 100 }, (_, seed) => { const q = makeWordQuestion(1, seed * 1777); return q.choices.findIndex(w => w.id === q.word.id); })).size).toBe(4);
  });
  it('keeps the diver in place until the answer is right, with one-time rewards', () => {
    const s = challenge();
    expect(s.position).toBe(1); expect(s.energy).toBe(75); expect(s.steps).toBe(1);
    expect(moveOcean(s, 3)).toBe(s);
    const won = answerOcean(s, s.question!.word.id);
    expect(won.position).toBe(2); expect(won.monsters).toBe(1); expect(won.steps).toBe(2);
    expect(won.learned).toEqual([s.question!.word.id]);
    const again = moveOcean(moveOcean(won, 1), 2);
    expect(again.energy).toBe(75); expect(again.monsters).toBe(1); expect(again.status).toBe('playing');
  });
  it('deducts ten for a wrong answer, rejects repeat clicks, and permits retry', () => {
    const s = challenge(), wrong = s.question!.choices.find(w => w.id !== s.question!.word.id)!;
    const next = answerOcean(s, wrong.id);
    expect(next.energy).toBe(65); expect(next.position).toBe(1); expect(next.status).toBe('question');
    expect(next.question!.word).toEqual(s.question!.word); expect(next.missed).toContain(s.question!.word.id);
    expect(answerOcean(next, wrong.id)).toBe(next); expect(answerOcean(next, 'invalid')).toBe(next);
    const solved = answerOcean(next, next.question!.word.id);
    expect(solved.position).toBe(2); expect(solved.energy).toBe(65); expect(solved.missed).toContain(s.question!.word.id);
  });
  it('ends at zero energy and abandons without entering the tile', () => {
    const s = challenge();
    const wrong = s.question!.choices.find(w => w.id !== s.question!.word.id)!;
    const lost = answerOcean({ ...s, energy: 5 }, wrong.id);
    expect(lost.energy).toBe(0); expect(lost.status).toBe('lost'); expect(lost.question).toBeNull();
    const left = abandonOcean(s);
    expect(left.position).toBe(1); expect(left.energy).toBe(74); expect(left.visited).not.toContain(2);
    expect(left.monsters).toBe(0); expect(abandonOcean({ ...s, energy: 1 }).status).toBe('lost');
    expect(moveOcean(left, 2).question).toEqual(s.question);
  });
  it('requires a word even when every optional guard is bypassed', () => {
    const s = createOcean('easy', 1);
    const last = s.tiles.length - 1;
    const atChest = moveOcean({ ...s, position: last - 1, visited: [0, last - 1] }, last);
    expect(atChest.status).toBe('question'); expect(atChest.position).toBe(last - 1);
    expect(answerOcean(atChest, atChest.question!.word.id).status).toBe('won');
    expect(abandonOcean(atChest).position).toBe(last - 1);
  });
  it('reviews a missed word then clears it after an unassisted correct answer', () => {
    const q = makeWordQuestion(7, 42, ['dog'], ['apple']);
    expect(q.word.id).toBe('apple');
    const s = { ...challenge(), question: q, missed: ['apple'] };
    expect(answerOcean(s, 'apple').missed).toEqual([]);
    expect(makeWordQuestion(7, 42, ['apple'], ['apple']).word.id).not.toBe('apple');
  });
  it('has a viable path for every difficulty and level, with deterministic restarts', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) for (let level = 1; level <= 9; level++) for (let seed = 1; seed <= 15; seed++) {
      let s: OceanState = createOcean(difficulty, seed, level);
      expect(createOcean(difficulty, seed, level).tiles).toEqual(s.tiles);
      const path = [...Array.from({ length: s.cols - 1 }, (_, i) => i + 1), ...Array.from({ length: s.rows - 1 }, (_, i) => (i + 2) * s.cols - 1)];
      for (const target of path) { s = moveOcean(s, target); if (s.question) s = answerOcean(s, s.question.word.id); expect(s.energy).toBeGreaterThan(0); }
      expect(s.status).toBe('won'); expect(s.monsters).toBeGreaterThan(0);
    }
  });
});
