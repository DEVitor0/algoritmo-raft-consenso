import { describe, expect, it } from 'vitest';
import { BrowserSimulator } from './browser.js';

describe('browser simulator', () => {
  it('reproduces the same state for the same seed', () => {
    const first = new BrowserSimulator(42);
    const second = new BrowserSimulator(42);
    for (let index = 0; index < 80; index++) {
      first.step();
      second.step();
    }
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it('records elections and exposes committed log blocks', () => {
    const simulator = new BrowserSimulator(7);
    for (let index = 0; index < 80; index++) {
      simulator.step();
      if (simulator.snapshot().nodes.some((node) => node.role === 'leader')) {
        simulator.put('value');
        break;
      }
    }
    for (let index = 0; index < 30; index++) simulator.step();
    const snapshot = simulator.snapshot();
    expect(snapshot.nodes).toHaveLength(5);
    expect(snapshot.elections.length).toBeGreaterThan(0);
    expect(snapshot.nodes.some((node) => node.log.some((entry) => entry.committed))).toBe(true);
  });
});
