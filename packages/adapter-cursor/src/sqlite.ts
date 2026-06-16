import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

export interface SqliteKvEntry {
  key: string;
  value: string;
}

const MEMORY_KEY_RE =
  /memory|rules|composer|aichat|cursor\/|prompt|context|memories/i;

const MAX_ENTRIES = 64;

function decodeValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return String(value);
}

function isMemoryRelatedKey(key: string): boolean {
  return MEMORY_KEY_RE.test(key);
}

function readTable(db: DatabaseSync, table: string): SqliteKvEntry[] {
  const entries: SqliteKvEntry[] = [];
  try {
    const rows = db.prepare(`SELECT key, value FROM ${table}`).all() as Array<{
      key: string;
      value: unknown;
    }>;
    for (const row of rows) {
      if (!isMemoryRelatedKey(row.key)) {
        continue;
      }
      entries.push({ key: row.key, value: decodeValue(row.value) });
      if (entries.length >= MAX_ENTRIES) {
        break;
      }
    }
  } catch {
    // Table may not exist in older Cursor builds.
  }
  return entries;
}

/** Read memory-related KV entries from a Cursor `state.vscdb` (read-only). */
export function readCursorSqlite(dbPath: string): SqliteKvEntry[] {
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  const uri = `file:${dbPath}?mode=ro&immutable=1`;
  try {
    const db = new DatabaseSync(uri, { readOnly: true });
    const fromItem = readTable(db, "ItemTable");
    const fromDisk = readTable(db, "cursorDiskKV");
    db.close();
    return [...fromItem, ...fromDisk];
  } catch {
    return [];
  }
}
