import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DeterministicSimulator, SCENARIOS } from './simulator.js';
import { SeededPrng } from './seed.js';
import { checkPerKeyLinearizable, type LinearOperation } from './linearizability.js';

describe('deterministic chaos simulator', () => {
  it('produces byte-identifiable reports for the same seed', () => {
    const a = new DeterministicSimulator({ seed: 4242, scenario: 'symmetric-partition' }).run(
      120,
      10,
    );
    const b = new DeterministicSimulator({ seed: 4242, scenario: 'symmetric-partition' }).run(
      120,
      10,
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('runs every named scenario and detects no Raft invariant violation', () => {
    for (const scenario of SCENARIOS) {
      const report = new DeterministicSimulator({ seed: 99, scenario }).run(180, 10);
      expect(report.passed, `${scenario}: ${JSON.stringify(report.invariants)}`).toBe(true);
    }
  });

  it('is a seeded property sweep for invariant regressions', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const scenario = SCENARIOS[new SeededPrng(seed).nextInt(0, SCENARIOS.length - 1)]!;
      const report = new DeterministicSimulator({ seed, scenario }).run(90, 10);
      expect(report.invariants.atMostOneLeaderPerTerm).toBe(true);
      expect(report.invariants.committedLogConsistency).toBe(true);
    }
  });

  it('keeps deterministic reports stable for generated seeds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (seed) => {
        const first = new DeterministicSimulator({ seed, scenario: 'isolated-leader' }).run(30, 10);
        const second = new DeterministicSimulator({ seed, scenario: 'isolated-leader' }).run(30, 10);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      }),
      { numRuns: 100 },
    );
  });
});

describe('per-key linearizability', () => {
  it('accepts a valid get/put/delete history', () => {
    const history: LinearOperation[] = [
      { id: 'put', key: 'k', invocation: 0, response: 10, type: 'put', value: 'a' },
      { id: 'get', key: 'k', invocation: 12, response: 20, type: 'get', value: 'a' },
      { id: 'delete', key: 'k', invocation: 22, response: 30, type: 'delete', value: 'a' },
    ];
    expect(checkPerKeyLinearizable(history)).toBe(true);
  });

  it('rejects a get that observes a put that has not happened', () => {
    const history: LinearOperation[] = [
      { id: 'put', key: 'k', invocation: 20, response: 30, type: 'put', value: 'a' },
      { id: 'get', key: 'k', invocation: 0, response: 10, type: 'get', value: 'a' },
    ];
    expect(checkPerKeyLinearizable(history)).toBe(false);
  });

  it('checks overlapping operations using a valid linearization', () => {
    const history: LinearOperation[] = [
      { id: 'put1', key: 'k', invocation: 0, response: 30, type: 'put', value: '1' },
      { id: 'put2', key: 'k', invocation: 10, response: 20, type: 'put', value: '2' },
      { id: 'get', key: 'k', invocation: 35, response: 40, type: 'get', value: '2' },
    ];
    expect(checkPerKeyLinearizable(history)).toBe(true);
  });
});
