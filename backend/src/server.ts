import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { initDatabase, closeDatabase } from "./database";
import { registerRoutes } from "./routes";

const server = Fastify({ logger: true });

async function start() {
  try {
    // Register CORS to allow frontend development servers (any localhost port) to call backend on port 4000
    await server.register(cors, {
      origin: [
        // allow localhost and 127.0.0.1 on any port (dev servers may run on 3000, 3001, etc.)
        /^https?:\/\/localhost(?::\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
        // allow local network dev host used by Vite when binding to LAN
        "http://192.168.2.187:3001"
      ],
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