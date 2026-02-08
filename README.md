# SideberyViewer

A self-hosted, read-only viewer for Sidebery snapshot JSON files. Built with a TypeScript Fastify backend (SQLite storage) and a Vite + React frontend served by nginx in the frontend container.

**Quick summary**
- Backend: Fastify API on port `4000`.
- Frontend: static SPA served by nginx in the container on port `80` (mapped to host `8080`).
- Storage: SQLite database at `backend/data/snapshots.db` (host-mounted volume in compose).

**Features**
- Upload and store Sidebery snapshot JSON
- List saved snapshots with extracted preview titles
- Render parsed snapshot tree (containers/panels/groups/tabs)
- Read-only viewer with snapshot deletion

**Quickstart (recommended: Docker Compose)**
1. Clone the repo on the host (or use CasaOS Custom Compose):
   ```bash
   git clone https://github.com/<user>/SideberyViewer.git
   cd SideberyViewer
   ```
2. Start services (image-based or build-on-host):
   - If you use registry images (example `kaancaninc/...`), ensure `docker-compose.yml` references those images and run:
     ```bash
     docker compose pull
     docker compose up -d
     ```
   - If you want to build on the host:
     ```bash
     docker compose up -d --build
     ```
3. Verify:
   - Frontend: http://<HOST_IP>:8080
   - Backend health: http://<HOST_IP>:4000/health

**CasaOS notes**
- Preferred: use CasaOS Custom Compose / "From Compose" UI and paste the `docker-compose.yml` content. This ensures both services run in the same stack/network so the frontend nginx can proxy `/api` to `backend`.
- Alternative: push images to Docker Hub and create image-based apps in CasaOS, but ensure the Compose stack is used when nginx upstream names are required.

**Updating the app**
- Image-based flow (recommended):
  1. Build and push images locally: `docker build -t <user>/sidebery-frontend:latest -f frontend/Dockerfile frontend` and similarly for backend.
  2. Push images and on server `docker pull` then `docker compose up -d --force-recreate`.
- Host-build flow: SSH to the host, `git pull`, `docker compose build <service>`, then `docker compose up -d --no-deps --force-recreate <service>`.

**Database & backups**
- DB file: `backend/data/snapshots.db` (persisted on host). Back up before schema changes:
  ```bash
  cp backend/data/snapshots.db ~/backups/snapshots.db.$(date +%F_%T)
  ```

**Troubleshooting**
- Frontend logs: `docker compose logs -f frontend`
- Backend logs: `docker compose logs -f backend`
- If nginx errors with `host not found in upstream "backend"`: ensure both services are started from the same `docker-compose.yml` so they share a network and the service name `backend` resolves.

**Development**
- Backend dev: `cd backend && npm install && npm run dev`
- Frontend dev: `cd frontend && npm install && npm run dev`

**Contributing**
- Open a pull request with clear description and a small change set. For UI changes include screenshots and test steps.

---

If you want, I can add a GitHub Actions workflow to automate build+push and a `deploy.sh` script for one-line server deploys. Tell me which registry/user you want to use and I can generate the workflow.
# SideberyViewer (v1) — Read-only snapshot viewer

Run locally (development)
- Backend:
  cd backend
  npm install
  npm run dev

- Frontend:
  cd frontend
  npm install
  npm run dev

Docker (build + run)
- docker compose build
- docker compose up -d

APIs
- POST /api/snapshots (multipart form 'file' or raw JSON body)
- GET /api/snapshots
- GET /api/snapshots/:id
- GET /api/snapshots/:id/parsed