# Completeness Review: security_detection

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 304 project files (222 source files), 5 manifest(s), 8 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished legal/document workflow application, not just an empty scaffold. Inspection found 222 source files across `backend/`, `frontend/`, `mobile/`, `scripts/` using Next.js, React, Express, NestJS, Rails; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Add matter-scoped permissions, document provenance, version history, privileged-access controls, and immutable audit events.
2. Integrate OCR, e-signature, filing/storage, retention/legal-hold, and authoritative template sources.
3. Require human legal review and jurisdiction/effective-date validation for generated clauses, forms, or recommendations.
4. Test redaction, conflicting versions, signer failure, access revocation, export, and retention workflows end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `README.md`
- `backend/nodejs/src/auth/auth.module.ts:19`
- `frontend/src/App.tsx:51`
- `backend/python/main.py`
- `scripts/test/security_test_cases.py`
- `requirements.txt`

## Recommended next action

Choose one real legal/document workflow journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-20)

The recommended incident-investigation case journey is now implemented as a persisted, provider-backed workflow rather than a generated gap page:

- Tenant and case-scoped `OWNER`, `EDITOR`, `LEGAL_REVIEWER`, and `VIEWER` grants enforce active access, immediate revocation, privileged evidence visibility, and independent counsel approval.
- Evidence is SHA-256 hashed and stored with source/provider provenance, OCR evidence, immutable document versions, optimistic concurrency, and a chained audit log protected from update/delete by database triggers.
- Typed HTTPS adapters cover authoritative templates, storage, OCR, e-signature, filing, export storage, and retention disposition. Missing credentials, non-HTTPS endpoints, unapproved template authorities/hosts, malformed evidence, and provider failures fail closed.
- Template digest, jurisdiction, and effective-date checks run at creation and approval. Filing requires independent legal approval and a reconciled signature; legal hold blocks retention; privileged exports are redacted unless counsel-level access is present.
- Risk tests cover redaction, tenant isolation, access revocation, conflicting/stale versions, template provenance, independent review, signer failure/retry/idempotency, filing, export, legal hold/retention, audit chaining, provider configuration, and database tamper rejection.
- CI now replays schema/migrations twice against PostgreSQL, runs unit/integration tests and compilation, builds/audits both Node projects, scans the checked-out tree for secrets, and validates Compose configuration.
- Generated gap routes and fake success paths were removed or changed to fail closed. JWT/database secrets are required, authentication now verifies issuer/audience and carries tenant identity, reset/verification tokens are stored as digests, startup is decoupled from migrations/seeds, and destructive host-wide reset/kill automation was removed.

Local verification completed with 27 Python tests against an isolated PostgreSQL database (including JWT failure paths and immutable-audit rejection), a clean focused Python dependency audit, clean Node and frontend builds, zero npm audit findings at the low-severity threshold, successful Compose validation, and zero current-tree Gitleaks findings. A full-history scan still identifies one legacy authorization-header example in commit `ce1efd7`; it is absent from the current guide, but the owner must confirm it was synthetic or rotate/revoke it and clean history before treating repository history as credential-safe. CI generates validation credentials per run. The Docker daemon was unavailable for image builds, so an image build remains an explicit release-gate action.

Production activation still requires external, operator-owned evidence: real provider accounts, counsel-approved jurisdiction/template authority allowlists and retention policy, plus backup/restore and disaster-recovery exercises. These are explicit release gates and are not replaced by automated tests.

## Runtime acceptance refresh (2026-07-20)

- The initial isolated attempt on PostgreSQL/API/UI ports `55697`/`6194`/`6195` was retired after production startup exposed a decorator-order crash in `SecurityEventInput`; no port from that attempt was reused.
- After moving the DTO ahead of its decorated controller and rebuilding, the controller module loaded cleanly. The single retry used fresh ports `55721`/`6236`/`6237` and passed `start.sh`, dynamic administrator provisioning, login, authenticated session, and API checks (`startup_login_session_api`).
- The Node backend build, frontend production build, and all 36 Node tests passed. Python helper syntax passed; Python tests were not run because the available interpreter has no `pytest` installation.
- `start.sh` now launches only prebuilt artifacts, requires explicit ports and production secrets, and performs no package installation, build, schema change, seed, service mutation, or broad process termination. All six ports from both attempts were confirmed released after validation.
