/**
 * jalaali-js ships no TypeScript declarations, and there is no @types package.
 * Only the four functions this app actually uses are declared.
 */
declare module 'jalaali-js' {
  export function toJalaali(
    gy: number,
    gm: number,
    gd: number
  ): { jy: number; jm: number; jd: number };
  export function toGregorian(
    jy: number,
    jm: number,
    jd: number
  ): { gy: number; gm: number; gd: number };
  export function jalaaliMonthLength(jy: number, jm: number): number;
  export function isLeapJalaaliYear(jy: number): boolean;
  export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean;
}
