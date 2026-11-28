const DEFAULT_FILE_RETENTION_DAYS = 30;
const MAX_CONFIGURED_FILE_RETENTION_DAYS = 30;

function configuredRetentionDays(value: string | undefined): number {
  if (!value) return DEFAULT_FILE_RETENTION_DAYS;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CONFIGURED_FILE_RETENTION_DAYS) {
    return DEFAULT_FILE_RETENTION_DAYS;
  }
  return parsed;
}

export const FILE_RETENTION_DAYS = configuredRetentionDays(process.env.RYZE_FILE_RETENTION_DAYS);
export const FILE_RETENTION_MS = FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function fileExpiresAt(createdAt: Date | string | number): Date {
  return new Date(new Date(createdAt).getTime() + FILE_RETENTION_MS);
}

export function isFileExpired(createdAt: Date | string | number, now = Date.now()): boolean {
  return now >= fileExpiresAt(createdAt).getTime();
}
