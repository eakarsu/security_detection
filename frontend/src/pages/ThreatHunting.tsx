import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Select, MenuItem, Card, CardContent,
  Grid, Collapse, LinearProgress, CircularProgress,
} from '@mui/material';
import { Add, Delete, ExpandMore, ExpandLess, Download } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ENDPOINTS } from '../config/api.ts';

const statusColors: Record<string, string> = {
  draft: 'default', active: 'info', validated: 'success', invalidated: 'error', closed: 'default',
};
const priorityColors: Record<string, string> = {
  critical: '#f44336', high: '#ff9800', medium: '#2196f3', low: '#4caf50',
};

const MITRE_TACTICS = [
  'TA0043 - Reconnaissance', 'TA0042 - Resource Development', 'TA0001 - Initial Access',
  'TA0002 - Execution', 'TA0003 - Persistence', 'TA0004 - Privilege Escalation',
  'TA0005 - Defense Evasion', 'TA0006 - Credential Access', 'TA0007 - Discovery',
  'TA0008 - Lateral Movement', 'TA0009 - Collection', 'TA0011 - Command and Control',
  'TA0010 - Exfiltration', 'TA0040 - Impact',
];

const ThreatHunting: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Threat Hunting</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Hunts" />
        <Tab label="IOC Sweep" />
        <Tab label="UEBA" />
        <Tab label="Sigma Rules" />
      </Tabs>
      {tab === 0 && <HuntsTab />}
      {tab === 1 && <IOCSweepTab />}
      {tab === 2 && <UEBATab />}
      {tab === 3 && <SigmaRulesTab />}
    </Box>
  );
};

// --- Hunts ---
const HuntsTab: React.FC = () => {
  const [hunts, setHunts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedHunt, setExpandedHunt] = useState<any>(null);
  const [findingDialog, setFindingDialog] = useState(false);
  const [form, setForm] = useState({ title: '', hypothesis: '', mitre_tactic: '', priority: 'medium', assigned_to: '' });
  const [findingForm, setFindingForm] = useState({ title: '', description: '', severity: 'medium', evidence: '{}' });

  const fetchHunts = async () => {
    try {
      const res = await fetch(ENDPOINTS.huntingHypotheses());
      const data = await res.json();
      setHunts(data.data || []);
    } catch {}
  };

  useEffect(() => { fetchHunts(); }, []);

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.huntingHypotheses(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Hunt created');
      setDialogOpen(false);
      fetchHunts();
    } catch { toast.error('Failed'); }
  };

  const expandHunt = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    try {
      const res = await fetch(`${ENDPOINTS.huntingHypotheses()}/${id}`);
      setExpandedHunt(await res.json());
      setExpandedId(id);
    } catch {}
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${ENDPOINTS.huntingHypotheses()}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    toast.success(`Status updated to ${status}`);
    fetchHunts();
  };

  const addFinding = async () => {
    try {
      await fetch(`${ENDPOINTS.huntingHypotheses()}/${expandedId}/findings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...findingForm, evidence: JSON.parse(findingForm.evidence) }),
      });
      toast.success('Finding added');
      setFindingDialog(false);
      if (expandedId) expandHunt(expandedId);
    } catch { toast.error('Failed'); }
  };

  const deleteHunt = async (id: string) => {
    await fetch(`${ENDPOINTS.huntingHypotheses()}/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    fetchHunts();
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>New Hunt</Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell /><TableCell>Title</TableCell><TableCell>Status</TableCell>
            <TableCell>Priority</TableCell><TableCell>MITRE Tactic</TableCell>
            <TableCell>Findings</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {hunts.map((h) => (
              <React.Fragment key={h.id}>
                <TableRow hover onClick={() => expandHunt(h.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>{expandedId === h.id ? <ExpandLess /> : <ExpandMore />}</TableCell>
                  <TableCell>{h.title}</TableCell>
                  <TableCell><Chip label={h.status} size="small" color={statusColors[h.status] as any || 'default'} /></TableCell>
                  <TableCell><Chip label={h.priority} size="small" sx={{ bgcolor: priorityColors[h.priority] }} /></TableCell>
                  <TableCell>{h.mitre_tactic || '-'}</TableCell>
                  <TableCell>{h.findings_count}</TableCell>
                  <TableCell>{h.created_at ? new Date(h.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteHunt(h.id); }}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
                <TableRow><TableCell colSpan={8} sx={{ py: 0 }}>
                  <Collapse in={expandedId === h.id}>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" gutterBottom><strong>Hypothesis:</strong> {expandedHunt?.hypothesis}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {h.status === 'draft' && <Button size="small" variant="outlined" onClick={() => updateStatus(h.id, 'active')}>Start Hunt</Button>}
                        {h.status === 'active' && <>
                          <Button size="small" variant="outlined" color="success" onClick={() => updateStatus(h.id, 'validated')}>Validate</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => updateStatus(h.id, 'invalidated')}>Invalidate</Button>
                        </>}
                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setFindingDialog(true)}>Add Finding</Button>
                      </Box>
                      {expandedHunt?.findings?.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Findings:</Typography>
                          {expandedHunt.findings.map((f: any) => (
                            <Card key={f.id} sx={{ mb: 1 }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="body2"><strong>{f.title}</strong> - <Chip label={f.severity} size="small" /></Typography>
                                <Typography variant="caption" color="text.secondary">{f.description}</Typography>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </TableCell></TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Hunt Hypothesis</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} fullWidth />
            <TextField label="Hypothesis" value={form.hypothesis} onChange={(e) => setForm({...form, hypothesis: e.target.value})} multiline rows={3} fullWidth />
            <FormControl fullWidth><InputLabel>MITRE Tactic</InputLabel>
              <Select value={form.mitre_tactic} label="MITRE Tactic" onChange={(e) => setForm({...form, mitre_tactic: e.target.value})}>
                {MITRE_TACTICS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth><InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={(e) => setForm({...form, priority: e.target.value})}>
                {['critical', 'high', 'medium', 'low'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={findingDialog} onClose={() => setFindingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Finding</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" value={findingForm.title} onChange={(e) => setFindingForm({...findingForm, title: e.target.value})} fullWidth />
            <TextField label="Description" value={findingForm.description} onChange={(e) => setFindingForm({...findingForm, description: e.target.value})} multiline rows={2} fullWidth />
            <FormControl fullWidth><InputLabel>Severity</InputLabel>
              <Select value={findingForm.severity} label="Severity" onChange={(e) => setFindingForm({...findingForm, severity: e.target.value})}>
                {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addFinding}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- IOC Sweep ---
const IOCSweepTab: React.FC = () => {
  const [sweeps, setSweeps] = useState<any[]>([]);
  const [iocText, setIocText] = useState('');
  const [sweepName, setSweepName] = useState('');
  const [selectedSweep, setSelectedSweep] = useState<any>(null);

  const fetchSweeps = async () => {
    try {
      const res = await fetch(ENDPOINTS.huntingIocSweep());
      setSweeps(await res.json());
    } catch {}
  };

  useEffect(() => { fetchSweeps(); }, []);

  const startSweep = async () => {
    const lines = iocText.split('\n').filter(l => l.trim());
    const ioc_list = lines.map(l => {
      const val = l.trim();
      let type = 'unknown';
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) type = 'ip';
      else if (/^[a-f0-9]{32}$/i.test(val)) type = 'md5';
      else if (/^[a-f0-9]{64}$/i.test(val)) type = 'sha256';
      else if (val.includes('@')) type = 'email';
      else if (val.includes('.')) type = 'domain';
      return { value: val, type };
    });

    try {
      await fetch(ENDPOINTS.huntingIocSweep(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sweepName || 'IOC Sweep', ioc_list }),
      });
      toast.success('Sweep started');
      setIocText('');
      fetchSweeps();
    } catch { toast.error('Failed'); }
  };

  const viewSweep = async (id: string) => {
    try {
      const res = await fetch(`${ENDPOINTS.huntingIocSweep()}/${id}`);
      setSelectedSweep(await res.json());
    } catch {}
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>New IOC Sweep</Typography>
            <TextField label="Sweep Name" value={sweepName} onChange={(e) => setSweepName(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="IOC List (one per line)" value={iocText} onChange={(e) => setIocText(e.target.value)}
              multiline rows={8} fullWidth placeholder={'192.168.1.100\nevildomain.com\na1b2c3d4e5f6...'} sx={{ mb: 2 }} />
            <Button variant="contained" onClick={startSweep} disabled={!iocText.trim()}>Start Sweep</Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" gutterBottom>Past Sweeps</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Name</TableCell><TableCell>Status</TableCell><TableCell>Results</TableCell><TableCell>Started</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {sweeps.map((s) => (
                  <TableRow key={s.id} hover onClick={() => viewSweep(s.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <Chip label={s.status} size="small" color={s.status === 'completed' ? 'success' : s.status === 'running' ? 'warning' : 'default'} />
                      {s.status === 'running' && <CircularProgress size={16} sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{s.results_count}</TableCell>
                    <TableCell>{s.started_at ? new Date(s.started_at).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedSweep && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6">Sweep Results: {selectedSweep.name}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>IOC</TableCell><TableCell>Type</TableCell><TableCell>Matched Field</TableCell><TableCell>Context</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {(selectedSweep.results || []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{r.ioc_value}</TableCell>
                        <TableCell><Chip label={r.ioc_type} size="small" /></TableCell>
                        <TableCell>{r.matched_field}</TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.context}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// --- UEBA ---
const UEBATab: React.FC = () => {
  const [baselines, setBaselines] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [buildForm, setBuildForm] = useState({ entity_id: '', entity_type: 'user', lookback_days: 30 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [bRes, aRes] = await Promise.all([
        fetch(ENDPOINTS.huntingUebaBaselines()),
        fetch(ENDPOINTS.huntingUebaAnomalies()),
      ]);
      setBaselines(await bRes.json());
      setAnomalies(await aRes.json());
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const buildBaseline = async () => {
    try {
      await fetch(`${ENDPOINTS.huntingUebaBaselines()}/build`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildForm),
      });
      toast.success('Baseline built');
      setDialogOpen(false);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Build Baseline</Button>

      <Typography variant="h6" gutterBottom>Entity Baselines</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {baselines.map((b) => (
          <Grid item xs={12} sm={6} md={4} key={b.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{b.entity_id}</Typography>
                <Chip label={b.entity_type} size="small" sx={{ mb: 1 }} />
                <Typography variant="body2">Samples: {b.sample_count}</Typography>
                <Typography variant="body2">Daily avg: {b.baseline_data?.mean_daily_events || 0} events</Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated: {b.last_updated ? new Date(b.last_updated).toLocaleString() : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom>Anomalies</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Entity</TableCell><TableCell>Type</TableCell><TableCell>Anomaly</TableCell>
            <TableCell>Score</TableCell><TableCell>Deviation</TableCell><TableCell>Detected</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {anomalies.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.entity_id}</TableCell>
                <TableCell><Chip label={a.entity_type} size="small" /></TableCell>
                <TableCell>{a.anomaly_type}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={a.score * 100} sx={{ width: 60, height: 8, borderRadius: 4 }}
                      color={a.score > 0.7 ? 'error' : a.score > 0.4 ? 'warning' : 'info'} />
                    {(a.score * 100).toFixed(0)}%
                  </Box>
                </TableCell>
                <TableCell>{a.deviation?.toFixed(2)}</TableCell>
                <TableCell>{a.detected_at ? new Date(a.detected_at).toLocaleString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Build UEBA Baseline</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Entity ID" value={buildForm.entity_id} onChange={(e) => setBuildForm({...buildForm, entity_id: e.target.value})} />
            <FormControl fullWidth><InputLabel>Entity Type</InputLabel>
              <Select value={buildForm.entity_type} label="Entity Type" onChange={(e) => setBuildForm({...buildForm, entity_type: e.target.value})}>
                {['user', 'host', 'service', 'application'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Lookback Days" type="number" value={buildForm.lookback_days}
              onChange={(e) => setBuildForm({...buildForm, lookback_days: +e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={buildBaseline}>Build</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- Sigma Rules ---
const SigmaRulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', yaml_content: '', severity: 'medium' });

  const fetchRules = async () => {
    try {
      const res = await fetch(ENDPOINTS.huntingSigma());
      setRules(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const handleImport = async () => {
    try {
      const res = await fetch(ENDPOINTS.huntingSigma(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); toast.error(JSON.stringify(err.detail)); return; }
      toast.success('Sigma rule imported');
      setDialogOpen(false);
      fetchRules();
    } catch { toast.error('Failed'); }
  };

  const deleteRule = async (id: string) => {
    await fetch(`${ENDPOINTS.huntingSigma()}/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    fetchRules();
  };

  const exportRule = async (id: string) => {
    const res = await fetch(`${ENDPOINTS.huntingSigma()}/${id}/export`);
    const data = await res.json();
    const blob = new Blob([data.yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sigma_rule_${id}.yml`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Import Sigma Rule</Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Title</TableCell><TableCell>Severity</TableCell><TableCell>Status</TableCell>
            <TableCell>Category</TableCell><TableCell>Tags</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.title}</TableCell>
                <TableCell><Chip label={r.severity} size="small" /></TableCell>
                <TableCell><Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : r.status === 'testing' ? 'warning' : 'default'} /></TableCell>
                <TableCell>{r.logsource_category}</TableCell>
                <TableCell>{(r.tags || []).slice(0, 3).map((t: string) => <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => exportRule(r.id)}><Download /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Sigma Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} fullWidth />
            <FormControl fullWidth><InputLabel>Severity</InputLabel>
              <Select value={form.severity} label="Severity" onChange={(e) => setForm({...form, severity: e.target.value})}>
                {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="YAML Content" value={form.yaml_content} onChange={(e) => setForm({...form, yaml_content: e.target.value})}
              multiline rows={12} fullWidth sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              placeholder={'title: My Sigma Rule\nlogsource:\n  category: process_creation\ndetection:\n  selection:\n    Image|contains: mimikatz\n  condition: selection\nlevel: high'} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport}>Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatHunting;
