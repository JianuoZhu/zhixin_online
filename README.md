# zhixin-online-system

Monorepo with a React frontend and a FastAPI backend.

## Structure
- frontend: Vite + React UI
- backend: FastAPI API server (PostgreSQL)

## Frontend
```bash
cd frontend
npm install
npm run dev
```

## Backend
Create a `.env` from `.env.example`, then run:
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed.py
uvicorn app.main:app --reload
```

## Database
Use Docker for PostgreSQL:
```bash
docker-compose up -d
```
