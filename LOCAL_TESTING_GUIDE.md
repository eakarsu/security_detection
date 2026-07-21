# Local verification guide

This guide uses operator-supplied secrets and preserves existing data.

## Configuration

Copy `.env.example` to `.env` and replace every placeholder with a unique value. Never reuse local credentials in a shared or production environment. Export `POSTGRES_PASSWORD` and a random `JWT_SECRET` of at least 32 characters before running any launcher.

The case provider variables must point to real HTTPS services. The template authority and source-host values are allowlists, not display labels; counsel should approve them before a jurisdiction is enabled.

## Database

Create an isolated database through your normal PostgreSQL administration process, then explicitly apply:

```sh
psql -v ON_ERROR_STOP=1 -f scripts/setup/init.sql
psql -v ON_ERROR_STOP=1 -f scripts/setup/migrations/20260720_investigation_cases.sql
```

Replaying both scripts is tested in CI. Startup scripts intentionally never apply them.

## Dependencies and builds

```sh
python -m venv backend/python/venv
backend/python/venv/bin/pip install -r backend/python/requirements.txt
(cd backend/nodejs && npm ci --ignore-scripts && npm run build)
(cd frontend && npm ci --ignore-scripts && npm run build)
```

Run local processes with `./start-local.sh`. It refuses occupied ports and stops only the child processes it starts. Run containers with `./docker-start.sh`; stop those containers with `./stop-local.sh`. Volumes are preserved.

## Tests

Use a disposable database, apply the schema and migration, and export its URL only for the integration suite:

```sh
export TEST_DATABASE_URL='postgresql://test-operator@127.0.0.1/nodeguard_test'
backend/python/venv/bin/pytest -q backend/python/tests
```

Do not point `TEST_DATABASE_URL` at shared or production data. The integration test writes isolated test records and validates that audit rows reject updates.

## Authentication check

Use a token issued by the configured identity service with matching issuer/audience and valid `sub`, `tenant_id`, and `role` claims. Invalid or expired tokens must return 403; no sample credential or signing key is checked into this repository.
