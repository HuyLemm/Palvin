/** "1 day" / "2 days" — keeps counts grammatical ("1 bills" looked like a bug). */
export function plural(n: number, one: string, many = one + 's'): string {
  return n === 1 ? one : many;
}
