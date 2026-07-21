import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Chip, TextField,
  Button, Stepper, Step, StepLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, FormControl,
  InputLabel, Select, MenuItem, Badge, Collapse, CircularProgress,
} from '@mui/material';
import { Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ENDPOINTS } from '../config/api.ts';

const phaseColors: Record<string, string> = {
  reconnaissance: '#2196f3',
  weaponization: '#9c27b0',
  delivery: '#ff9800',
  exploitation: '#f44336',
  installation: '#e91e63',
  command_and_control: '#795548',
  actions_on_objectives: '#f44336',
};

const KillChainView: React.FC = () => {
  const [chains, setChains] = useState<any[]>([]);
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [searchIp, setSearchIp] = useState('');
  const [timeWindow, setTimeWindow] = useState(24);
  const [detecting, setDetecting] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const fetchChains = async () => {
    try {
      const res = await fetch(ENDPOINTS.huntingKillChain());
      setChains(await res.json());
    } catch {}
  };

  useEffect(() => { fetchChains(); }, []);

  const detectKillChain = async () => {
    if (!searchIp.trim()) { toast.error('Enter an IP address'); return; }
    setDetecting(true);
    try {
      const res = await fetch(ENDPOINTS.huntingKillChainDetect(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src_ip: searchIp, time_window_hours: timeWindow }),
      });
      const data = await res.json();
      setSelectedChain(data);
      toast.success(`Kill chain detected: ${data.phases_detected} phases, ${data.total_events} events`);
      fetchChains();
    } catch { toast.error('Detection failed'); }
    setDetecting(false);
  };

  const viewChain = async (chainId: string) => {
    try {
      const res = await fetch(`${ENDPOINTS.huntingKillChain()}/${chainId}`);
      setSelectedChain(await res.json());
    } catch {}
  };

  const activePhases = selectedChain?.phases?.filter((p: any) => p.event_count > 0) || [];
  const maxPhaseOrder = Math.max(...activePhases.map((p: any) => p.order || 0), 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Kill Chain Analysis</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Detect and visualize attack progression using the Lockheed Martin Cyber Kill Chain
      </Typography>

      {/* Detection Input */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Detect Kill Chain</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" label="Source IP Address" value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            placeholder="192.168.1.100" sx={{ minWidth: 200 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Window</InputLabel>
            <Select value={timeWindow} label="Time Window" onChange={(e) => setTimeWindow(+e.target.value)}>
              <MenuItem value={6}>6 hours</MenuItem>
              <MenuItem value={12}>12 hours</MenuItem>
              <MenuItem value={24}>24 hours</MenuItem>
              <MenuItem value={48}>48 hours</MenuItem>
              <MenuItem value={168}>7 days</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={detecting ? <CircularProgress size={16} /> : <Search />}
            onClick={detectKillChain} disabled={detecting}>
            {detecting ? 'Detecting...' : 'Detect'}
          </Button>
        </Box>
      </Paper>

      {/* Kill Chain Visualization */}
      {selectedChain && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {selectedChain.name || 'Kill Chain'} - {selectedChain.src_ip}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={`Status: ${selectedChain.status}`} color="warning" />
            <Chip label={`${selectedChain.total_events || activePhases.reduce((a: number, p: any) => a + p.event_count, 0)} events`} />
            <Chip label={`${activePhases.length} phases detected`} color={activePhases.length >= 4 ? 'error' : 'info'} />
          </Box>

          {/* Horizontal Phase Stepper */}
          <Stepper alternativeLabel sx={{ mb: 3 }}>
            {(selectedChain.phases || []).map((phase: any) => {
              const isActive = phase.event_count > 0;
              const isCompleted = isActive && phase.order < maxPhaseOrder;
              return (
                <Step key={phase.id} completed={isCompleted} active={isActive}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        color: isActive ? phaseColors[phase.id] || '#2196f3' : 'rgba(255,255,255,0.2)',
                        '&.Mui-completed': { color: phaseColors[phase.id] || '#4caf50' },
                        '&.Mui-active': { color: phaseColors[phase.id] || '#2196f3' },
                      }
                    }}
                  >
                    <Typography variant="caption" sx={{ color: isActive ? '#fff' : 'text.secondary' }}>
                      {phase.name}
                    </Typography>
                    {isActive && (
                      <Badge badgeContent={phase.event_count} color="error" sx={{ ml: 1 }}>
                        <span />
                      </Badge>
                    )}
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>

          {/* Phase Details */}
          {(selectedChain.phases || []).map((phase: any) => (
            phase.event_count > 0 && (
              <Card key={phase.id} sx={{ mb: 1, border: `1px solid ${phaseColors[phase.id] || '#333'}` }}>
                <CardContent
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  sx={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, '&:last-child': { pb: 1 } }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: phaseColors[phase.id] }}>
                      Phase {phase.order}: {phase.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{phase.description}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`${phase.event_count} events`} size="small" />
                    {expandedPhase === phase.id ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                </CardContent>
                <Collapse in={expandedPhase === phase.id}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {(phase.events || []).map((event: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell>{event.event_type || event.action}</TableCell>
                            <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {event.description || event.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Collapse>
              </Card>
            )
          ))}
        </Paper>
      )}

      {/* Saved Kill Chains */}
      <Typography variant="h6" gutterBottom>Saved Kill Chains</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Source IP</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {chains.map((chain) => (
              <TableRow key={chain.id} hover>
                <TableCell>{chain.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{chain.src_ip}</TableCell>
                <TableCell><Chip label={chain.status} size="small"
                  color={chain.status === 'confirmed' ? 'error' : chain.status === 'investigating' ? 'warning' : 'default'} /></TableCell>
                <TableCell>{chain.created_at ? new Date(chain.created_at).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => viewChain(chain.id)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
            {chains.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">
                <Typography color="text.secondary">No kill chains detected yet. Use the detection form above.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default KillChainView;
