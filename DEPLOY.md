# SkyBazaar Cloud Deployment

This project now supports split deployment:

- API service (`Worker__Enabled=false`)
- Worker service (`Worker__Enabled=true`)
- Shared PostgreSQL database

## Quick start (Docker Compose)

```bash
docker compose up --build -d
bash scripts/smoke-test.sh http://127.0.0.1:8080
```

## Important environment variables

- `Database__Provider` = `sqlite` or `postgres`
- `ConnectionStrings__DefaultConnection` = provider-specific connection string
- `Worker__Enabled` = `true` for worker, `false` for API
- `Security__RequireImportApiKey` = `true` in production
- `Security__ImportApiKey` = long random secret
- `Coflnet__EnableImport` = `false` by default in production

## Can we keep existing SQLite data?

Yes. You have two safe paths:

1. **Keep SQLite in cloud with a persistent volume**
   - No data migration required.
   - Lower scale and resilience than Postgres.

2. **Migrate SQLite -> PostgreSQL once**
   - Keeps all existing snapshots, including `IsExternalImport` rows.
   - Recommended for long-term cloud reliability.

### One-time migration with pgloader

Install/use pgloader and run:

```bash
pgloader \
  "sqlite:///absolute/path/to/skybazaar.db" \
  "postgresql://skybazaar:skybazaar-change-me@localhost:5432/skybazaar"
```

For this repository, a ready-to-run loader file is included at `scripts/sqlite_to_postgres.load`.
If you use that path, run:

```bash
docker run --rm \
  -v "$(pwd):/work" \
  --network host \
  dimitri/pgloader:latest \
  pgloader /work/scripts/sqlite_to_postgres.load
```

Then normalize imported column types for EF Core compatibility:

```bash
docker exec -i skybazaar-postgres psql -U skybazaar -d skybazaar \
  < scripts/postgres_fix_types.sql
```

After import, verify:

```sql
SELECT COUNT(*) AS snapshots, SUM(CASE WHEN "IsExternalImport" THEN 1 ELSE 0 END) AS external_imports
FROM "Snapshots";
```

Then point API + worker to Postgres via:

- `Database__Provider=postgres`
- `ConnectionStrings__DefaultConnection=Host=...;Port=5432;Database=...;Username=...;Password=...`

`appsettings.Production.json` already defaults to `Database__Provider=postgres`; override only if needed.

## Production checklist

- Use managed Postgres or persistent storage
- Set a strong `Security__ImportApiKey`
- Keep `Coflnet__EnableImport=false` unless intentionally importing
- Run one worker replica only
- Monitor `/health/ready` from your platform probes

## Running Coflnet importer on Postgres

The importer script writes through the API endpoint, so it writes to whatever database your API is using.

For Docker Compose Postgres setup:

1. Temporarily enable import on API and set a real admin key.
2. Run importer against API port `8080` with `X-Admin-Key`.
3. Disable import again when done.

Example:

```bash
# 1) Temporarily set in docker-compose.yml for api service:
#    Coflnet__EnableImport: "true"
#    Security__ImportApiKey: "your-strong-key"
docker compose up -d --force-recreate api

# 2) Run one-off import (Postgres-backed API)
python3 scripts/import_all_coflnet_safe.py \
  --api-base http://127.0.0.1:8080 \
  --admin-key your-strong-key \
  --db-path ""

# 3) Re-disable import in compose and recreate api
docker compose up -d --force-recreate api
```

