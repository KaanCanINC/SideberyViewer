import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { initDatabase, closeDatabase } from "./database";
import { registerRoutes } from "./routes";

const server = Fastify({ logger: true });

async function start() {
  try {
    // Register CORS to allow frontend on port 3000 to call backend on port 4000
    await server.register(cors, {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    });

    // Register multipart for file uploads
    await server.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    });

    // Initialize database
    await initDatabase();

    // Register API routes
    await registerRoutes(server);

    // Health check endpoint
    server.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Start server
    await server.listen({ port: 4000, host: "0.0.0.0" });
    console.log("✓ Backend listening on http://0.0.0.0:4000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await server.close();
  closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  await server.close();
  closeDatabase();
  process.exit(0);
});

start();