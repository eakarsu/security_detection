// Shared TypeScript interfaces for NodeGuard AI Security Platform

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status?: string;
  email_verified?: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Incident {
  incident_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'blocked';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  tags: string[];
  source_ip?: string;
  destination_ip?: string;
  user_id?: string;
  endpoint?: string;
  ml_score?: number;
  event_type?: string;
}

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  description: string;
  tags: string[];
  is_active: boolean;
}

export interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  status: 'active' | 'inactive' | 'error';
  last_updated: string;
  indicators_count: number;
  feed_type: string;
}

export interface ComplianceControl {
  id: string;
  framework: string;
  control_id: string;
  title: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'not_tested';
  severity: 'low' | 'medium' | 'high' | 'critical';
  last_tested: string;
  evidence: string[];
  remediation: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  source: string;
  created_at: string;
}

export interface Column<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkUpdateItem {
  id: string;
  updates: Record<string, any>;
}

export interface BulkUpdateRequest {
  items: BulkUpdateItem[];
}

// SIEM Types
export interface NormalizedLog {
  id: string;
  timestamp: string;
  source_type: string;
  source_name: string;
  action: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  src_ip: string;
  dst_ip: string;
  src_port: number | null;
  dst_port: number | null;
  protocol: string;
  username: string;
  hostname: string;
  message: string;
  extra_fields: Record<string, any>;
}

export interface LogSource {
  id: string;
  name: string;
  source_type: string;
  format: string;
  description: string;
  host: string;
  port: number;
  enabled: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface AlertingRule {
  id: string;
  name: string;
  description: string;
  conditions: any;
  threshold: number;
  window_seconds: number;
  severity: string;
  actions: any;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface RetentionPolicy {
  id: string;
  source_type: string;
  retention_days: number;
  archive_enabled: boolean;
  archive_location: string;
  created_at: string;
}

// Threat Hunting Types
export interface HuntHypothesis {
  id: string;
  title: string;
  hypothesis: string;
  status: 'draft' | 'active' | 'validated' | 'invalidated' | 'closed';
  mitre_tactic: string;
  mitre_technique: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigned_to: string;
  created_by: string;
  findings_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
  findings?: HuntFinding[];
}

export interface HuntFinding {
  id: string;
  hunt_id: string;
  title: string;
  description: string;
  evidence: any;
  severity: string;
  created_at: string;
}

export interface IOCSweep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ioc_list: Array<{ value: string; type: string }>;
  results_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface IOCSweepResult {
  id: string;
  ioc_value: string;
  ioc_type: string;
  matched_field: string;
  context: string;
  matched_at: string;
}

export interface UEBABaseline {
  id: string;
  entity_id: string;
  entity_type: 'user' | 'host' | 'service' | 'application';
  baseline_data: any;
  sample_count: number;
  last_updated: string;
}

export interface UEBAAnomaly {
  id: string;
  entity_id: string;
  entity_type: string;
  anomaly_type: string;
  score: number;
  deviation: number;
  details: any;
  detected_at: string;
  acknowledged: boolean;
}

// MITRE ATT&CK Types
export interface MITRETechnique {
  id: string;
  name: string;
  description: string;
  detection_count?: number;
  covered?: boolean;
}

export interface MITRETactic {
  id: string;
  name: string;
  techniques: MITRETechnique[];
}

export interface MITREMapping {
  id: string;
  detection_type: string;
  tactic_id: string;
  tactic_name: string;
  technique_id: string;
  technique_name: string;
  confidence: string;
  notes: string;
  created_at: string;
}

// Kill Chain Types
export interface KillChainEvent {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
  sequence_order: number;
}

export interface KillChainPhase {
  id: string;
  name: string;
  order: number;
  description: string;
  events: KillChainEvent[];
  event_count: number;
}

export interface KillChain {
  chain_id: string;
  name: string;
  description: string;
  src_ip: string;
  status: string;
  created_at: string;
  phases: KillChainPhase[];
}

// Sigma Rules
export interface SigmaRule {
  id: string;
  title: string;
  description: string;
  yaml_content?: string;
  parsed_logic?: any;
  status: 'active' | 'testing' | 'disabled';
  severity: string;
  logsource_category: string;
  logsource_product?: string;
  tags: string[];
  author?: string;
  created_at: string;
}

// Advanced Detection Types
export interface CustomDetectionRule {
  id: string;
  name: string;
  description: string;
  conditions: any;
  logic_operator: 'AND' | 'OR';
  actions: any;
  severity: string;
  enabled: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface YARARule {
  id: string;
  name: string;
  description: string;
  rule_content: string;
  tags: string[];
  enabled: boolean;
  compiled: boolean;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  event_sequence: any;
  window_seconds: number;
  threshold: number;
  severity: string;
  enabled: boolean;
  trigger_count: number;
  created_at: string;
}
