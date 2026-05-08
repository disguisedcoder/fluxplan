import { expect } from "@playwright/test";

export type EventuallyOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  message?: string;
};

export async function expectEventually(
  fn: () => Promise<void>,
  { timeoutMs = 10 * 60 * 1000, intervalMs = 1000, message }: EventuallyOptions = {},
): Promise<void> {
  const start = Date.now();
  let lastError: unknown;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fn();
      return;
    } catch (e) {
      lastError = e;
      if (Date.now() - start > timeoutMs) {
        const hint = message ? ` (${message})` : "";
        throw new Error(
          `expectEventually timed out after ${timeoutMs}ms${hint}.\nLast error: ${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`,
        );
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

export async function expectEventuallyToBeTruthy<T>(
  fn: () => Promise<T>,
  { timeoutMs = 10 * 60 * 1000, intervalMs = 1000, message }: EventuallyOptions = {},
): Promise<T> {
  let value: T | null = null;
  await expectEventually(
    async () => {
      value = await fn();
      expect(!!value).toBeTruthy();
    },
    { timeoutMs, intervalMs, message },
  );
  return value as T;
}

