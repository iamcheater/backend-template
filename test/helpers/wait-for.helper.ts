export async function waitFor(
  assertion: () => void,
  timeoutMs = 3000,
): Promise<void> {
  const startedAt = Date.now();

  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt > timeoutMs) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

export const flushAsyncWork = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 100));
