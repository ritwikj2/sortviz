import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, seededShuffle } from '../algorithms.js';

function runAndReplay(algorithm, input, budget = Math.max(100, input.length ** 2 * 10)) {
  const a = input.slice();
  const replay = input.slice();
  const generator = algorithm.run(a);
  const counts = { compare: 0, swap: 0, write: 0 };
  for (let steps = 0; steps <= budget; steps++) {
    const result = generator.next();
    if (result.done) {
      assert.deepEqual(a, replay, 'completion must not hide a mutation');
      return { a, completion: result.value, counts };
    }
    const event = result.value;
    assert.ok(Object.hasOwn(counts, event.type), 'known event type');
    assert.ok(Number.isInteger(event.i) && event.i >= 0 && event.i < a.length, 'valid i');
    counts[event.type]++;
    if (event.type === 'write') {
      assert.ok(Number.isInteger(event.v) && event.v >= 0 && event.v < a.length, 'valid written key');
      replay[event.i] = event.v;
    } else {
      assert.ok(Number.isInteger(event.j) && event.j >= 0 && event.j < a.length, 'valid j');
      if (event.type === 'swap') {
        [replay[event.i], replay[event.j]] = [replay[event.j], replay[event.i]];
      }
    }
    assert.deepEqual(a, replay, 'every mutation must match its event immediately');
  }
  assert.fail(`${algorithm.name} exceeded its event budget`);
}

for (const algorithm of ALGORITHMS) {
  for (const size of [0, 1, 2, 7, 64, 144]) {
    const skip = algorithm.id === 'bogo' && size > 2
      ? 'Bogo is tested at n=4 and separately against its hard cap.'
      : false;
    test(`${algorithm.name}: shuffled n=${size}`, { skip }, () => {
      const input = seededShuffle(size, `test-${size}`);
      const { a, completion } = runAndReplay(algorithm, input);
      assert.equal(completion, undefined);
      assert.deepEqual(a, Array.from({ length: size }, (_, i) => i));
    });
  }
  if (algorithm.id !== 'bogo') {
    for (const [name, input] of [
      ['sorted', Array.from({ length: 32 }, (_, i) => i)],
      ['reversed', Array.from({ length: 32 }, (_, i) => 31 - i)],
      ['duplicate keys', [4, 2, 0, 4, 1, 3, 2, 0]],
    ]) {
      test(`${algorithm.name}: ${name}`, () => {
        const { a } = runAndReplay(algorithm, input);
        assert.deepEqual(a, input.slice().sort((left, right) => left - right));
      });
    }
  }
}

test('Bogo sorts a deterministic tiny permutation', () => {
  const bogo = ALGORITHMS.find(({ id }) => id === 'bogo');
  const { a, completion } = runAndReplay(bogo, seededShuffle(4, 'bogo'), 16000);
  assert.equal(completion, undefined);
  assert.deepEqual(a, [0, 1, 2, 3]);
});

test('Bogo gives up after exactly 2,000 shuffles', () => {
  const bogo = ALGORITHMS.find(({ id }) => id === 'bogo');
  const { a, completion, counts } = runAndReplay(bogo, seededShuffle(64, 'cap'), 260000);
  assert.deepEqual(completion, { gaveUp: true });
  assert.equal(counts.swap, 2000 * 63);
  assert.deepEqual(a.slice().sort((left, right) => left - right), Array.from({ length: 64 }, (_, i) => i));
});

test('Fisher–Yates is deterministic and preserves all keys', () => {
  for (const size of [0, 1, 2, 7, 64, 144, 1024]) {
    for (const seed of ['', 0, 'picture', '42', '🌄']) {
      const first = seededShuffle(size, seed);
      assert.deepEqual(first, seededShuffle(size, seed));
      assert.deepEqual(first.slice().sort((a, b) => a - b), Array.from({ length: size }, (_, i) => i));
    }
  }
  assert.notDeepEqual(seededShuffle(144, 'one'), seededShuffle(144, 'two'));
});

test('Bubble exits early on an already sorted input', () => {
  const bubble = ALGORITHMS.find(({ id }) => id === 'bubble');
  const { counts } = runAndReplay(bubble, Array.from({ length: 64 }, (_, i) => i));
  assert.deepEqual(counts, { compare: 63, swap: 0, write: 0 });
});

test('The algorithm list has unique ids and keeps bogo opt-in', () => {
  assert.equal(new Set(ALGORITHMS.map(({ id }) => id)).size, ALGORITHMS.length);
  assert.equal(ALGORITHMS.find(({ id }) => id === 'bogo').enabledByDefault, false);
});
