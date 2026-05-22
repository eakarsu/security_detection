import React, { useEffect, useState } from 'react';

const SEVERITY_COLORS = {
  critical: { bg: '#b71c1c', fg: '#fff' },
  high: { bg: '#e65100', fg: '#fff' },
  medium: { bg: '#f9a825', fg: '#000' },
  low: { bg: '#388e3c', fg: '#fff' },
};

const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'http://localhost:3011';

const Badge = ({ severity }) => {
  const c = SEVERITY_COLORS[severity] || { bg: '#555', fg: '#fff' };
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {severity}
    </span>
  );
};

const fmtTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const ThreatFeed = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-views/threat-feed?limit=60`);
      const data = await res.json();
      setThreats(data.threats || []);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      data-testid="threat-feed"
      style={{
        background: '#1a1d3a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Live Threat Feed</h3>
        <span style={{ color: '#b0bec5', fontSize: 12 }}>
          {loading ? 'Loading…' : `${threats.length} detections`}
        </span>
      </div>
      {error && <div style={{ color: '#ef9a9a', fontSize: 13, marginBottom: 8 }}>Error: {error}</div>}
      <div
        style={{
          maxHeight: 480,
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}
      >
        {threats.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 160px 180px',
              gap: 12,
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
              color: '#e0e0e0',
              fontSize: 13,
            }}
          >
            <Badge severity={t.severity} />
            <div>
              <div style={{ fontWeight: 600 }}>{t.threat}</div>
              <div style={{ color: '#90a4ae', fontSize: 11 }}>
                {t.src_ip} → {t.dst_ip} · conf {(t.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ color: '#b0bec5' }}>{t.source}</div>
            <div style={{ color: '#90a4ae', fontSize: 12 }}>{fmtTime(t.timestamp)}</div>
          </div>
        ))}
        {!loading && threats.length === 0 && (
          <div style={{ padding: 20, color: '#b0bec5', textAlign: 'center' }}>No threats detected.</div>
        )}
      </div>
    </div>
  );
};

export default ThreatFeed;
