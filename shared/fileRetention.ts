export const FILE_RETENTION_DAYS = 30;
export const FILE_RETENTION_MS = FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function fileExpiresAt(createdAt: Date | string | number): Date {
  return new Date(new Date(createdAt).getTime() + FILE_RETENTION_MS);
}

export function isFileExpired(createdAt: Date | string | number, now = Date.now()): boolean {
  return now >= fileExpiresAt(createdAt).getTime();
}
