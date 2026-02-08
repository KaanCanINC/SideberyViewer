import Fastify from "fastify";
import { randomUUID } from "crypto";

type SnapshotRaw = {
  id?: string;
  time?: number;
  containers?: Record<string, any>;
  sidebar?: { panels: Record<string, any>; nav: string[] };
  tabs?: any;
  [k: string]: any;
};

type TabRaw = {
  url?: string;
  title?: string;
  panelId?: string | number;
  containerId?: string;
  lvl?: number;
  folded?: boolean;
  [k: string]: any;
};

type TabNode = {
  tab: TabRaw;
  children: TabNode[];
  indexInGroup: number;
};

function parseGroupToTree(group: TabRaw[] = []): TabNode[] {
  const roots: TabNode[] = [];
  const stack: TabNode[] = [];
  for (let i = 0; i < group.length; i++) {
    const t = group[i];
    const lvl = typeof t.lvl === "number" ? t.lvl : 0;
    const node: TabNode = { tab: t, children: [], indexInGroup: i };
    while (stack.length && ((stack[stack.length - 1].tab.lvl ?? 0) >= lvl)) {
      stack.pop();
    }
    if (!stack.length) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

function buildParsedSnapshot(snapshot: SnapshotRaw) {
  const panelsOrdered: any[] = [];
  const panels = snapshot.sidebar?.panels ?? {};
  const nav: string[] = snapshot.sidebar?.nav ?? [];

  // tabs structure: windows -> panels -> groups -> tabs
  const windows = snapshot.tabs ?? [];

  // Build panels according to nav ordering
  for (const panelId of nav) {
    const panelMeta = panels[panelId] ?? { id: panelId };
    const panelObj: any = { id: panelId, meta: panelMeta, groups: [] as any[] };
    // Collect groups from all windows for this panel preserving order
    for (const window of windows) {
      // each window is an array of panels
      for (const panel of window) {
        // panel is an array of groups; each group is an array of TabRaw
        // But we must find which panel this group belongs to by looking at tab.panelId fields
        // Simpler: assume panel array positions align with sidebar.nav order in each window
        // Find index of this panel in the window by checking first tab.panelId or - fallback
      }
    }
    panelsOrdered.push(panelObj);
  }

  // Simpler and robust approach: iterate windows -> panels (by index) -> groups, attach groups to panel by panelId found on tabs
  const panelsMap: Record<string, any> = {};
  for (const window of windows) {
    for (const panelGroups of window as any[]) {
      // panelGroups is an array of groups
      for (const group of panelGroups as TabRaw[][]) {
        // determine panelId from first tab in group if present
        const first = group && group.length ? group[0] : undefined;
        const panelId = first?.panelId ?? "__unknown__";
        if (!panelsMap[panelId]) panelsMap[panelId] = { id: panelId, meta: panels[panelId] ?? null, groups: [] as any[] };
        // store raw group and parsed tree
        panelsMap[panelId].groups.push({
          raw: group,
          tree: parseGroupToTree(group),
        });
      }
    }
  }

  // Respect sidebar.nav ordering when possible
  const resultPanels: any[] = [];
  for (const pid of nav) {
    if (panelsMap[pid]) resultPanels.push(panelsMap[pid]);
  }
  // append any panels not in nav
  for (const pid of Object.keys(panelsMap)) {
    if (!nav.includes(pid)) resultPanels.push(panelsMap[pid]);
  }

  return {
    id: snapshot.id,
    time: snapshot.time,
    containers: snapshot.containers ?? {},
    sidebar: snapshot.sidebar ?? {},
    panels: resultPanels,
  };
}

/* --- DB init using sqlite3 (no native addon build) --- */
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(path.join(dataDir, "snapshots.db"));

const runAsync = (sql: string, params: any[] = []) =>
  new Promise<void>((resolve, reject) => db.run(sql, params, function (err: any) {
    if (err) reject(err);
    else resolve();
  }));

const getAsync = (sql: string, params: any[] = []) =>
  new Promise<any>((resolve, reject) => db.get(sql, params, (err: any, row: any) => (err ? reject(err) : resolve(row))));

const allAsync = (sql: string, params: any[] = []) =>
  new Promise<any[]>((resolve, reject) => db.all(sql, params, (err: any, rows: any[]) => (err ? reject(err) : resolve(rows))));

const initDb = async () => {
  await runAsync(
    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      time INTEGER,
      rawJson TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
};

const server = Fastify({ logger: true });

server.register(require("@fastify/multipart"), { attachFieldsToBody: true, limits: { fileSize: 50 * 1024 * 1024 } });

server.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

server.post("/api/snapshots", async (request, reply) => {
  try {
    let snapshot: SnapshotRaw | null = null;
    const anyReq: any = request;
    if (anyReq.isMultipart || anyReq.body?.file) {
      const parts = anyReq.body;
      if (parts?.file && parts.file._buf) {
        snapshot = JSON.parse(parts.file._buf.toString("utf8"));
      } else {
        snapshot = anyReq.body;
      }
    } else {
      snapshot = request.body as any;
    }
    if (!snapshot) {
      return reply.status(400).send({ error: "No snapshot provided" });
    }
    const id = snapshot.id ?? randomUUID();
    const time = snapshot.time ?? Date.now();
    const now = new Date().toISOString();
    await runAsync(
      "INSERT OR REPLACE INTO snapshots (id, time, rawJson, created_at) VALUES (?, ?, ?, ?)",
      [id, time, JSON.stringify(snapshot), now]
    );
    return reply.status(201).send({ id, time, created_at: now });
  } catch (err: any) {
    (request as any).log?.error?.(err);
    return reply.status(500).send({ error: "Failed to store snapshot", detail: String(err) });
  }
});

server.get("/api/snapshots", async (request, reply) => {
  try {
    const rows = await allAsync("SELECT id, time, created_at FROM snapshots ORDER BY created_at DESC", []);
    return reply.send(rows);
  } catch (err: any) {
    return reply.status(500).send({ error: "Failed to list snapshots", detail: String(err) });
  }
});

server.get("/api/snapshots/:id", async (request, reply) => {
  try {
    const id = (request.params as any).id;
    const row = await getAsync("SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?", [id]);
    if (!row) return reply.status(404).send({ error: "Not found" });
    return reply.send({ id: row.id, time: row.time, raw: JSON.parse(row.rawJson), created_at: row.created_at });
  } catch (err: any) {
    return reply.status(500).send({ error: "Failed to fetch snapshot", detail: String(err) });
  }
});

server.get("/api/snapshots/:id/parsed", async (request, reply) => {
  try {
    const id = (request.params as any).id;
    const row = await getAsync("SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?", [id]);
    if (!row) return reply.status(404).send({ error: "Not found" });
    const snapshot = JSON.parse(row.rawJson) as SnapshotRaw;
    const parsed = buildParsedSnapshot(snapshot);
    return reply.send(parsed);
  } catch (err: any) {
    return reply.status(500).send({ error: "Failed to parse snapshot", detail: String(err) });
  }
});

const start = async () => {
  try {
    await initDb();
    await server.listen({ port: 4000, host: "0.0.0.0" });
    console.log("Backend listening on http://0.0.0.0:4000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
