import React, { useEffect, useState } from 'react';

const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'http://localhost:3011';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SEVERITY_COLOR = {
  critical: '#b71c1c',
  high: '#e65100',
  medium: '#f9a825',
  low: '#388e3c',
};

const blankForm = { name: '', pattern: '', severity: 'medium', enabled: true, description: '' };

const DetectionRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState(null);
  const [testEvent, setTestEvent] = useState(
    'Sep 25 14:32:11 web01 sshd[1234]: Failed password for root from 203.0.113.55 port 22 ssh2'
  );
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/rules`);
      const j = await res.json();
      setRules(j.rules || []);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      pattern: rule.pattern,
      severity: rule.severity,
      enabled: rule.enabled,
      description: rule.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const save = async () => {
    setError(null);
    try {
      const url = editingId
        ? `${API_BASE}/api/custom-views/rules/${editingId}`
        : `${API_BASE}/api/custom-views/rules`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed');
      cancelEdit();
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/rules/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed');
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const toggleEnabled = async (rule) => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed');
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const runTest = async (ruleId) => {
    setError(null);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/rules/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId, event: testEvent }),
      });
      const j = await res.json();
      setTestResult(j);
    } catch (e) {
      setError(String(e));
    }
  };

  const inputStyle = {
    background: '#0f1230',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '7px 9px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      data-testid="rules-editor"
      style={{
        background: '#1a1d3a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ color: '#fff', marginTop: 0 }}>Detection Rules Editor</h3>
      {error && <div style={{ color: '#ef9a9a', marginBottom: 10, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div>
          <div
            style={{
              background: '#0f1230',
              borderRadius: 8,
              maxHeight: 360,
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {rules.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{r.name}</span>
                    <span
                      style={{
                        background: SEVERITY_COLOR[r.severity],
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 8,
                        fontSize: 10,
                        textTransform: 'uppercase',
                      }}
                    >
                      {r.severity}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: r.enabled ? '#a5d6a7' : '#90a4ae',
                        border: `1px solid ${r.enabled ? '#4caf50' : '#555'}`,
                        padding: '0px 5px',
                        borderRadius: 6,
                      }}
                    >
                      {r.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <code style={{ color: '#90caf9', fontSize: 11, display: 'block', marginTop: 4 }}>
                    {r.pattern}
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                  <button onClick={() => startEdit(r)} style={btnSm('#2196f3')}>Edit</button>
                  <button onClick={() => toggleEnabled(r)} style={btnSm('#607d8b')}>
                    {r.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => runTest(r.id)} style={btnSm('#26a69a')}>Test</button>
                  <button onClick={() => remove(r.id)} style={btnSm('#c62828')}>Delete</button>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div style={{ padding: 20, color: '#b0bec5', textAlign: 'center' }}>No rules.</div>
            )}
          </div>
        </div>

        <div>
          <div style={{ color: '#b0bec5', fontSize: 12, marginBottom: 6 }}>
            {editingId ? `Editing ${editingId}` : 'Create new rule'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              placeholder="Rule name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Signature pattern (regex)"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              style={inputStyle}
            />
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              style={inputStyle}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label style={{ color: '#b0bec5', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} style={btnSm('#4caf50', true)}>
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button onClick={cancelEdit} style={btnSm('#607d8b', true)}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#0f1230', borderRadius: 8, padding: 12 }}>
        <div style={{ color: '#b0bec5', fontSize: 12, marginBottom: 6 }}>
          Test rules against a sample event (click "Test" on a rule above)
        </div>
        <textarea
          value={testEvent}
          onChange={(e) => setTestEvent(e.target.value)}
          style={{ ...inputStyle, minHeight: 50, fontFamily: 'monospace', fontSize: 12 }}
        />
        {testResult && (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              background: testResult.matched ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.12)',
              border: `1px solid ${testResult.matched ? '#4caf50' : '#f44336'}`,
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
            }}
          >
            <strong>{testResult.matched ? 'MATCH' : 'NO MATCH'}</strong>
            {testResult.rule && <> · rule {testResult.rule.name} ({testResult.rule.severity})</>}
            {testResult.matched && testResult.groups && testResult.groups.length > 0 && (
              <div style={{ color: '#a5d6a7', fontSize: 12, marginTop: 4 }}>
                Captured: {testResult.groups.join(' | ')}
              </div>
            )}
            {testResult.error && (
              <div style={{ color: '#ef9a9a', fontSize: 12, marginTop: 4 }}>Error: {testResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const btnSm = (bg, wide = false) => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 5,
  padding: wide ? '8px 16px' : '4px 10px',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
});

export default DetectionRulesEditor;
