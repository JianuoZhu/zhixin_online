# New Server Deployment Checklist

## 1. Prepare server basics

- Point the production domain to the new server.
- Install Python, Node.js, npm, Git, and a process manager such as systemd or PM2.
- Install and start PostgreSQL, or prepare a managed PostgreSQL instance.
- Configure HTTPS with a valid certificate. The school CAS note mentions Let's Encrypt R3 compatibility.

## 2. Clone and configure the backend

```powershell
cd <deploy-root>
git clone <repo-url> zhixin-online-system
cd zhixin-online-system/backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://<db-user>:<db-password>@<db-host>:5432/<db-name>
SECRET_KEY=<generate-a-long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=120
ALLOWED_ORIGINS=https://<frontend-domain>
FRONTEND_URL=https://<frontend-domain>
API_PUBLIC_BASE_URL=https://<backend-domain>
CAS_LOGIN_URL=https://cas.sustech.edu.cn/cas/login
CAS_LOGOUT_URL=https://cas.sustech.edu.cn/cas/logout
CAS_SERVICE_VALIDATE_URL=https://cas.sustech.edu.cn/cas/serviceValidate
CAS_SERVICE_URL=https://<backend-domain>/api/auth/cas/callback
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<temporary-admin-password>
```

If using PostgreSQL, make sure the driver is installed. Add `psycopg2-binary` to `requirements.txt` or install it in the venv.

## 3. Initialize database

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\seed.py
.\.venv\Scripts\python.exe upgrade_db_v4.py
```

If you are deploying from scratch after the CAS columns already exist in models, `seed.py` creates them automatically. `upgrade_db_v4.py` is mainly for existing databases.

## 4. Prepare CAS user mapping

CAS returns:

- `user`: GUID
- `sid`: SUSTechID
- optional `name`

There are now two supported flows:

- Existing/pre-imported users: match by `cas_guid` or `sustech_id`.
- New users: if no match is found, the frontend asks whether to create a `member` account and collects display name plus contact email.

To pre-bind existing users, prepare:

```csv
email,sustech_id,cas_guid
student@example.com,12345678,
```

Run:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\import_cas_ids.py <path-to-csv>
```

## 5. Send CAS authorization email

Use the draft in `CAS_INTEGRATION.md`.

Production values to send:

- Application callback URI: `https://<backend-domain>/api/auth/cas/callback`
- SLO URL: `https://<backend-domain>/api/auth/cas/logout`
- Requested attributes: `sid`; optional `name`; no email/cell.
- OAuth: no.

## 6. Build frontend

Create `frontend/.env`:

```env
VITE_API_BASE_URL=https://<backend-domain>
```

Build:

```powershell
cd frontend
npm install
npm run build
```

Serve `frontend/dist` through Nginx, Caddy, IIS, or another static web server. Configure SPA fallback so all routes serve `index.html`.

## 7. Reverse proxy backend

Run FastAPI behind the HTTPS reverse proxy:

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Proxy `https://<backend-domain>` to `http://127.0.0.1:8000`.

## 8. Smoke test

- Open `https://<backend-domain>/api/health`; expect `{"status":"ok"}`.
- Open frontend login page.
- Test password login with admin account.
- Click CAS login.
- Confirm CAS callback returns to `https://<frontend-domain>/cas/callback`.
- Test both paths:
  - Existing `sustech_id` user logs in directly.
  - Unknown CAS user sees create-account prompt and creates a `member` account.
- Check admin pages, event list, room booking, and announcements.
