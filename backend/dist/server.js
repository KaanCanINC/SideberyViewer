"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const database_1 = require("./database");
const routes_1 = require("./routes");
const server = (0, fastify_1.default)({ logger: true });
async function start() {
    try {
        // Register CORS to allow frontend development servers (any localhost port) to call backend on port 4000
        await server.register(cors_1.default, {
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
        await server.register(multipart_1.default, {
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB max file size
            },
        });
        // Initialize database
        await (0, database_1.initDatabase)();
        // Register API routes
        await (0, routes_1.registerRoutes)(server);
        // Health check endpoint
        server.get("/health", async () => {
            return { status: "ok", timestamp: new Date().toISOString() };
        });
        // Start server
        await server.listen({ port: 4000, host: "0.0.0.0" });
        console.log("✓ Backend listening on http://0.0.0.0:4000");
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing server...");
    await server.close();
    (0, database_1.closeDatabase)();
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.log("SIGINT received, closing server...");
    await server.close();
    (0, database_1.closeDatabase)();
    process.exit(0);
});
start();
//# sourceMappingURL=server.js.map