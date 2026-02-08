# Deploying SideberyViewer to Coolify

This project includes two services:

- frontend: static React app built by Vite, served by nginx (Dockerfile provided).
- backend: Node.js + TypeScript Fastify app (Dockerfile provided).

Quick steps for Coolify:

1. Frontend (Static build pack)
   - In Coolify, create a new app using the Static build pack or Dockerfile option.
   - If using Dockerfile, point to the `frontend` folder (Dockerfile is at repo root).
   - Set build command: `npm ci && npm run build`.
   - Set the publish directory to `dist`.
   - Use `nginx:alpine` as base image (already set in Dockerfile).

2. Backend (Node service)
   - Create a new app in Coolify using Node Dockerfile option, point to `backend`.
   - Expose port `4000`.
   - Environment: `NODE_ENV=production`
   - Coolify will build the image from the provided Dockerfile and run it.

3. Network / Proxy
   - Configure Coolify to expose frontend on desired domain.
   - Set backend URL in frontend API calls if needed (frontend currently proxies /api/ to /api/ on same domain).

4. Persistence
   - Backend stores snapshots in SQLite at `/app/data/snapshots.db`.
   - Configure a persistent volume in Coolify mapping to `/app/data`.

5. Healthchecks
   - Backend: /health endpoint on port 4000
   - Frontend: static files served by nginx

6. Notes
   - This repo no longer contains docker-compose.yml (removed). Coolify handles orchestration.
   - For local tests you can build images with Docker manually (see Dockerfiles).