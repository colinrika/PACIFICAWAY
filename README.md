# PACIFICAWAY — Cloud API Starter (Codespaces + Supabase)

This repo runs entirely in the cloud:
- GitHub Codespaces for the dev environment
- Supabase for the Postgres database

## 1) Upload these files
Create a new GitHub repo named **PACIFICAWAY** and upload everything in this folder.

## 2) Create the users table in Supabase
In Supabase → SQL Editor → paste & run `sql/001_init_users.sql`.

### Updating an existing database
If you already have a Supabase project from an earlier setup, run
`sql/011_schema_sync.sql` in the SQL Editor to backfill the marketplace
tables, columns, and indexes expected by the API before continuing.

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

## 7) Check for upstream Codex updates
To verify that your local branch has the latest commits from the Codex canonical repo, configure the remote once:

```
git remote add codex <repository-url>
```

Then run the helper script:

```
npm run check:codex
```

It will fetch the remote and report whether you are up to date, ahead, or behind compared to the Codex branch.
