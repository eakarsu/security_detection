# NodeGuard security detection and investigation

NodeGuard combines security telemetry services with a governed incident-investigation case workflow. The case workflow is the production-focused journey in this repository: it records evidence provenance and versions, enforces tenant and case permissions, requires independent legal review, integrates external OCR/storage/signature/filing/template providers, applies legal holds and retention, and writes a tamper-resistant audit chain.

The external provider adapters are real HTTPS contracts. They fail closed when credentials, allowlists, or provider evidence are missing; the application does not fabricate a successful OCR, signature, filing, storage, or authoritative-template result.

## Prerequisites

- Python 3.12 and PostgreSQL 16
- Node.js 22
- Docker Compose when running the container stack
- Real provider endpoints and credentials for the governed case journey

Copy `.env.example` to a private `.env`, replace every placeholder, and keep that file out of version control. `JWT_SECRET` must be a random value of at least 32 characters. Template authority and source-host allowlists must be approved by counsel for the jurisdictions being operated.

## Safe startup

Startup never creates, migrates, resets, or seeds a database and never kills a process that it did not start.

Apply the reviewed schema explicitly:

```sh
psql -v ON_ERROR_STOP=1 -f scripts/setup/init.sql
psql -v ON_ERROR_STOP=1 -f scripts/setup/migrations/20260720_investigation_cases.sql
```

For local processes, install dependencies in `backend/python/venv`, `backend/nodejs`, and `frontend`, ensure PostgreSQL and Redis are already available, export required secrets, then run:

```sh
./start-local.sh
```

For containers:

```sh
./docker-start.sh
```

`./stop-local.sh` stops only this project's Compose services and preserves volumes. Rebuild scripts preserve containers and data as well.

## Investigation-case journey

All `/api/investigation-cases` routes require an HS256 bearer token with verified `iss`, `aud`, `sub`, `tenant_id`, and `role` claims. A normal journey is:

1. Create a case; the service resolves and validates the authoritative jurisdiction template and its effective date.
2. Grant case-scoped access and upload evidence. Storage and OCR provenance is recorded with a content hash and immutable document version.
3. Submit for review. A different counsel/admin user with `LEGAL_REVIEWER` access must confirm jurisdiction and effective date.
4. Request and reconcile an e-signature, then file with the configured provider. Calls use idempotency keys and persist provider references.
5. Export with privileged-document redaction by default, place or release legal holds, and perform retention disposal only when due.

The state transition and provider contracts are documented in `docs/INVESTIGATION_CASE_OPERATIONS.md`. FastAPI exposes the request schema at `/docs` when Swagger is enabled.

## Verification

CI replays the schema and case migration twice against PostgreSQL, runs Python risk and database integration tests, compiles both APIs and the frontend, audits dependencies, scans the checked-out tree for secrets, and validates Compose.

Focused local commands:

```sh
pytest -q backend/python/tests
(cd backend/nodejs && npm ci --ignore-scripts && npm run build && npm audit --audit-level=high)
(cd frontend && npm ci --ignore-scripts && npm run build && npm audit --audit-level=high)
```

## Production release gates

Passing tests is not legal approval. Before serving a jurisdiction, counsel must approve the authority/host allowlists, template versions and effective dates, retention period, privilege policy, and export policy. Operators must also configure real provider accounts, run backup/restore and disaster-recovery exercises, and monitor provider failures and audit-chain verification.
