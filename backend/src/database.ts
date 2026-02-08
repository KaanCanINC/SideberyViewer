import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { DbRow, SnapshotMeta } from "./types";

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(path.join(dataDir, "snapshots.db"));

const runAsync = (sql: string, params: any[] = []): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    db.run(sql, params, function (err: any) {
      if (err) reject(err);
      else resolve();
    });
  });

const getAsync = (sql: string, params: any[] = []): Promise<any> =>
  new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const allAsync = (sql: string, params: any[] = []): Promise<any[]> =>
  new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

export async function initDatabase(): Promise<void> {
  await runAsync(
    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      time INTEGER,
      rawJson TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
}

export async function insertSnapshot(
  id: string,
  time: number,
  rawJson: string,
  created_at: string
): Promise<void> {
  await runAsync(
    "INSERT OR REPLACE INTO snapshots (id, time, rawJson, created_at) VALUES (?, ?, ?, ?)",
    [id, time, rawJson, created_at]
  );
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const rows = await allAsync(
    "SELECT id, time, created_at FROM snapshots ORDER BY created_at DESC",
    []
  );
  return rows as SnapshotMeta[];
}

export async function getSnapshotById(id: string): Promise<DbRow | null> {
  const row = await getAsync(
    "SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?",
    [id]
  );
  return row || null;
}

export async function deleteSnapshotById(id: string): Promise<void> {
  await runAsync("DELETE FROM snapshots WHERE id = ?", [id]);
}

export function closeDatabase(): void {
  db.close();
}
