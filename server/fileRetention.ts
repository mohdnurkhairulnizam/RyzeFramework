import {
  deleteFileMetadataForUser,
  getFileForDeletion,
  listExpiredFiles,
} from "./db";
import { storageDelete } from "./storage";
import { FILE_RETENTION_MS } from "../shared/fileRetention";

export const FILE_RETENTION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export async function deleteUserFile(userId: number, fileId: string): Promise<boolean> {
  const file = await getFileForDeletion(fileId, userId);
  if (!file) return false;
  await storageDelete(file.storageKey);
  await deleteFileMetadataForUser(fileId, userId);
  return true;
}

export async function purgeExpiredFiles(now = Date.now()): Promise<number> {
  const expiredFiles = await listExpiredFiles(new Date(now - FILE_RETENTION_MS));
  let deleted = 0;
  for (const file of expiredFiles) {
    try {
      await storageDelete(file.storageKey);
      await deleteFileMetadataForUser(file.id, file.userId);
      deleted += 1;
    } catch (error) {
      console.error(
        "[file-retention] Expired file cleanup failed; it will be retried on the next sweep.",
        error instanceof Error ? error.name : "unknown error",
      );
    }
  }
  return deleted;
}

let sweepTimer: NodeJS.Timeout | undefined;

export function startFileRetentionSweeper(): void {
  if (sweepTimer) return;
  const run = () => {
    void purgeExpiredFiles().catch((error) => {
      console.error(
        "[file-retention] Retention sweep failed; it will be retried.",
        error instanceof Error ? error.name : "unknown error",
      );
    });
  };
  run();
  sweepTimer = setInterval(run, FILE_RETENTION_SWEEP_INTERVAL_MS);
  sweepTimer.unref();
}
