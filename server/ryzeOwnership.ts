export type UserOwned = { userId: number };

export function filterOwnedRecords<T extends UserOwned>(records: T[], userId: number): T[] {
  return records.filter((record) => record.userId === userId);
}

export function requireOwnedRecord<T extends UserOwned>(record: T | undefined, userId: number): T {
  if (!record || record.userId !== userId) {
    throw new Error("Sandbox record is unavailable for this authenticated user.");
  }
  return record;
}
