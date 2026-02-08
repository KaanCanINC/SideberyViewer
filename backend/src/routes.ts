import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { insertSnapshot, listSnapshots, getSnapshotById, deleteSnapshotById } from "./database";
import { buildParsedSnapshot } from "./parser";
import { SnapshotRaw } from "./types";

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/snapshots - Upload snapshot
  server.post("/api/snapshots", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let snapshot: SnapshotRaw | null = null;

      // Check if it's multipart upload
      const isMultipart = request.isMultipart();
      
      if (isMultipart) {
        const data = await request.file();
        if (data) {
          const buffer = await data.toBuffer();
          snapshot = JSON.parse(buffer.toString("utf8"));
        }
      } else {
        // JSON body
        snapshot = request.body as SnapshotRaw;
      }

      if (!snapshot) {
        return reply.status(400).send({ error: "No snapshot provided" });
      }

      const id = snapshot.id ?? randomUUID();
      const time = snapshot.time ?? Date.now();
      const now = new Date().toISOString();

      await insertSnapshot(id, time, JSON.stringify(snapshot), now);

      return reply.status(201).send({ id, time, created_at: now });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: "Failed to store snapshot",
        detail: err.message || String(err),
      });
    }
  });

  // GET /api/snapshots - List all snapshots (with preview)
  server.get("/api/snapshots", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rows = await listSnapshots();

      // helper to extract a human-friendly preview title from raw snapshot JSON
      const extractPreview = (raw: any): string => {
        try {
          // search recursively for the first tab object with title or url
          const walk = (node: any): string | null => {
            if (!node) return null;
            if (Array.isArray(node)) {
              for (const item of node) {
                const res = walk(item);
                if (res) return res;
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
                  if (res) return res;
                }
              }
              // generic descent
              for (const v of Object.values(node)) {
                const res = walk(v);
                if (res) return res;
              }
            }
            return null;
          };

          const found = walk(raw);
          return found ? String(found) : "";
        } catch {
          return "";
        }
      };

      const enriched = await Promise.all(
        rows.map(async (r: any) => {
          try {
            const full = await getSnapshotById(r.id);
            if (!full) return r;
            const raw = JSON.parse(full.rawJson);
            const previewTitle = extractPreview(raw) || "";
            return { ...r, previewTitle };
          } catch {
            return r;
          }
        })
      );

      return reply.send(enriched);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: "Failed to list snapshots",
        detail: err.message || String(err),
      });
    }
  });

  // GET /api/snapshots/:id - Get raw snapshot
  server.get<{ Params: { id: string } }>(
    "/api/snapshots/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const row = await getSnapshotById(id);

        if (!row) {
          return reply.status(404).send({ error: "Snapshot not found" });
        }

        return reply.send({
          id: row.id,
          time: row.time,
          raw: JSON.parse(row.rawJson),
          created_at: row.created_at,
        });
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({
          error: "Failed to fetch snapshot",
          detail: err.message || String(err),
        });
      }
    }
  );

  // GET /api/snapshots/:id/parsed - Get parsed snapshot tree
  server.get<{ Params: { id: string } }>(
    "/api/snapshots/:id/parsed",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const row = await getSnapshotById(id);

        if (!row) {
          return reply.status(404).send({ error: "Snapshot not found" });
        }

        const snapshot = JSON.parse(row.rawJson) as SnapshotRaw;
        const parsed = buildParsedSnapshot(snapshot);

        return reply.send(parsed);
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({
          error: "Failed to parse snapshot",
          detail: err.message || String(err),
        });
      }
    }
  );

  // PUT /api/snapshots/:id - Replace snapshot raw JSON (for edits)
  server.put<{ Params: { id: string } }>(
    "/api/snapshots/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const body = request.body as any;
        if (!body || !body.raw) {
          return reply.status(400).send({ error: "Missing raw snapshot in body" });
        }

        // Validate JSON shape minimally
        const raw = body.raw;
        const time = body.time ?? Date.now();
        const now = new Date().toISOString();

        await insertSnapshot(id, time, JSON.stringify(raw), now);

        return reply.send({ id, time, created_at: now });
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({
          error: "Failed to update snapshot",
          detail: err.message || String(err),
        });
      }
    }
  );

  // DELETE /api/snapshots/:id - Remove snapshot
  server.delete<{ Params: { id: string } }>(
    "/api/snapshots/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        await deleteSnapshotById(id);
        return reply.status(204).send();
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({
          error: "Failed to delete snapshot",
          detail: err.message || String(err),
        });
      }
    }
  );
}
