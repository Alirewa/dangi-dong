/**
 * Single source of truth for the localStorage key.
 *
 * Referenced in two places that cannot import each other: the zustand persist
 * config, and the blocking anti-FOUC script in <head> (which is a raw string
 * and reads the persist envelope `{ state, version }` directly).
 *
 * Bump the suffix only alongside a `migrate` implementation.
 */
export const STORAGE_KEY = 'dong-system-v1';
