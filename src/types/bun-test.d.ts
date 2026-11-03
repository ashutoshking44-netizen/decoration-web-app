/**
 * Minimal types for the `bun:test` APIs used by the *.test.ts files that live
 * under src/ (run with `bun test`). Avoids adding the bun-types dependency just
 * so `tsc` can type-check those files.
 */
declare module "bun:test" {
  type TestFn = () => void | Promise<unknown>;

  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeUndefined(): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeInstanceOf(expected: abstract new (...args: never[]) => unknown): void;
    toThrow(expected?: string | RegExp): void;
    not: Matchers;
    resolves: Matchers;
    rejects: Matchers;
  }

  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: TestFn): void;
  export function test(name: string, fn: TestFn): void;
  export function expect(actual: unknown): Matchers;
  export function beforeAll(fn: TestFn): void;
  export function beforeEach(fn: TestFn): void;
  export function afterAll(fn: TestFn): void;
  export function afterEach(fn: TestFn): void;
}
