export type PortableExport = {
  schemaVersion: "ryze-sandbox-v1";
  exportedAt: string;
  settings: unknown;
  sessions: unknown[];
  tasks: unknown[];
  taskLogs: unknown[];
  memory: unknown[];
  skills: unknown[];
  files: unknown[];
  localization: {
    runtime: "Python 3.10+ or Node 20+";
    notes: string[];
  };
};

export function buildPortableExport(data: Omit<PortableExport, "schemaVersion" | "exportedAt" | "localization">): PortableExport {
  return {
    schemaVersion: "ryze-sandbox-v1",
    exportedAt: new Date().toISOString(),
    ...data,
    localization: {
      runtime: "Python 3.10+ or Node 20+",
      notes: [
        "Import this JSON into the local PROJECT RYZE migration utility.",
        "Copy referenced files using the file manifest; file bytes are kept outside the database.",
        "Provider and integration flags export as disabled. Configure any computer secrets locally rather than copying hosted credentials.",
      ],
    },
  };
}
