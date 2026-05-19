// customViews.js - Security threat detection custom views API
// Mounted at /api/custom-views (outside NestJS global prefix)

const express = require('express');
const PDFDocument = require('pdfkit');

const router = express.Router();

// ============================================================
// In-memory state for rules (CRUD persists for process lifetime)
// ============================================================
let RULES = [
  {
    id: 'rule-1',
    name: 'SQL Injection Attempt',
    pattern: "(?i)(union\\s+select|drop\\s+table|or\\s+1=1)",
    severity: 'critical',
    enabled: true,
    description: 'Detects classic SQL injection signatures in HTTP payloads.',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Brute Force SSH',
    pattern: 'Failed password.*from (\\d+\\.\\d+\\.\\d+\\.\\d+)',
    severity: 'high',
    enabled: true,
    description: 'Detects repeated SSH authentication failures.',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'rule-3',
    name: 'Suspicious PowerShell',
    pattern: '(?i)(invoke-expression|downloadstring|frombase64string)',
    severity: 'high',
    enabled: true,
    description: 'PowerShell living-off-the-land patterns.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'rule-4',
    name: 'XSS Reflection',
    pattern: '(?i)(<script|onerror=|javascript:)',
    severity: 'medium',
    enabled: true,
    description: 'Reflected cross-site scripting attempt.',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'rule-5',
    name: 'Port Scan',
    pattern: 'TCP SYN.*ports=\\d+,\\d+,\\d+',
    severity: 'low',
    enabled: false,
    description: 'Sequential TCP SYN scan signature.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

let nextRuleId = 6;

// ============================================================
// Synthetic threat feed (deterministic + recent timestamps)
// ============================================================
const SOURCES = ['Snort IDS', 'Suricata', 'Wazuh EDR', 'CloudTrail', 'Zeek', 'Falco', 'Osquery'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const THREAT_TYPES = [
  { type: 'Malware Beacon C2', sev: 'critical' },
  { type: 'Lateral Movement (PsExec)', sev: 'high' },
  { type: 'Credential Dumping (LSASS)', sev: 'critical' },
  { type: 'Suspicious DNS Tunneling', sev: 'high' },
  { type: 'Reverse Shell Detected', sev: 'critical' },
  { type: 'Privilege Escalation Attempt', sev: 'high' },
  { type: 'Brute Force Login', sev: 'medium' },
  { type: 'Anomalous Data Egress', sev: 'high' },
  { type: 'Failed MFA Challenge', sev: 'low' },
  { type: 'Port Scan Detected', sev: 'low' },
  { type: 'Phishing Link Clicked', sev: 'medium' },
  { type: 'Ransomware File Encryption', sev: 'critical' },
  { type: 'Suspicious Process Spawn', sev: 'medium' },
  { type: 'Outbound Connection to Tor', sev: 'high' },
];

function buildThreatFeed(limit = 50) {
  const now = Date.now();
  const feed = [];
  for (let i = 0; i < limit; i++) {
    const t = THREAT_TYPES[i % THREAT_TYPES.length];
    const source = SOURCES[i % SOURCES.length];
    const minutesAgo = i * 7 + ((i * 13) % 11);
    feed.push({
      id: `thr-${10000 + i}`,
      threat: t.type,
      severity: t.sev,
      source,
      src_ip: `10.${(i * 3) % 255}.${(i * 7) % 255}.${(i * 11) % 255}`,
      dst_ip: `192.168.${i % 255}.${(i * 17) % 255}`,
      timestamp: new Date(now - minutesAgo * 60000).toISOString(),
      confidence: 0.55 + ((i * 7) % 45) / 100,
    });
  }
  return feed;
}

// ============================================================
// Severity counts over last 24h (hourly buckets)
// ============================================================
function buildSeverityStats() {
  const now = Date.now();
  const hours = [];
  const totals = { critical: 0, high: 0, medium: 0, low: 0 };
  for (let h = 23; h >= 0; h--) {
    const ts = new Date(now - h * 3600000);
    const bucket = {
      hour: ts.toISOString().slice(11, 13) + ':00',
      timestamp: ts.toISOString(),
      critical: ((h * 3) % 7),
      high: ((h * 5) % 11) + 1,
      medium: ((h * 7) % 13) + 2,
      low: ((h * 11) % 17) + 3,
    };
    totals.critical += bucket.critical;
    totals.high += bucket.high;
    totals.medium += bucket.medium;
    totals.low += bucket.low;
    hours.push(bucket);
  }
  const donut = SEVERITIES.map((s) => ({ name: s, value: totals[s] }));
  return { hourly: hours, totals, donut };
}

// ============================================================
// Synthetic incidents (for PDF picker)
// ============================================================
const INCIDENTS = [
  {
    id: 'INC-2026-0042',
    title: 'Ransomware Outbreak - Finance Subnet',
    severity: 'critical',
    opened_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    status: 'contained',
    impact: 'Encryption of 142 files across 6 workstations in finance VLAN. Backups intact.',
    iocs: ['hash:9f1c...e8a2', 'ip:185.220.101.34', 'domain:c2-update[.]xyz'],
    timeline: [
      { t: '-18h', event: 'Initial detection: anomalous file rename burst on FIN-WS-12' },
      { t: '-17h', event: 'Endpoint isolated by EDR auto-response' },
      { t: '-16h', event: 'C2 callout to 185.220.101.34 blocked at firewall' },
      { t: '-14h', event: 'Hunt confirms lateral spread to 5 additional hosts' },
      { t: '-08h', event: 'Forensic image captured, all hosts isolated' },
      { t: '-02h', event: 'Eradication complete, restoration started' },
    ],
    remediation: 'Re-image affected endpoints from gold image, rotate AD credentials for affected users, deploy YARA rule for the dropper hash.',
  },
  {
    id: 'INC-2026-0043',
    title: 'Credential Stuffing Attack - Customer Portal',
    severity: 'high',
    opened_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    status: 'resolved',
    impact: '12,400 login attempts against 8,200 accounts. 14 accounts compromised, all locked and reset.',
    iocs: ['asn:14618', 'ua:python-requests/2.31', 'ip-range:45.83.0.0/16'],
    timeline: [
      { t: '-36h', event: 'WAF rate-limit threshold tripped' },
      { t: '-35h', event: 'Geo + ASN block applied at edge' },
      { t: '-30h', event: 'MFA enforcement enabled for all suspect logins' },
      { t: '-04h', event: 'Affected accounts notified and reset' },
    ],
    remediation: 'Mandate MFA, deploy CAPTCHA on login, integrate HaveIBeenPwned API for password strength.',
  },
  {
    id: 'INC-2026-0044',
    title: 'Insider Data Exfiltration - DLP Trigger',
    severity: 'high',
    opened_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    status: 'investigating',
    impact: '2.3 GB of customer PII uploaded to personal cloud storage by an authorized user.',
    iocs: ['user:jdoe@corp', 'dst:upload.mega[.]nz', 'volume:2.3GB'],
    timeline: [
      { t: '-72h', event: 'DLP alert: bulk PII pattern + external upload' },
      { t: '-70h', event: 'User session terminated, account suspended' },
      { t: '-48h', event: 'Legal + HR engaged for investigation' },
      { t: '-24h', event: 'Endpoint forensics confirms intent' },
    ],
    remediation: 'Block all consumer cloud storage at egress, deploy UEBA baseline, require manager approval for bulk exports.',
  },
];

// ============================================================
// Routes
// ============================================================

// GET /api/custom-views/threat-feed
router.get('/threat-feed', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json({
    success: true,
    count: limit,
    threats: buildThreatFeed(limit),
    generated_at: new Date().toISOString(),
  });
});

// GET /api/custom-views/alert-severity
router.get('/alert-severity', (req, res) => {
  const stats = buildSeverityStats();
  res.json({
    success: true,
    window: '24h',
    ...stats,
    generated_at: new Date().toISOString(),
  });
});

// GET /api/custom-views/incidents
router.get('/incidents', (req, res) => {
  res.json({
    success: true,
    count: INCIDENTS.length,
    incidents: INCIDENTS.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      opened_at: i.opened_at,
    })),
  });
});

// GET /api/custom-views/incidents/:id/pdf
router.get('/incidents/:id/pdf', (req, res) => {
  const incident = INCIDENTS.find((i) => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${incident.id}.pdf"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(res);

  // Header
  doc.fillColor('#0a0e27').fontSize(20).text('Security Incident Report', { align: 'left' });
  doc.moveDown(0.3);
  doc.fillColor('#666').fontSize(10).text(`Generated ${new Date().toISOString()}`);
  doc.moveDown(0.8);

  // Incident summary
  doc.fillColor('#000').fontSize(14).text(incident.id, { continued: true });
  doc.fillColor('#c62828').fontSize(11).text(`   [${incident.severity.toUpperCase()}]`);
  doc.fillColor('#000').fontSize(13).text(incident.title);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#555').text(`Status: ${incident.status}`);
  doc.text(`Opened: ${incident.opened_at}`);
  doc.moveDown(0.8);

  // Impact
  doc.fillColor('#000').fontSize(13).text('Impact');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#333').text(incident.impact, { width: 500 });
  doc.moveDown(0.8);

  // IOCs
  doc.fillColor('#000').fontSize(13).text('Indicators of Compromise');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#333');
  incident.iocs.forEach((ioc) => doc.text(`  • ${ioc}`));
  doc.moveDown(0.8);

  // Timeline
  doc.fillColor('#000').fontSize(13).text('Timeline');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#333');
  incident.timeline.forEach((step) => {
    doc.text(`  ${step.t.padEnd(6)}  ${step.event}`, { width: 500 });
  });
  doc.moveDown(0.8);

  // Remediation
  doc.fillColor('#000').fontSize(13).text('Remediation');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#333').text(incident.remediation, { width: 500 });
  doc.moveDown(1.2);

  doc.fontSize(8).fillColor('#999').text('NodeGuard AI Security Platform - Confidential', { align: 'center' });
  doc.end();
});

// GET /api/custom-views/rules
router.get('/rules', (req, res) => {
  res.json({ success: true, count: RULES.length, rules: RULES });
});

// POST /api/custom-views/rules
router.post('/rules', (req, res) => {
  const { name, pattern, severity, enabled, description } = req.body || {};
  if (!name || !pattern) {
    return res.status(400).json({ success: false, error: 'name and pattern are required' });
  }
  const rule = {
    id: `rule-${nextRuleId++}`,
    name: String(name),
    pattern: String(pattern),
    severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'medium',
    enabled: enabled !== false,
    description: description ? String(description) : '',
    created_at: new Date().toISOString(),
  };
  RULES.push(rule);
  res.json({ success: true, rule });
});

// PUT /api/custom-views/rules/:id
router.put('/rules/:id', (req, res) => {
  const idx = RULES.findIndex((r) => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Rule not found' });
  const { name, pattern, severity, enabled, description } = req.body || {};
  RULES[idx] = {
    ...RULES[idx],
    ...(name !== undefined && { name: String(name) }),
    ...(pattern !== undefined && { pattern: String(pattern) }),
    ...(severity && ['critical', 'high', 'medium', 'low'].includes(severity) && { severity }),
    ...(enabled !== undefined && { enabled: !!enabled }),
    ...(description !== undefined && { description: String(description) }),
  };
  res.json({ success: true, rule: RULES[idx] });
});

// DELETE /api/custom-views/rules/:id
router.delete('/rules/:id', (req, res) => {
  const idx = RULES.findIndex((r) => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Rule not found' });
  const [removed] = RULES.splice(idx, 1);
  res.json({ success: true, removed });
});

// POST /api/custom-views/rules/test  { rule_id?, pattern?, event }
router.post('/rules/test', (req, res) => {
  const { rule_id, pattern, event } = req.body || {};
  let testPattern = pattern;
  let ruleRef = null;
  if (rule_id) {
    ruleRef = RULES.find((r) => r.id === rule_id);
    if (!ruleRef) return res.status(404).json({ success: false, error: 'Rule not found' });
    testPattern = ruleRef.pattern;
  }
  if (!testPattern || typeof event !== 'string') {
    return res.status(400).json({ success: false, error: 'pattern (or rule_id) and event string required' });
  }
  let matched = false;
  let groups = [];
  let error = null;
  try {
    const re = new RegExp(testPattern);
    const m = event.match(re);
    matched = !!m;
    groups = m ? m.slice(0) : [];
  } catch (e) {
    error = e.message;
  }
  res.json({
    success: !error,
    matched,
    groups,
    error,
    rule: ruleRef ? { id: ruleRef.id, name: ruleRef.name, severity: ruleRef.severity } : null,
  });
});

module.exports = router;
