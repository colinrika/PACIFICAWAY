# PACIFICAWAY — Cloud API Starter (Codespaces + Supabase)

This repo runs entirely in the cloud:
- GitHub Codespaces for the dev environment
- Supabase for the Postgres database

## 1) Upload these files
Create a new GitHub repo named **PACIFICAWAY** and upload everything in this folder.

## 2) Create the users table in Supabase
In Supabase → SQL Editor → paste & run `sql/001_init_users.sql`.

## 3) Create a Codespace
Repo → Code → Codespaces → Create codespace on main

## 4) Configure env vars
Create a `.env` inside the Codespace with:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
PORT=4000
```

Or add a Codespaces secret named `DATABASE_URL`.

## 5) Install & run
```
npm install
npm run dev
```
Open the forwarded URL (ends with `-4000.app.github.dev`) and you should see **PACIFICAWAY API is running 🚀**

## 6) Test
```
curl https://<id>-4000.app.github.dev/health
```
