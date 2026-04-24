import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Grid, Chip,
  TextField, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { ENDPOINTS } from '../config/api.ts';

interface Technique {
  id: string;
  name: string;
  description: string;
  detection_count?: number;
  covered?: boolean;
}

interface Tactic {
  id: string;
  name: string;
  techniques: Technique[];
}

const MITREMatrix: React.FC = () => {
  const [matrix, setMatrix] = useState<Tactic[]>([]);
  const [coverage, setCoverage] = useState({ total_techniques: 0, covered_count: 0, coverage_percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);
  const [selectedTactic, setSelectedTactic] = useState('');
  const [mappings, setMappings] = useState<any[]>([]);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const res = await fetch(ENDPOINTS.huntingMitreMatrix());
        const data = await res.json();
        setMatrix(data.matrix || []);
        setCoverage(data.coverage || {});
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchMatrix();
  }, []);

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const res = await fetch(ENDPOINTS.huntingMitreMappings());
        setMappings(await res.json());
      } catch {}
    };
    fetchMappings();
  }, []);

  const handleTechClick = (tech: Technique, tacticName: string) => {
    setSelectedTech(tech);
    setSelectedTactic(tacticName);
  };

  const filteredMatrix = matrix.map(tactic => ({
    ...tactic,
    techniques: tactic.techniques.filter(t => {
      const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || (filter === 'covered' && t.covered) || (filter === 'not_covered' && !t.covered);
      return matchesSearch && matchesFilter;
    })
  }));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>MITRE ATT&CK Matrix</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Detection coverage across the MITRE ATT&CK framework
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card><CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4">{coverage.total_techniques}</Typography>
            <Typography variant="body2" color="text.secondary">Total Techniques</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}><CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">{coverage.covered_count}</Typography>
            <Typography variant="body2" color="text.secondary">Covered</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4">{coverage.total_techniques - coverage.covered_count}</Typography>
            <Typography variant="body2" color="text.secondary">Not Covered</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}><CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">{coverage.coverage_percentage}%</Typography>
            <Typography variant="body2" color="text.secondary">Coverage</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField size="small" placeholder="Search techniques..." value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 250 }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Coverage</InputLabel>
          <Select value={filter} label="Coverage" onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="covered">Covered</MenuItem>
            <MenuItem value="not_covered">Not Covered</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Matrix Grid */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 0.5, minWidth: filteredMatrix.length * 140 }}>
          {filteredMatrix.map((tactic) => (
            <Box key={tactic.id} sx={{ minWidth: 130, maxWidth: 160, flex: '1 1 0' }}>
              {/* Tactic Header */}
              <Paper sx={{ p: 1, mb: 0.5, bgcolor: 'primary.dark', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                  {tactic.name}
                </Typography>
                <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
                  {tactic.id}
                </Typography>
              </Paper>

              {/* Technique Cells */}
              {tactic.techniques.map((tech) => (
                <Tooltip key={tech.id} title={`${tech.id}: ${tech.description}`} arrow>
                  <Paper
                    onClick={() => handleTechClick(tech, tactic.name)}
                    sx={{
                      p: 0.5, mb: 0.25, cursor: 'pointer', fontSize: '0.65rem',
                      bgcolor: tech.covered ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: tech.covered ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      '&:hover': { bgcolor: tech.covered ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 255, 255, 0.15)' },
                      minHeight: 32, display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.2 }}>
                      {tech.name}
                      {tech.detection_count ? ` (${tech.detection_count})` : ''}
                    </Typography>
                  </Paper>
                </Tooltip>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
        <Typography variant="body2">Legend:</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(76, 175, 80, 0.3)', border: '1px solid rgba(76, 175, 80, 0.5)' }} />
          <Typography variant="caption">Covered</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
          <Typography variant="caption">Not Covered</Typography>
        </Box>
      </Box>

      {/* Technique Detail Dialog */}
      <Dialog open={!!selectedTech} onClose={() => setSelectedTech(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedTech?.id}: {selectedTech?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom><strong>Tactic:</strong> {selectedTactic}</Typography>
          <Typography variant="body2" gutterBottom>{selectedTech?.description}</Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Detection Count:</strong> {selectedTech?.detection_count || 0}
          </Typography>
          <Chip label={selectedTech?.covered ? 'Covered' : 'Not Covered'} color={selectedTech?.covered ? 'success' : 'default'} />

          {mappings.filter(m => m.technique_id === selectedTech?.id).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Mapped Detections:</Typography>
              {mappings.filter(m => m.technique_id === selectedTech?.id).map(m => (
                <Chip key={m.id} label={m.detection_type} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTech(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MITREMatrix;
