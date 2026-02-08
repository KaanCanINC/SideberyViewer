"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const crypto_1 = require("crypto");
const database_1 = require("./database");
const parser_1 = require("./parser");
async function registerRoutes(server) {
    // POST /api/snapshots - Upload snapshot
    server.post("/api/snapshots", async (request, reply) => {
        try {
            let snapshot = null;
            // Check if it's multipart upload
            const isMultipart = request.isMultipart();
            if (isMultipart) {
                const data = await request.file();
                if (data) {
                    const buffer = await data.toBuffer();
                    snapshot = JSON.parse(buffer.toString("utf8"));
                }
            }
            else {
                // JSON body
                snapshot = request.body;
            }
            if (!snapshot) {
                return reply.status(400).send({ error: "No snapshot provided" });
            }
            const id = snapshot.id ?? (0, crypto_1.randomUUID)();
            const time = snapshot.time ?? Date.now();
            const now = new Date().toISOString();
            await (0, database_1.insertSnapshot)(id, time, JSON.stringify(snapshot), now);
            return reply.status(201).send({ id, time, created_at: now });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to store snapshot",
                detail: err.message || String(err),
            });
        }
    });
    // GET /api/snapshots - List all snapshots (with preview)
    server.get("/api/snapshots", async (request, reply) => {
        try {
            const rows = await (0, database_1.listSnapshots)();
            // helper to extract a human-friendly preview title from raw snapshot JSON
            const extractPreview = (raw) => {
                try {
                    // search recursively for the first tab object with title or url
                    const walk = (node) => {
                        if (!node)
                            return null;
                        if (Array.isArray(node)) {
                            for (const item of node) {
                                const res = walk(item);
                                if (res)
                                    return res;
                            }
                            return null;
                        }
                        if (typeof node === "object") {
                            // tab-like object
                            if ((node.title && typeof node.title === "string" && node.title.trim()) || (node.url && typeof node.url === "string")) {
                                return node.title?.trim() || node.url;
                            }
                            // check properties commonly holding lists: tabs, windows, groups, panels
                            for (const k of ["tabs", "windows", "groups", "panels"]) {
                                if (node[k]) {
                                    const res = walk(node[k]);
                                    if (res)
                                        return res;
                                }
                            }
                            // generic descent
                            for (const v of Object.values(node)) {
                                const res = walk(v);
                                if (res)
                                    return res;
                            }
                        }
                        return null;
                    };
                    const found = walk(raw);
                    return found ? String(found) : "";
                }
                catch {
                    return "";
                }
            };
            const enriched = await Promise.all(rows.map(async (r) => {
                try {
                    const full = await (0, database_1.getSnapshotById)(r.id);
                    if (!full)
                        return r;
                    const raw = JSON.parse(full.rawJson);
                    const previewTitle = extractPreview(raw) || "";
                    return { ...r, previewTitle };
                }
                catch {
                    return r;
                }
            }));
            return reply.send(enriched);
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to list snapshots",
                detail: err.message || String(err),
            });
        }
    });
    // GET /api/snapshots/:id - Get raw snapshot
    server.get("/api/snapshots/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            const row = await (0, database_1.getSnapshotById)(id);
            if (!row) {
                return reply.status(404).send({ error: "Snapshot not found" });
            }
            return reply.send({
                id: row.id,
                time: row.time,
                raw: JSON.parse(row.rawJson),
                created_at: row.created_at,
            });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to fetch snapshot",
                detail: err.message || String(err),
            });
        }
    });
    // GET /api/snapshots/:id/parsed - Get parsed snapshot tree
    server.get("/api/snapshots/:id/parsed", async (request, reply) => {
        try {
            const { id } = request.params;
            const row = await (0, database_1.getSnapshotById)(id);
            if (!row) {
                return reply.status(404).send({ error: "Snapshot not found" });
            }
            const snapshot = JSON.parse(row.rawJson);
            const parsed = (0, parser_1.buildParsedSnapshot)(snapshot);
            return reply.send(parsed);
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to parse snapshot",
                detail: err.message || String(err),
            });
        }
    });
    // PUT /api/snapshots/:id - Replace snapshot raw JSON (for edits)
    server.put("/api/snapshots/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            const body = request.body;
            if (!body || !body.raw) {
                return reply.status(400).send({ error: "Missing raw snapshot in body" });
            }
            // Validate JSON shape minimally
            const raw = body.raw;
            const time = body.time ?? Date.now();
            const now = new Date().toISOString();
            await (0, database_1.insertSnapshot)(id, time, JSON.stringify(raw), now);
            return reply.send({ id, time, created_at: now });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to update snapshot",
                detail: err.message || String(err),
            });
        }
    });
    // DELETE /api/snapshots/:id - Remove snapshot
    server.delete("/api/snapshots/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            await (0, database_1.deleteSnapshotById)(id);
            return reply.status(204).send();
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({
                error: "Failed to delete snapshot",
                detail: err.message || String(err),
            });
        }
    });
}
//# sourceMappingURL=routes.js.map