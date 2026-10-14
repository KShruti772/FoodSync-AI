# FoodSync AI Database

This folder contains the PostgreSQL database backup
for the FoodSync AI project.

## Database
- PostgreSQL
- Tool: pgAdmin 4

## Contents
- foodsync.sql: Database schema and sample data

## Runtime Schema & Alembic Migrations
- The runtime database is PostgreSQL 15+ (PostgreSQL 16 supported).
- A minimal local PostgreSQL provisioning configuration is provided via the repository root `docker-compose.yml`.
  To start the local PostgreSQL service:
  ```bash
  docker compose up -d
  ```
- FoodSync AI uses Alembic for declarative schema migrations matching the SQLAlchemy ORM domain models.
- Migration baseline: `backend/alembic/versions/68d6e9553c50_create_initial_foodsync_tables.py`
- To initialize or upgrade the runtime database:
  ```bash
  cd backend
  alembic upgrade head
  ```


## Legacy Reference Dump (`foodsync.sql`)
- `foodsync.sql` is a historical pgAdmin export containing a 4-table subset schema and sample records.
- For active production and development workflows, the authoritative schema is managed via Alembic in `backend/alembic/`.
