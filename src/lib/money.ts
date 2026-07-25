/**
 * Integer-money primitives. Every amount in this app is integer Toman.
 *
 * This is the most bug-prone code in the project: if allocation is not exact,
 * `Σ shares === expense.amount` breaks, then `Σ net === 0` breaks, and the
 * settlement becomes unsolvable (the greedy pass leaves a residue it cannot
 * assign). So these two functions carry the whole design.
 */

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Split `total` into `weights.length` integer parts proportional to `weights`,
 * such that the parts sum EXACTLY to `total`.
 *
 * Largest-remainder (Hamilton) method:
 *   1. exact_i  = total * w_i / W
 *   2. base_i   = floor(exact_i)
 *   3. leftover = total − Σ base_i        (an integer in [0, n))
 *   4. hand +1 to the `leftover` entries with the largest fractional parts
 *
 * Determinism is contractual — the same input must always produce the same
 * output, because the same settlement must always produce the same PNG. Ties
 * break by (larger weight first, then original index), never by unstable
 * object identity or sort stability.
 *
 * Edge cases: negative total (refunds) keeps the sign; W === 0 → all zeros;
 * non-finite or negative weights are coerced to 0; n === 0 → [].
 */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const W = sum(w);
  if (W === 0) return new Array<number>(n).fill(0);

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(total));

  const base = new Array<number>(n);
  const frac = new Array<number>(n);
  let used = 0;
  for (let i = 0; i < n; i++) {
    const exact = (abs * w[i]) / W;
    base[i] = Math.floor(exact);
    frac[i] = exact - base[i];
    used += base[i];
  }

  const leftover = abs - used; // 0 <= leftover < n
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => frac[b] - frac[a] || w[b] - w[a] || a - b
  );
  for (let k = 0; k < leftover; k++) base[order[k]] += 1;

  return sign === 1 ? base : base.map((x) => -x);
}

/**
 * Quantize an exact allocation to `unit` Toman, parking the ENTIRE residual on
 * `residualIndex`. `Σ result === Σ parts` still holds.
 *
 * Why one residual holder rather than spreading the rounding across everyone:
 * with unit = 1000, spreading gives every person a different ugly number and
 * defeats the point of rounding at all. Parking it on the treasurer — who
 * fronted the cash — is both socially correct and what people do on paper.
 *
 * An out-of-range `residualIndex` falls back to the largest part.
 */
export function quantize(parts: number[], unit: number, residualIndex: number): number[] {
  if (unit <= 1 || parts.length === 0) return parts.slice();

  const total = sum(parts);
  const out = parts.map((p) => Math.round(p / unit) * unit);

  const idx =
    residualIndex >= 0 && residualIndex < out.length
      ? residualIndex
      : out.reduce((best, _, i) => (out[i] > out[best] ? i : best), 0);

  out[idx] += total - sum(out);
  return out;
}
