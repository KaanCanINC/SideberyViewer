"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const crypto_1 = require("crypto");
function parseGroupToTree(group = []) {
    const roots = [];
    const stack = [];
    for (let i = 0; i < group.length; i++) {
        const t = group[i];
        const lvl = typeof t.lvl === "number" ? t.lvl : 0;
        const node = { tab: t, children: [], indexInGroup: i };
        while (stack.length && ((stack[stack.length - 1].tab.lvl ?? 0) >= lvl)) {
            stack.pop();
        }
        if (!stack.length)
            roots.push(node);
        else
            stack[stack.length - 1].children.push(node);
        stack.push(node);
    }
    return roots;
}
function buildParsedSnapshot(snapshot) {
    const panelsOrdered = [];
    const panels = snapshot.sidebar?.panels ?? {};
    const nav = snapshot.sidebar?.nav ?? [];
    // tabs structure: windows -> panels -> groups -> tabs
    const windows = snapshot.tabs ?? [];
    // Build panels according to nav ordering
    for (const panelId of nav) {
        const panelMeta = panels[panelId] ?? { id: panelId };
        const panelObj = { id: panelId, meta: panelMeta, groups: [] };
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
    const panelsMap = {};
    for (const window of windows) {
        for (const panelGroups of window) {
            // panelGroups is an array of groups
            for (const group of panelGroups) {
                // determine panelId from first tab in group if present
                const first = group && group.length ? group[0] : undefined;
                const panelId = first?.panelId ?? "__unknown__";
                if (!panelsMap[panelId])
                    panelsMap[panelId] = { id: panelId, meta: panels[panelId] ?? null, groups: [] };
                // store raw group and parsed tree
                panelsMap[panelId].groups.push({
                    raw: group,
                    tree: parseGroupToTree(group),
                });
            }
        }
    }
    // Respect sidebar.nav ordering when possible
    const resultPanels = [];
    for (const pid of nav) {
        if (panelsMap[pid])
            resultPanels.push(panelsMap[pid]);
    }
    // append any panels not in nav
    for (const pid of Object.keys(panelsMap)) {
        if (!nav.includes(pid))
            resultPanels.push(panelsMap[pid]);
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
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.resolve("data");
if (!fs_1.default.existsSync(dataDir))
    fs_1.default.mkdirSync(dataDir, { recursive: true });
const sqlite = sqlite3_1.default.verbose();
const db = new sqlite.Database(path_1.default.join(dataDir, "snapshots.db"));
const runAsync = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err)
        reject(err);
    else
        resolve();
}));
const getAsync = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const allAsync = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
const initDb = async () => {
    await runAsync(`CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      time INTEGER,
      rawJson TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
};
const server = (0, fastify_1.default)({ logger: true });
server.register(require("@fastify/formbody")); // support application/x-www-form-urlencoded / json
server.register(require("@fastify/multipart"), { attachFieldsToBody: true, limits: { fileSize: 50 * 1024 * 1024 } });
server.post("/api/snapshots", async (request, reply) => {
    try {
        let snapshot = null;
        const anyReq = request;
        if (anyReq.isMultipart || anyReq.body?.file) {
            const parts = anyReq.body;
            if (parts?.file && parts.file._buf) {
                snapshot = JSON.parse(parts.file._buf.toString("utf8"));
            }
            else {
                snapshot = anyReq.body;
            }
        }
        else {
            snapshot = request.body;
        }
        if (!snapshot) {
            return reply.status(400).send({ error: "No snapshot provided" });
        }
        const id = snapshot.id ?? (0, crypto_1.randomUUID)();
        const time = snapshot.time ?? Date.now();
        const now = new Date().toISOString();
        await runAsync("INSERT OR REPLACE INTO snapshots (id, time, rawJson, created_at) VALUES (?, ?, ?, ?)", [id, time, JSON.stringify(snapshot), now]);
        return reply.status(201).send({ id, time, created_at: now });
    }
    catch (err) {
        request.log?.error?.(err);
        return reply.status(500).send({ error: "Failed to store snapshot", detail: String(err) });
    }
});
server.get("/api/snapshots", async (request, reply) => {
    try {
        const rows = await allAsync("SELECT id, time, created_at FROM snapshots ORDER BY created_at DESC", []);
        return reply.send(rows);
    }
    catch (err) {
        return reply.status(500).send({ error: "Failed to list snapshots", detail: String(err) });
    }
});
server.get("/api/snapshots/:id", async (request, reply) => {
    try {
        const id = request.params.id;
        const row = await getAsync("SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?", [id]);
        if (!row)
            return reply.status(404).send({ error: "Not found" });
        return reply.send({ id: row.id, time: row.time, raw: JSON.parse(row.rawJson), created_at: row.created_at });
    }
    catch (err) {
        return reply.status(500).send({ error: "Failed to fetch snapshot", detail: String(err) });
    }
});
server.get("/api/snapshots/:id/parsed", async (request, reply) => {
    try {
        const id = request.params.id;
        const row = await getAsync("SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?", [id]);
        if (!row)
            return reply.status(404).send({ error: "Not found" });
        const snapshot = JSON.parse(row.rawJson);
        const parsed = buildParsedSnapshot(snapshot);
        return reply.send(parsed);
    }
    catch (err) {
        return reply.status(500).send({ error: "Failed to parse snapshot", detail: String(err) });
    }
});
const start = async () => {
    try {
        await initDb();
        await server.listen({ port: 4000, host: "0.0.0.0" });
        console.log("Backend listening on http://0.0.0.0:4000");
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map