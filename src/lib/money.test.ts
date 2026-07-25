import { describe, expect, it } from 'vitest';
import { allocate, quantize, sum } from './money';

describe('allocate', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(allocate(90000, [1, 1, 1])).toEqual([30000, 30000, 30000]);
  });

  it('sums exactly to the total when it does not divide cleanly', () => {
    const parts = allocate(100000, [1, 1, 1]);
    expect(sum(parts)).toBe(100000);
    expect(parts).toEqual([33334, 33333, 33333]);
  });

  it('handles totals smaller than the number of people', () => {
    const parts = allocate(2, [1, 1, 1]);
    expect(sum(parts)).toBe(2);
    expect(parts.every((p) => p >= 0)).toBe(true);
  });

  it('respects weights', () => {
    expect(allocate(100000, [2, 1, 1])).toEqual([50000, 25000, 25000]);
  });

  it('sums exactly with awkward weights', () => {
    expect(sum(allocate(100, [3, 1]))).toBe(100);
    expect(sum(allocate(7, [5, 3, 1]))).toBe(7);
  });

  it('gives zero to a zero weight and spreads the rest', () => {
    const parts = allocate(90000, [1, 0, 2]);
    expect(parts[1]).toBe(0);
    expect(sum(parts)).toBe(90000);
  });

  it('returns all zeros when every weight is zero', () => {
    expect(allocate(1000, [0, 0])).toEqual([0, 0]);
  });

  it('coerces non-finite and negative weights to zero', () => {
    const parts = allocate(1000, [Number.NaN, -5, 1]);
    expect(parts).toEqual([0, 0, 1000]);
  });

  it('preserves sign for refunds', () => {
    const parts = allocate(-100000, [1, 1, 1]);
    expect(sum(parts)).toBe(-100000);
  });

  it('returns an empty array for no participants', () => {
    expect(allocate(5000, [])).toEqual([]);
  });

  it('is deterministic across repeated calls', () => {
    const a = allocate(100000, [1, 1, 1]);
    const b = allocate(100000, [1, 1, 1]);
    expect(a).toEqual(b);
  });
});

describe('quantize', () => {
  it('is a no-op for unit 1', () => {
    expect(quantize([33334, 33333, 33333], 1, 0)).toEqual([33334, 33333, 33333]);
  });

  it('rounds to the unit and preserves the total', () => {
    const parts = quantize([33334, 33333, 33333], 1000, 0);
    expect(sum(parts)).toBe(100000);
    expect(parts[1] % 1000).toBe(0);
    expect(parts[2] % 1000).toBe(0);
  });

  it('parks the entire residual on the given index', () => {
    const parts = quantize([33334, 33333, 33333], 1000, 2);
    expect(parts[0] % 1000).toBe(0);
    expect(parts[1] % 1000).toBe(0);
    expect(sum(parts)).toBe(100000);
  });

  it('falls back to the largest part for an out-of-range index', () => {
    const parts = quantize([10, 90000, 10], 1000, 99);
    expect(sum(parts)).toBe(90020);
  });

  it('handles an empty input', () => {
    expect(quantize([], 1000, 0)).toEqual([]);
  });
});
