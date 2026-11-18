# UniLink

## Backend

The API is in `backend/` and uses FastAPI, SQLAlchemy, Alembic, and PostgreSQL. From that directory:

```powershell
cd ..
docker compose up -d db
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

Set `DATABASE_URL` and `JWT_SECRET_KEY` in `.env` before running outside local development. The seed script creates two demo accounts per school; their shared password is `CampusDemo2026!`.

Run the backend checks from `backend/` with `pytest tests -q`.

## Frontend

From `frontend/`, install and start the React app:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The Vite server runs at `http://localhost:5173`, with API requests sent to `http://localhost:8000/api/v1` by default. Create a production build with `npm run build`.