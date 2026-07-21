import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Add, Delete, PlayArrow, Science } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ENDPOINTS } from '../config/api.ts';

const FIELDS = ['src_ip', 'dst_ip', 'username', 'action', 'severity', 'source_type', 'message', 'hostname', 'protocol'];
const OPERATORS = ['equals', 'not_equals', 'contains', 'not_contains', 'regex', 'greater_than', 'less_than'];

const DetectionRuleBuilder: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detection Rule Builder</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Custom Rules" />
        <Tab label="YARA Rules" />
        <Tab label="Correlation Rules" />
      </Tabs>
      {tab === 0 && <CustomRulesTab />}
      {tab === 1 && <YARARulesTab />}
      {tab === 2 && <CorrelationRulesTab />}
    </Box>
  );
};

// --- Custom Rules ---
const CustomRulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', severity: 'medium', logic_operator: 'AND', enabled: true,
    conditions: [{ field: 'action', operator: 'equals', value: '' }],
  });

  const fetchRules = async () => {
    try {
      const res = await fetch(ENDPOINTS.advancedDetectionRules());
      setRules(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const addCondition = () => {
    setForm({ ...form, conditions: [...form.conditions, { field: 'action', operator: 'equals', value: '' }] });
  };

  const removeCondition = (index: number) => {
    setForm({ ...form, conditions: form.conditions.filter((_, i) => i !== index) });
  };

  const updateCondition = (index: number, key: string, value: string) => {
    const updated = [...form.conditions];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, conditions: updated });
  };

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.advancedDetectionRules(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, actions: [] }),
      });
      toast.success('Rule created');
      setDialogOpen(false);
      setForm({ name: '', description: '', severity: 'medium', logic_operator: 'AND', enabled: true, conditions: [{ field: 'action', operator: 'equals', value: '' }] });
      fetchRules();
    } catch { toast.error('Failed'); }
  };

  const testRule = async (id: string) => {
    try {
      const res = await fetch(`${ENDPOINTS.advancedDetectionRules()}/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      toast.success(`Found ${data.matches_found} matches`);
    } catch { toast.error('Test failed'); }
  };

  const deleteRule = async (id: string) => {
    await fetch(`${ENDPOINTS.advancedDetectionRules()}/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    fetchRules();
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Create Rule</Button>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Description</TableCell><TableCell>Severity</TableCell>
            <TableCell>Logic</TableCell><TableCell>Enabled</TableCell><TableCell>Triggers</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                <TableCell><Chip label={r.severity} size="small" /></TableCell>
                <TableCell><Chip label={r.logic_operator} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={r.enabled ? 'Yes' : 'No'} size="small" color={r.enabled ? 'success' : 'default'} /></TableCell>
                <TableCell>{r.trigger_count}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => testRule(r.id)} title="Test Rule"><Science /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {testResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6">Test Results: {testResult.matches_found} matches</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Timestamp</TableCell><TableCell>Severity</TableCell><TableCell>Src IP</TableCell>
                <TableCell>Action</TableCell><TableCell>Message</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {(testResult.matches || []).slice(0, 20).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.timestamp ? new Date(m.timestamp).toLocaleString() : '-'}</TableCell>
                    <TableCell><Chip label={m.severity} size="small" /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.src_ip}</TableCell>
                    <TableCell>{m.action}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Detection Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Rule Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 150 }}><InputLabel>Severity</InputLabel>
                <Select value={form.severity} label="Severity" onChange={(e) => setForm({...form, severity: e.target.value})}>
                  {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}><InputLabel>Logic</InputLabel>
                <Select value={form.logic_operator} label="Logic" onChange={(e) => setForm({...form, logic_operator: e.target.value})}>
                  <MenuItem value="AND">AND</MenuItem>
                  <MenuItem value="OR">OR</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="subtitle2">Conditions</Typography>
            {form.conditions.map((cond, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {i > 0 && <Chip label={form.logic_operator} size="small" variant="outlined" sx={{ mr: 1 }} />}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Field</InputLabel>
                  <Select value={cond.field} label="Field" onChange={(e) => updateCondition(i, 'field', e.target.value)}>
                    {FIELDS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select value={cond.operator} label="Operator" onChange={(e) => updateCondition(i, 'operator', e.target.value)}>
                    {OPERATORS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Value" value={cond.value}
                  onChange={(e) => updateCondition(i, 'value', e.target.value)} sx={{ flex: 1 }} />
                {form.conditions.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeCondition(i)}><Delete /></IconButton>
                )}
              </Box>
            ))}
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={addCondition} sx={{ alignSelf: 'flex-start' }}>
              Add Condition
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create Rule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- YARA Rules ---
const YARARulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', rule_content: '', tags: '' });
  const [scanResult, setScanResult] = useState<any>(null);

  const fetchRules = async () => {
    try {
      const res = await fetch(ENDPOINTS.advancedDetectionYara());
      setRules(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.advancedDetectionYara(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      toast.success('YARA rule created');
      setDialogOpen(false);
      fetchRules();
    } catch { toast.error('Failed'); }
  };

  const scanRule = async (id: string) => {
    try {
      const res = await fetch(`${ENDPOINTS.advancedDetectionYara()}/${id}/scan`, { method: 'POST' });
      const data = await res.json();
      setScanResult(data);
      toast.success(`Scan complete: ${data.match_count} matches`);
    } catch { toast.error('Scan failed'); }
  };

  const deleteRule = async (id: string) => {
    await fetch(`${ENDPOINTS.advancedDetectionYara()}/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    fetchRules();
  };

  const defaultYara = `rule example_malware {
    meta:
        description = "Detects example malware"
        author = "Security Team"
    strings:
        $s1 = "malicious_payload" ascii
        $s2 = "c2_beacon" wide
    condition:
        any of them
}`;

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ ...form, rule_content: defaultYara }); setDialogOpen(true); }} sx={{ mb: 2 }}>
        Add YARA Rule
      </Button>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Tags</TableCell><TableCell>Enabled</TableCell>
            <TableCell>Scans</TableCell><TableCell>Last Scanned</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{(r.tags || []).map((t: string) => <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
                <TableCell><Chip label={r.enabled ? 'Yes' : 'No'} size="small" color={r.enabled ? 'success' : 'default'} /></TableCell>
                <TableCell>{r.scan_count}</TableCell>
                <TableCell>{r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleString() : 'Never'}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => scanRule(r.id)} title="Scan"><PlayArrow /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {scanResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6">Scan Results: {scanResult.match_count} matches</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Matched String</TableCell><TableCell>Timestamp</TableCell><TableCell>Context</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {(scanResult.matches || []).map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.matched_string}</TableCell>
                    <TableCell>{m.timestamp ? new Date(m.timestamp).toLocaleString() : '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.context}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add YARA Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} fullWidth />
            <TextField label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} fullWidth />
            <TextField label="YARA Rule Content" value={form.rule_content}
              onChange={(e) => setForm({...form, rule_content: e.target.value})}
              multiline rows={15} fullWidth
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
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

// --- Correlation Rules ---
const CorrelationRulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', severity: 'medium', window_seconds: 300, threshold: 1, enabled: true,
    events: [{ field: 'action', operator: 'equals', value: '' }],
  });

  const fetchRules = async () => {
    try {
      const res = await fetch(ENDPOINTS.advancedDetectionCorrelation());
      setRules(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const addEvent = () => {
    setForm({ ...form, events: [...form.events, { field: 'action', operator: 'equals', value: '' }] });
  };

  const removeEvent = (index: number) => {
    setForm({ ...form, events: form.events.filter((_, i) => i !== index) });
  };

  const updateEvent = (index: number, key: string, value: string) => {
    const updated = [...form.events];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, events: updated });
  };

  const handleCreate = async () => {
    try {
      await fetch(ENDPOINTS.advancedDetectionCorrelation(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, description: form.description, severity: form.severity,
          window_seconds: form.window_seconds, threshold: form.threshold, enabled: form.enabled,
          event_sequence: form.events,
        }),
      });
      toast.success('Correlation rule created');
      setDialogOpen(false);
      fetchRules();
    } catch { toast.error('Failed'); }
  };

  const deleteRule = async (id: string) => {
    await fetch(`${ENDPOINTS.advancedDetectionCorrelation()}/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    fetchRules();
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} sx={{ mb: 2 }}>Create Correlation Rule</Button>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Description</TableCell><TableCell>Severity</TableCell>
            <TableCell>Window</TableCell><TableCell>Threshold</TableCell><TableCell>Enabled</TableCell>
            <TableCell>Triggers</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                <TableCell><Chip label={r.severity} size="small" /></TableCell>
                <TableCell>{r.window_seconds}s</TableCell>
                <TableCell>{r.threshold}</TableCell>
                <TableCell><Chip label={r.enabled ? 'Yes' : 'No'} size="small" color={r.enabled ? 'success' : 'default'} /></TableCell>
                <TableCell>{r.trigger_count}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Correlation Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Rule Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 150 }}><InputLabel>Severity</InputLabel>
                <Select value={form.severity} label="Severity" onChange={(e) => setForm({...form, severity: e.target.value})}>
                  {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Window (sec)" type="number" value={form.window_seconds} onChange={(e) => setForm({...form, window_seconds: +e.target.value})} size="small" />
              <TextField label="Threshold" type="number" value={form.threshold} onChange={(e) => setForm({...form, threshold: +e.target.value})} size="small" />
            </Box>

            <Typography variant="subtitle2">Event Sequence (ordered)</Typography>
            {form.events.map((evt, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={`Step ${i + 1}`} size="small" color="primary" />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Field</InputLabel>
                  <Select value={evt.field} label="Field" onChange={(e) => updateEvent(i, 'field', e.target.value)}>
                    {FIELDS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select value={evt.operator} label="Operator" onChange={(e) => updateEvent(i, 'operator', e.target.value)}>
                    {OPERATORS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Value" value={evt.value}
                  onChange={(e) => updateEvent(i, 'value', e.target.value)} sx={{ flex: 1 }} />
                {form.events.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeEvent(i)}><Delete /></IconButton>
                )}
              </Box>
            ))}
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={addEvent} sx={{ alignSelf: 'flex-start' }}>
              Add Event Step
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create Rule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetectionRuleBuilder;
