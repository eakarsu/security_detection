import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip, TextField,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Card, CardContent, Grid, Collapse, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon, PlayArrow, Stop, Add, Edit, Delete,
  ExpandMore, ExpandLess, Refresh,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ENDPOINTS } from '../config/api.ts';

const severityColors: Record<string, string> = {
  critical: '#f44336', high: '#ff9800', medium: '#ffeb3b', low: '#4caf50', info: '#2196f3',
};

const SIEMDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>SIEM Dashboard</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Log Explorer" />
        <Tab label="Live Tail" />
        <Tab label="Alerting Rules" />
        <Tab label="Log Sources" />
        <Tab label="Retention" />
      </Tabs>
      {tab === 0 && <LogExplorer />}
      {tab === 1 && <LiveTail />}
      {tab === 2 && <AlertingRules />}
      {tab === 3 && <LogSources />}
      {tab === 4 && <RetentionPolicies />}
    </Box>
  );
};

// --- Log Explorer ---
const LogExplorer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1), page_size: String(pageSize),
      });
      if (search) params.append('text_search', search);
      if (severity) params.append('severity', severity);
      if (sourceType) params.append('source_type', sourceType);

      const hours: Record<string, number> = { '15m': 0.25, '1h': 1, '24h': 24, '7d': 168, '30d': 720 };
      const h = hours[timeRange] || 24;
      const start = new Date(Date.now() - h * 3600000).toISOString();
      params.append('time_start', start);

      const res = await fetch(`${ENDPOINTS.siemLogs()}?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, pageSize, search, severity, sourceType, timeRange]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search logs..." value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 250 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
            {['15m', '1h', '24h', '7d', '30d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={severity} label="Severity" onChange={(e) => setSeverity(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['critical', 'high', 'medium', 'low', 'info'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Source</InputLabel>
          <Select value={sourceType} label="Source" onChange={(e) => setSourceType(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['firewall', 'endpoint', 'cloud', 'iam', 'dns'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>Search</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Timestamp</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Src IP</TableCell>
              <TableCell>Dst IP</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : logs.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow hover onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  sx={{ cursor: 'pointer' }}>
                  <TableCell>{expandedRow === log.id ? <ExpandLess /> : <ExpandMore />}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip label={log.severity} size="small"
                      sx={{ bgcolor: severityColors[log.severity] || '#666', color: log.severity === 'medium' ? '#000' : '#fff' }} />
                  </TableCell>
                  <TableCell>{log.source_type}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.src_ip}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.dst_ip}</TableCell>
                  <TableCell>{log.username}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.message}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 0 }}>
                    <Collapse in={expandedRow === log.id}>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle2">Full Details</Typography>
                        <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 200 }}>
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize}
        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPageSize(+e.target.value); setPage(0); }} />
    </Box>
  );
};

// --- Live Tail ---
const LiveTail: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = () => {
    const es = new EventSource(ENDPOINTS.siemLogsStream());
    es.onmessage = (e) => {
      try {
        const log = JSON.parse(e.data);
        setLogs(prev => {
          const updated = [...prev, log];
          return updated.slice(-500);
        });
      } catch {}
    };
    es.onerror = () => { es.close(); setRunning(false); };
    eventSourceRef.current = es;
    setRunning(true);
  };

  const stop = () => {
    eventSourceRef.current?.close();
    setRunning(false);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => () => { eventSourceRef.current?.close(); }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color={running ? 'error' : 'success'}
          startIcon={running ? <Stop /> : <PlayArrow />}
          onClick={running ? stop : start}>
          {running ? 'Stop' : 'Start'} Live Tail
        </Button>
        <Button variant="outlined" onClick={() => setLogs([])}>Clear</Button>
        <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
          {logs.length} events
        </Typography>
      </Box>
      <Paper ref={containerRef} sx={{ height: 500, overflow: 'auto', p: 1, fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: '#0a0a0a' }}>
        {logs.map((log, i) => (
          <Box key={i} sx={{ py: 0.25, borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: severityColors[log.severity] || '#ccc' }}>
            [{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}] [{log.severity?.toUpperCase()}] {log.src_ip} → {log.dst_ip} | {log.action} | {log.message}
          </Box>
        ))}
        {!running && logs.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
            Click "Start Live Tail" to begin streaming logs
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

// --- Alerting Rules ---
const AlertingRules: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', severity: 'medium', conditions: '[]', threshold: 5, window_seconds: 300, actions: '[]' });

  const fetchRules = async () => {
    try {
      const res = await fetch(ENDPOINTS.siemRules());
      setRules(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.siemRules(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, conditions: JSON.parse(form.conditions), actions: JSON.parse(form.actions) }),
      });
      toast.success('Rule created');
      setDialogOpen(false);
      fetchRules();
    } catch { toast.error('Failed to create rule'); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${ENDPOINTS.siemRules()}/${id}`, { method: 'DELETE' });
    toast.success('Rule deleted');
    fetchRules();
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>
        Add Rule
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Threshold</TableCell>
              <TableCell>Window</TableCell>
              <TableCell>Enabled</TableCell>
              <TableCell>Last Triggered</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell><Chip label={r.severity} size="small" sx={{ bgcolor: severityColors[r.severity] }} /></TableCell>
                <TableCell>{r.threshold}</TableCell>
                <TableCell>{r.window_seconds}s</TableCell>
                <TableCell><Chip label={r.enabled ? 'Yes' : 'No'} size="small" color={r.enabled ? 'success' : 'default'} /></TableCell>
                <TableCell>{r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : 'Never'}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Alerting Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select value={form.severity} label="Severity" onChange={(e) => setForm({...form, severity: e.target.value})}>
                {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Conditions (JSON)" value={form.conditions} onChange={(e) => setForm({...form, conditions: e.target.value})}
              multiline rows={4} fullWidth placeholder='[{"field": "action", "operator": "equals", "value": "failed_login", "type": "count"}]' />
            <TextField label="Threshold" type="number" value={form.threshold} onChange={(e) => setForm({...form, threshold: +e.target.value})} />
            <TextField label="Window (seconds)" type="number" value={form.window_seconds} onChange={(e) => setForm({...form, window_seconds: +e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- Log Sources ---
const LogSources: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', source_type: 'firewall', format: 'syslog', description: '', host: '', port: 514 });

  const fetchSources = async () => {
    try {
      const res = await fetch(ENDPOINTS.siemSources());
      setSources(await res.json());
    } catch {}
  };

  useEffect(() => { fetchSources(); }, []);

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.siemSources(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Source added');
      setDialogOpen(false);
      fetchSources();
    } catch { toast.error('Failed'); }
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Add Source</Button>
      <Grid container spacing={2}>
        {sources.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{s.name}</Typography>
                <Chip label={s.source_type} size="small" sx={{ mr: 1 }} />
                <Chip label={s.format} size="small" variant="outlined" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {s.host ? `${s.host}:${s.port}` : 'No host configured'}
                </Typography>
                <Chip label={s.enabled ? 'Enabled' : 'Disabled'} size="small" color={s.enabled ? 'success' : 'default'} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Log Source</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.source_type} label="Type" onChange={(e) => setForm({...form, source_type: e.target.value})}>
                {['firewall', 'endpoint', 'cloud', 'iam', 'dns', 'email', 'proxy', 'custom'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select value={form.format} label="Format" onChange={(e) => setForm({...form, format: e.target.value})}>
                {['syslog', 'cef', 'leef', 'json'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Host" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} />
            <TextField label="Port" type="number" value={form.port} onChange={(e) => setForm({...form, port: +e.target.value})} />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- Retention Policies ---
const RetentionPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ source_type: 'firewall', retention_days: 90, archive_enabled: false, archive_location: '' });

  const fetchPolicies = async () => {
    try {
      const res = await fetch(ENDPOINTS.siemRetention());
      setPolicies(await res.json());
    } catch {}
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.siemRetention(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Policy created');
      setDialogOpen(false);
      fetchPolicies();
    } catch { toast.error('Failed'); }
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Add Policy</Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source Type</TableCell>
              <TableCell>Retention (days)</TableCell>
              <TableCell>Archive</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.source_type}</TableCell>
                <TableCell>{p.retention_days}</TableCell>
                <TableCell><Chip label={p.archive_enabled ? 'Yes' : 'No'} size="small" color={p.archive_enabled ? 'success' : 'default'} /></TableCell>
                <TableCell>{p.archive_location || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Retention Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Source Type</InputLabel>
              <Select value={form.source_type} label="Source Type" onChange={(e) => setForm({...form, source_type: e.target.value})}>
                {['firewall', 'endpoint', 'cloud', 'iam', 'dns', 'email', 'proxy'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Retention Days" type="number" value={form.retention_days} onChange={(e) => setForm({...form, retention_days: +e.target.value})} />
            <FormControlLabel control={<Switch checked={form.archive_enabled} onChange={(e) => setForm({...form, archive_enabled: e.target.checked})} />} label="Archive Enabled" />
            {form.archive_enabled && <TextField label="Archive Location" value={form.archive_location} onChange={(e) => setForm({...form, archive_location: e.target.value})} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SIEMDashboard;
