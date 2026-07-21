CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS security;

CREATE TABLE IF NOT EXISTS security.investigation_cases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  incident_id UUID NOT NULL REFERENCES security.events(id) ON DELETE RESTRICT,
  state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS investigation_cases_tenant_incident_idx
  ON security.investigation_cases (tenant_id, incident_id);

CREATE TABLE IF NOT EXISTS security.investigation_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES security.investigation_cases(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  content_hash TEXT NOT NULL,
  storage_reference TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  privileged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT investigation_document_version_key UNIQUE (case_id, document_id, version),
  CONSTRAINT investigation_document_hash_key UNIQUE (case_id, document_id, content_hash)
);

CREATE TABLE IF NOT EXISTS security.investigation_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES security.investigation_cases(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT investigation_audit_sequence_key UNIQUE (case_id, sequence)
);
CREATE INDEX IF NOT EXISTS investigation_audit_tenant_case_idx
  ON security.investigation_audit_events (tenant_id, case_id, sequence);

CREATE OR REPLACE FUNCTION security.reject_investigation_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'investigation evidence is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investigation_audit_immutable ON security.investigation_audit_events;
CREATE TRIGGER investigation_audit_immutable
BEFORE UPDATE OR DELETE ON security.investigation_audit_events
FOR EACH ROW EXECUTE FUNCTION security.reject_investigation_evidence_mutation();

DROP TRIGGER IF EXISTS investigation_document_versions_immutable ON security.investigation_document_versions;
CREATE TRIGGER investigation_document_versions_immutable
BEFORE UPDATE OR DELETE ON security.investigation_document_versions
FOR EACH ROW EXECUTE FUNCTION security.reject_investigation_evidence_mutation();
