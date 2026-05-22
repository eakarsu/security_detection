import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'http://localhost:3011';

const COLORS = {
  critical: '#b71c1c',
  high: '#e65100',
  medium: '#f9a825',
  low: '#388e3c',
};

const AlertSeverityDash = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/custom-views/alert-severity`);
        const j = await res.json();
        setData(j);
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div data-testid="severity-dash" style={{ color: '#b0bec5' }}>Loading severity data…</div>;
  if (error) return <div data-testid="severity-dash" style={{ color: '#ef9a9a' }}>Error: {error}</div>;
  if (!data) return null;

  return (
    <div
      data-testid="severity-dash"
      style={{
        background: '#1a1d3a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ color: '#fff', marginTop: 0 }}>Alert Severity Dashboard (24h)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        <div style={{ background: '#0f1230', borderRadius: 8, padding: 12, height: 280 }}>
          <div style={{ color: '#b0bec5', fontSize: 12, marginBottom: 4 }}>Total by Severity</div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={data.donut}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.donut.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name] || '#666'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#0f1230', borderRadius: 8, padding: 12, height: 280 }}>
          <div style={{ color: '#b0bec5', fontSize: 12, marginBottom: 4 }}>Hourly Alert Counts</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="#90a4ae" fontSize={10} />
              <YAxis stroke="#90a4ae" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: '#1a1d3a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                }}
              />
              <Legend />
              <Bar dataKey="critical" stackId="a" fill={COLORS.critical} />
              <Bar dataKey="high" stackId="a" fill={COLORS.high} />
              <Bar dataKey="medium" stackId="a" fill={COLORS.medium} />
              <Bar dataKey="low" stackId="a" fill={COLORS.low} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {['critical', 'high', 'medium', 'low'].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#0f1230',
              borderRadius: 8,
              borderLeft: `4px solid ${COLORS[s]}`,
            }}
          >
            <div style={{ color: '#b0bec5', fontSize: 11, textTransform: 'uppercase' }}>{s}</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{data.totals[s]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertSeverityDash;
