# Travel the Globe

Travel app for people who want to explore the whole world and share their adventures.

## Week 4 — 3D Globe MVP & Country Selection

- **3D Globe MVP**: Rotate and zoom a 3D globe to explore the world.
- **Country Selection**: Click a country on the globe to view and interact with it (side panel with name, ISO codes; backend-ready for later weeks).

## Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, TanStack Query, react-globe.gl (Three.js)
- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose

## Project structure

```
Travel-the-Globe-App/
├── backend/          # Express API, MongoDB models
├── frontend/         # Vite + React app
├── package.json     # Root scripts (install:all, dev:backend, dev:frontend)
└── README.md
```

## Setup

1. **Install dependencies** (from repo root):

   ```bash
   npm run install:all
   ```

   Or manually:

   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Optional — MongoDB**:  
   For full API (e.g. country list from DB), run MongoDB locally.  
   Default: `mongodb://127.0.0.1:27017/travel-the-globe`.  
   Backend still runs if MongoDB is not available (country list will be empty).

3. **Environment** (optional):

   - `backend/.env`: copy from `backend/.env.example` and set `PORT`, `MONGODB_URI`, `FRONTEND_URL`, and **`JWT_SECRET`** (required for auth in production).

## Run

- **Backend** (port 5000):

  ```bash
  cd backend && npm run dev
  ```

- **Frontend** (port 5173, proxies `/api` to backend):

  ```bash
  cd frontend && npm run dev
  ```

Then open **http://localhost:5173**. Drag to rotate the globe, scroll to zoom, click a country to select it and see the side panel.

## API (backend)

- `GET /api/health` — health check
- **Auth:** `POST /api/auth/register` (body: `email`, `password`, `displayName?`), `POST /api/auth/login` (body: `email`, `password`), `GET /api/auth/me` (header: `Authorization: Bearer <token>`)
- `GET /api/countries` — list countries (from DB when MongoDB is connected)
- `GET /api/countries/:iso2` — one country by ISO2 code

Country GeoJSON for the globe is loaded by the frontend from Natural Earth (CDN). Backend country model is used when you seed or manage countries in MongoDB (e.g. for Week 5+).
