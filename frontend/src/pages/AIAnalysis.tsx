import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  AutoAwesome as AnalyzeIcon,
  HelpOutline as ExplainIcon,
  Lightbulb as RecommendIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiConfig } from '../config/api.ts';
import toast from 'react-hot-toast';

/**
 * AIAnalysis surfaces three Python backend AI endpoints:
 *   POST /api/ai/analyze      — full AI threat analysis
 *   POST /api/ai/explain      — natural-language threat explanation
 *   POST /api/ai/recommend    — security recommendations
 *
 * These endpoints accept arbitrary security-event JSON and route through
 * the project's OpenRouterService. Returns 503 if the AI service is not
 * configured (no OPENROUTER_API_KEY).
 */

const SAMPLE_EVENT = JSON.stringify(
  {
    event_id: 'evt-001',
    source_ip: '192.168.1.42',
    destination_ip: '8.8.8.8',
    user: 'jdoe',
    action: 'failed_login',
    failed_attempts: 12,
    timestamp: new Date().toISOString(),
    severity: 'high',
    rule_name: 'Multiple failed logins from single IP',
  },
  null,
  2
);

type TabKey = 'analyze' | 'explain' | 'recommend';

const TAB_META: Record<TabKey, { label: string; description: string; endpoint: string; payloadKey: string | null; icon: React.ReactNode }> = {
  analyze: {
    label: 'Analyze',
    description: 'Comprehensive threat analysis: summary, risk indicators, recommendations, confidence.',
    endpoint: '/api/ai/analyze',
    payloadKey: 'event_data',
    icon: <AnalyzeIcon fontSize="small" />,
  },
  explain: {
    label: 'Explain',
    description: 'Plain-English explanation of an event with key indicators and mitigation steps.',
    endpoint: '/api/ai/explain',
    payloadKey: null, // raw event JSON is the body
    icon: <ExplainIcon fontSize="small" />,
  },
  recommend: {
    label: 'Recommend',
    description: 'Actionable recommendations: immediate actions, investigation steps, prevention.',
    endpoint: '/api/ai/recommend',
    payloadKey: null,
    icon: <RecommendIcon fontSize="small" />,
  },
};

const AIAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('analyze');
  const [eventJson, setEventJson] = useState<string>(SAMPLE_EVENT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const submit = async () => {
    setError(null);
    setResult(null);
    setServiceUnavailable(false);

    let parsed: any;
    try {
      parsed = JSON.parse(eventJson);
    } catch {
      setError('Event JSON is not valid');
      return;
    }

    const meta = TAB_META[activeTab];
    const body = meta.payloadKey ? { [meta.payloadKey]: parsed } : parsed;

    setLoading(true);
    try {
      const cfg = getApiConfig();
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.post(`${cfg.pythonApiUrl}${meta.endpoint}`, body, { headers });
      setResult(res.data);
      toast.success('AI analysis complete');
    } catch (e: any) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message;
      if (status === 503) {
        setServiceUnavailable(true);
      } else {
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      toast.error('AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          AI Threat Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submit a security event to OpenRouter-backed analysis routes for analyze / explain / recommend output.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            setResult(null);
            setError(null);
            setServiceUnavailable(false);
          }}
          variant="fullWidth"
        >
          {(Object.keys(TAB_META) as TabKey[]).map((k) => (
            <Tab key={k} value={k} icon={TAB_META[k].icon as any} iconPosition="start" label={TAB_META[k].label} />
          ))}
        </Tabs>
      </Paper>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {TAB_META[activeTab].description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Endpoint: <code>{TAB_META[activeTab].endpoint}</code>
          </Typography>

          <Box sx={{ mt: 2 }}>
            <TextField
              label="Event JSON"
              multiline
              fullWidth
              minRows={10}
              maxRows={20}
              value={eventJson}
              onChange={(e) => setEventJson(e.target.value)}
              InputProps={{
                style: { fontFamily: 'monospace', fontSize: 13 },
              }}
            />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={submit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : (TAB_META[activeTab].icon as any)}
            >
              {loading ? 'Running...' : `Run ${TAB_META[activeTab].label}`}
            </Button>
            <Button variant="outlined" onClick={() => setEventJson(SAMPLE_EVENT)} disabled={loading}>
              Reset Sample
            </Button>
          </Box>
        </CardContent>
      </Card>

      {serviceUnavailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          AI service is not configured (HTTP 503). Set <code>OPENROUTER_API_KEY</code> on the Python backend and try again.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Result
            </Typography>
            <Box
              component="pre"
              sx={{
                background: 'rgba(255,255,255,0.04)',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AIAnalysis;
