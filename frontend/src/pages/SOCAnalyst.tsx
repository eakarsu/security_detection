import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  BugReport as BugIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Gavel as GavelIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiConfig } from '../config/api.ts';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    action_taken?: string;
    confidence?: number;
    severity_assessment?: string;
    suggestions?: string[];
    mitre_techniques?: Array<{ technique_id: string; name: string; tactic: string }>;
    recommended_actions?: Array<{ action: string; priority: string; rationale: string }>;
    related_data?: Record<string, any>;
  };
}

interface SOCStats {
  open_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  active_incidents: number;
  mean_triage_time_min: number;
  alerts_last_24h: number;
  false_positive_rate: number;
  active_sessions: number;
}

const ACTION_OPTIONS = [
  { value: '', label: 'General Chat', icon: <AIIcon fontSize="small" /> },
  { value: 'triage_alert', label: 'Triage Alert', icon: <WarningIcon fontSize="small" /> },
  { value: 'investigate_incident', label: 'Investigate', icon: <SearchIcon fontSize="small" /> },
  { value: 'correlate_events', label: 'Correlate Events', icon: <TrendingUpIcon fontSize="small" /> },
  { value: 'hunt_threats', label: 'Hunt Threats', icon: <BugIcon fontSize="small" /> },
  { value: 'assess_risk', label: 'Assess Risk', icon: <AssessmentIcon fontSize="small" /> },
  { value: 'recommend_response', label: 'Recommend Response', icon: <GavelIcon fontSize="small" /> },
  { value: 'generate_report', label: 'Generate Report', icon: <AssessmentIcon fontSize="small" /> },
];

const QUICK_PROMPTS = [
  { label: 'Triage open alerts', action: 'triage_alert', message: 'Show me the most critical open alerts that need immediate attention and help me triage them.' },
  { label: 'Threat landscape', action: '', message: 'Give me a summary of the current threat landscape and any active attack campaigns I should be aware of.' },
  { label: 'Investigation checklist', action: 'investigate_incident', message: 'Provide an investigation checklist for a potential data exfiltration incident.' },
  { label: 'MITRE coverage gaps', action: '', message: 'What are the most common MITRE ATT&CK technique gaps in typical SOC coverage?' },
  { label: 'False positive tuning', action: '', message: 'What are best practices for reducing false positive rates in our detection rules?' },
  { label: 'Incident response playbook', action: 'recommend_response', message: 'Walk me through the incident response playbook for a ransomware attack.' },
];

const getSeverityColor = (severity: string | undefined): string => {
  switch (severity?.toLowerCase()) {
    case 'critical': return '#f44336';
    case 'high': return '#ff9800';
    case 'medium': return '#ffeb3b';
    case 'low': return '#4caf50';
    case 'informational': return '#2196f3';
    default: return '#9e9e9e';
  }
};

const getSeverityIcon = (severity: string | undefined) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return <ErrorIcon sx={{ color: '#f44336' }} />;
    case 'high': return <WarningIcon sx={{ color: '#ff9800' }} />;
    case 'medium': return <InfoIcon sx={{ color: '#ffeb3b' }} />;
    case 'low': return <CheckIcon sx={{ color: '#4caf50' }} />;
    default: return <InfoIcon sx={{ color: '#9e9e9e' }} />;
  }
};

const SOCAnalyst: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<SOCStats | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const config = getApiConfig();
      const response = await axios.get(`${config.pythonApiUrl}/api/soc-analyst/stats`);
      setStats(response.data);
    } catch (error) {
      console.warn('Failed to fetch SOC stats:', error);
    }
  };

  const sendMessage = async (messageText?: string, messageAction?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const config = getApiConfig();
      const response = await axios.post(`${config.pythonApiUrl}/api/soc-analyst/chat`, {
        message: text,
        session_id: sessionId,
        action: messageAction || action || undefined,
        context: {},
      });

      const data = response.data;
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: {
          action_taken: data.action_taken,
          confidence: data.confidence,
          severity_assessment: data.severity_assessment,
          suggestions: data.suggestions,
          mitre_techniques: data.mitre_techniques,
          recommended_actions: data.recommended_actions,
          related_data: data.related_data,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message || 'Failed to reach SOC Analyst service. Please check the backend connection.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    if (sessionId) {
      try {
        const config = getApiConfig();
        await axios.delete(`${config.pythonApiUrl}/api/soc-analyst/sessions/${sessionId}`);
      } catch (error) {
        console.warn('Failed to delete session:', error);
      }
    }
    setMessages([]);
    setSessionId(null);
    toast.success('Conversation cleared');
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const renderMessageContent = (msg: ChatMessage, index: number) => {
    const isExpanded = expandedMsg === index;
    const meta = msg.metadata;

    return (
      <Box>
        {/* Severity badge */}
        {meta?.severity_assessment && (
          <Box sx={{ mb: 1 }}>
            <Chip
              icon={getSeverityIcon(meta.severity_assessment)}
              label={`${meta.severity_assessment.toUpperCase()} SEVERITY`}
              size="small"
              sx={{
                backgroundColor: `${getSeverityColor(meta.severity_assessment)}22`,
                color: getSeverityColor(meta.severity_assessment),
                fontWeight: 'bold',
                mr: 1,
              }}
            />
            {meta.confidence !== undefined && (
              <Chip
                label={`${(meta.confidence * 100).toFixed(0)}% confidence`}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
              />
            )}
            {meta.action_taken && (
              <Chip label={meta.action_taken.replace(/_/g, ' ')} size="small" color="primary" variant="outlined" />
            )}
          </Box>
        )}

        {/* Main message */}
        <Typography
          variant="body1"
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
        >
          {msg.content}
        </Typography>

        {/* Expandable details */}
        {meta && (meta.suggestions?.length || meta.mitre_techniques?.length || meta.recommended_actions?.length) && (
          <>
            <Box
              sx={{ mt: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'primary.main' }}
              onClick={() => setExpandedMsg(isExpanded ? null : index)}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {isExpanded ? 'Hide details' : 'Show details'}
              </Typography>
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>

            <Collapse in={isExpanded}>
              <Box sx={{ mt: 1 }}>
                {/* MITRE Techniques */}
                {meta.mitre_techniques && meta.mitre_techniques.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      MITRE ATT&CK Techniques:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {meta.mitre_techniques.map((t, i) => (
                        <Chip
                          key={i}
                          label={`${t.technique_id}: ${t.name}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Recommended Actions */}
                {meta.recommended_actions && meta.recommended_actions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      Recommended Actions:
                    </Typography>
                    <List dense>
                      {meta.recommended_actions.map((a, i) => (
                        <ListItem key={i} sx={{ py: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Chip
                              label={a.priority}
                              size="small"
                              color={a.priority === 'immediate' || a.priority === 'high' ? 'error' : 'default'}
                              sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={a.action}
                            secondary={a.rationale}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Follow-up Suggestions */}
                {meta.suggestions && meta.suggestions.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      Follow-up Suggestions:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {meta.suggestions.map((s, i) => (
                        <Chip
                          key={i}
                          label={s}
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => sendMessage(s)}
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              AI SOC Analyst
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI-powered Security Operations Center assistant
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {sessionId && (
            <Chip label={`Session: ${sessionId.slice(0, 12)}...`} size="small" variant="outlined" />
          )}
          <Tooltip title="Refresh stats">
            <IconButton size="small" onClick={fetchStats}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear conversation">
            <IconButton size="small" onClick={clearConversation} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats bar */}
      {stats && (
        <Grid container spacing={1}>
          {[
            { label: 'Open Alerts', value: stats.open_alerts, color: '#2196f3', icon: <WarningIcon /> },
            { label: 'Critical', value: stats.critical_alerts, color: '#f44336', icon: <ErrorIcon /> },
            { label: 'High', value: stats.high_alerts, color: '#ff9800', icon: <WarningIcon /> },
            { label: 'Incidents', value: stats.active_incidents, color: '#9c27b0', icon: <SecurityIcon /> },
            { label: 'Avg Triage', value: `${stats.mean_triage_time_min}m`, color: '#00bcd4', icon: <AssessmentIcon /> },
            { label: 'Last 24h', value: stats.alerts_last_24h, color: '#4caf50', icon: <TrendingUpIcon /> },
          ].map((stat, i) => (
            <Grid item xs={2} key={i}>
              <Card sx={{ backgroundColor: `${stat.color}11`, border: `1px solid ${stat.color}33` }}>
                <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: stat.color, lineHeight: 1.2 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Main chat area */}
      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
        }}
      >
        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ShieldIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                AI SOC Analyst Ready
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                I can help you triage alerts, investigate incidents, correlate threat events,
                hunt for threats, assess risks, and provide security recommendations.
              </Typography>

              {/* Quick prompts */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Quick actions:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <Chip
                    key={i}
                    label={prompt.label}
                    clickable
                    variant="outlined"
                    color="primary"
                    onClick={() => sendMessage(prompt.message, prompt.action)}
                    sx={{ fontSize: '0.8rem' }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  mb: 2,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                {/* Avatar */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: msg.role === 'user' ? 'primary.main' : '#1a2a1a',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <AIIcon fontSize="small" sx={{ color: '#4caf50' }} />}
                </Box>

                {/* Message bubble */}
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    backgroundColor: msg.role === 'user' ? 'primary.dark' : '#111827',
                    border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {msg.role === 'assistant' ? renderMessageContent(msg, index) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </Typography>
                  )}

                  {/* Message footer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, opacity: 0.5 }}>
                    <Typography variant="caption">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Typography>
                    <Tooltip title="Copy">
                      <IconButton size="small" onClick={() => copyMessage(msg.content)} sx={{ opacity: 0.5 }}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Box>
            ))
          )}

          {loading && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a2a1a',
                  flexShrink: 0,
                }}
              >
                <AIIcon fontSize="small" sx={{ color: '#4caf50' }} />
              </Box>
              <Paper sx={{ p: 2, backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Analyzing...
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input area */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={action}
                label="Action"
                onChange={(e) => setAction(e.target.value)}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {opt.icon}
                      <Typography variant="body2">{opt.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask the SOC Analyst... (e.g., 'Triage this alert from 192.168.1.100' or 'What MITRE techniques match this behavior?')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              inputRef={inputRef}
              disabled={loading}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.03)',
                },
              }}
            />

            <IconButton
              color="primary"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              sx={{
                backgroundColor: 'primary.main',
                '&:hover': { backgroundColor: 'primary.dark' },
                '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SOCAnalyst;
