export class RecoverableDemoError extends Error {
  readonly recoverable = true;
}

export type RetryEvent = { attempt: number; message: string };

export function isRecoverableDemoError(error: unknown): boolean {
  if (error instanceof RecoverableDemoError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return ["timeout", "temporar", "econnreset", "deadlock", "rate limit"].some((phrase) => message.includes(phrase));
}

export async function executeWithBoundedRetry<T>(
  operation: (attempt: number) => Promise<T>,
  onRecoverable: (event: RetryEvent) => Promise<void> | void,
  maxAttempts = 3,
): Promise<{ value: T; attempts: number; retryCount: number }> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts must be at least 1.");
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const value = await operation(attempt);
      return { value, attempts: attempt, retryCount: attempt - 1 };
    } catch (error) {
      lastError = error;
      if (!isRecoverableDemoError(error) || attempt === maxAttempts) throw error;
      await onRecoverable({ attempt, message: error instanceof Error ? error.message : "Recoverable safe-demo error." });
    }
  }
  throw lastError ?? new Error("Safe demo execution did not produce a result.");
}
