# Casa Castagno — Estate Manager

An internal property management PWA for Casa Castagno: bookings, calendar, finance KPIs,
experiences, providers/contacts, documents, property info, tasks, and settings.

- **Frontend:** React (Create React App + CRACO), Tailwind CSS, shadcn/ui-style components.
- **Backend:** FastAPI.
- **Database:** SQLite (local file, no external services required).

## Prerequisites

- Node.js (v18+ recommended) and a package manager — these instructions use `yarn`
  via `npx` so a global yarn install isn't required.
- Python 3.9+.

## 1. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
CORS_ORIGINS=http://localhost:3000
```

Run the API:

```bash
uvicorn server:app --reload --port 8000
```

This creates a local SQLite database file at `backend/casa_castagno.db` automatically
on first run (no manual migration step). The database starts empty — populate it with
demo data by calling the seed endpoint once the server is running:

```bash
curl -X POST http://localhost:8000/api/seed
```

The API is now available at `http://localhost:8000/api`.

## 2. Frontend setup

```bash
cd frontend
npx --yes yarn@1.22.22 install
```

Create `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8000
```

Run the dev server:

```bash
npx --yes yarn@1.22.22 start
```

Open `http://localhost:3000` in your browser.

## Notes

- The SQLite file (`backend/casa_castagno.db`) is the entire database — back it up by
  copying that one file. Delete it and restart the server to reset to a clean schema
  (then call `/api/seed` again for demo data).
- There is no authentication layer — this app is intended for trusted internal/local use.
- To reset demo data at any time, call `POST /api/seed` again — it clears bookings,
  experiences, providers, documents, and tasks before reseeding (property info and
  settings are upserted, not wiped).
