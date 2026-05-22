import React, { useEffect, useState } from 'react';

const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'http://localhost:3011';

const SEVERITY_COLOR = {
  critical: '#b71c1c',
  high: '#e65100',
  medium: '#f9a825',
  low: '#388e3c',
};

const IncidentReportPDF = () => {
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/custom-views/incidents`);
        const j = await res.json();
        setIncidents(j.incidents || []);
        if (j.incidents && j.incidents.length) setSelectedId(j.incidents[0].id);
      } catch (e) {
        setStatus({ ok: false, msg: String(e) });
      }
    };
    load();
  }, []);

  const generate = async () => {
    if (!selectedId) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/incidents/${selectedId}/pdf`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      setStatus({ ok: true, msg: `PDF downloaded for ${selectedId}` });
    } catch (e) {
      setStatus({ ok: false, msg: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const selected = incidents.find((i) => i.id === selectedId);

  return (
    <div
      data-testid="incident-pdf"
      style={{
        background: '#1a1d3a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ color: '#fff', marginTop: 0 }}>Incident Report PDF</h3>
      <p style={{ color: '#b0bec5', fontSize: 13, marginTop: 0 }}>
        Pick an incident and generate a printable PDF (timeline, IOCs, impact, remediation).
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            flex: 1,
            background: '#0f1230',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '8px 10px',
          }}
        >
          {incidents.map((i) => (
            <option key={i.id} value={i.id}>
              {i.id} — {i.title}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={busy || !selectedId}
          style={{
            background: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '9px 18px',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      {selected && (
        <div
          style={{
            background: '#0f1230',
            borderRadius: 8,
            padding: 12,
            borderLeft: `4px solid ${SEVERITY_COLOR[selected.severity]}`,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>{selected.id}</span>
            <span
              style={{
                background: SEVERITY_COLOR[selected.severity],
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
                textTransform: 'uppercase',
              }}
            >
              {selected.severity}
            </span>
            <span style={{ color: '#b0bec5', fontSize: 12 }}>· {selected.status}</span>
          </div>
          <div style={{ color: '#e0e0e0', marginTop: 6 }}>{selected.title}</div>
          <div style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>
            Opened {new Date(selected.opened_at).toLocaleString()}
          </div>
        </div>
      )}
      {status && (
        <div
          style={{
            marginTop: 10,
            color: status.ok ? '#a5d6a7' : '#ef9a9a',
            fontSize: 13,
          }}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
};

export default IncidentReportPDF;
