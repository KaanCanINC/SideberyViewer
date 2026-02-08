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