# Investigation case operations

## Security boundary

The JWT establishes the actor's tenant, user ID, and platform role. The case record independently grants `OWNER`, `EDITOR`, `LEGAL_REVIEWER`, or `VIEWER`. Both checks must pass. Revoked grants fail immediately, tenant identifiers are part of every repository lookup, privileged evidence is visible/exportable only to counsel/admin owners or legal reviewers, and the creator cannot approve their own case.

## State and evidence

The normal state sequence is `EVIDENCE_PENDING` → `REVIEW_REQUIRED` → `APPROVED` → `SIGNATURE_PENDING` → `SIGNED` → `FILED`. Provider failure enters `SIGNER_FAILED` and allows an idempotent retry. Rejection is terminal for retention purposes. Disposal changes a due terminal case to `CLOSED` and is blocked by an active legal hold.

Every evidence upload is limited to 5 MiB, decoded strictly, SHA-256 hashed, stored externally, OCR processed, and persisted as a new append-only document version with source/provider references. Updating a case uses compare-and-swap versions so conflicting writers receive HTTP 409.

## Provider contracts

Storage, OCR, signature, filing, and template services must use HTTPS and bearer tokens of at least 16 characters. Requests include an idempotency key. Non-2xx responses fail the operation; no local success result is substituted. Returned evidence must contain provider and reference fields. OCR must also return text.

The template result must include authority, HTTPS source URI, jurisdiction, version, effective range, body, and a content hash matching the body. The authority and source host must be in the configured allowlists. Counsel must own the allowlist change process.

## Audit and retention

Each mutation appends a tenant/case-scoped event containing the actor, action, payload, previous hash, and event hash. Database triggers reject update/delete operations on audit rows. Backups and replicas must preserve the audit table and triggers; operators should periodically recompute each chain and alert on a mismatch.

Retention defaults to 2,555 days from the incident date. Changing that policy requires legal approval and a migration/configuration change. Disposal requires counsel/admin authority, a due date, a terminal case, no active legal hold, and positive storage-provider disposition evidence.

## Deployment and recovery

Schema changes are operator actions and are not coupled to startup. Apply `init.sql` and the timestamped migration through the deployment system, verifying both are idempotent in a staging database. Back up PostgreSQL and provider object references before release; test restore into an isolated environment. A provider outage should surface as an error or a persisted signer-failure state, never as a fabricated success.

Release requires real provider credentials, counsel-approved jurisdiction configuration, backup/restore evidence, monitoring for provider and audit failures, and successful CI.
