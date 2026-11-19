import { describe, expect, it } from 'vitest';
import { percentile } from './benchmark.js';

describe('percentile', () => {
  it('interpolates between sorted observations', () => {
    expect(percentile([4, 1, 3, 2], 50)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
  });

  it('returns zero for an empty histogram and rejects invalid percentiles', () => {
    expect(percentile([], 95)).toBe(0);
    expect(() => percentile([1], 101)).toThrow(RangeError);
  });
});
