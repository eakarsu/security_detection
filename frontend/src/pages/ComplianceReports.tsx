import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Stack,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Policy as PolicyIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable from '../components/common/DataTable.tsx';
import LoadingSpinner from '../components/common/LoadingSpinner.tsx';
import { ENDPOINTS } from '../config/api.ts';

interface ComplianceReport {
  id: string;
  framework: string;
  status: string;
  score: number;
  generated_at: string;
  last_updated: string;
  controls_total: number;
  controls_passed: number;
  controls_failed: number;
  controls_warning: number;
  findings: any[];
}

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version: string;
  compliance_score: number;
  status: string;
}

interface ComplianceControl {
  id: string;
  framework: string;
  control_id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  last_tested: string;
}

const ComplianceReports: React.FC = () => {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [totalControls, setTotalControls] = useState(0);
  const [controlsPage, setControlsPage] = useState(1);
  const [controlsPageSize, setControlsPageSize] = useState(20);
  const [controlsSearch, setControlsSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({ name: '', framework: '', period_start: '', period_end: '', description: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(controlsPage),
        page_size: String(controlsPageSize),
      });
      if (controlsSearch) params.set('search', controlsSearch);

      const response = await fetch(`${ENDPOINTS.compliance()}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch compliance data');
      const data = await response.json();
      setReports(data.reports || []);
      setFrameworks(data.frameworks || []);

      // Handle paginated controls
      if (data.controls?.data) {
        setControls(data.controls.data);
        setTotalControls(data.controls.total);
      } else if (Array.isArray(data.controls)) {
        setControls(data.controls);
        setTotalControls(data.controls.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [controlsPage, controlsPageSize, controlsSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': case 'passed': return 'success';
      case 'partial': case 'warning': return 'warning';
      case 'failed': case 'non_compliant': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) { case 'critical': return 'error'; case 'high': return 'warning'; case 'medium': return 'info'; case 'low': return 'success'; default: return 'default'; }
  };

  const getScoreColor = (score: number) => score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error';

  const controlColumns = [
    { id: 'control_id', label: 'Control ID', minWidth: 100 },
    { id: 'title', label: 'Title', minWidth: 200 },
    { id: 'framework', label: 'Framework', minWidth: 100, format: (val: string) => <Chip label={val} size="small" icon={<PolicyIcon />} /> },
    { id: 'status', label: 'Status', minWidth: 100, format: (val: string) => <Chip label={val?.toUpperCase()} color={getStatusColor(val) as any} size="small" /> },
    { id: 'severity', label: 'Severity', minWidth: 100, format: (val: string) => <Chip label={val?.toUpperCase()} color={getSeverityColor(val) as any} size="small" /> },
    { id: 'last_tested', label: 'Last Tested', minWidth: 140, format: (val: string) => val ? new Date(val).toLocaleDateString() : '-' },
  ];

  const handleCreateReport = async () => {
    try {
      const response = await fetch(`${ENDPOINTS.compliance()}reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: newReport.framework }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      toast.success('Report generation started');
      setCreateDialogOpen(false);
      setNewReport({ name: '', framework: '', period_start: '', period_end: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create report');
    }
  };

  if (loading && reports.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>Compliance Reports</Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage compliance reports for various frameworks
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>Generate Report</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}><AssessmentIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Total Reports</Typography>
                  <Typography variant="h4">{reports.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}><CheckCircleIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Compliant</Typography>
                  <Typography variant="h4" color="success.main">{reports.filter(r => r.status === 'compliant').length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}><ScheduleIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Controls Tracked</Typography>
                  <Typography variant="h4" color="info.main">{totalControls}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}><TrendingUpIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Avg. Score</Typography>
                  <Typography variant="h4" color="warning.main">
                    {reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Generated Reports</Typography>
        <Stack spacing={1}>
          {reports.map((report) => (
            <Button
              key={report.id}
              variant="outlined"
              onClick={() => {
                setSelectedReport(report);
                setDialogOpen(true);
              }}
              sx={{ justifyContent: 'space-between' }}
            >
              <span>{report.framework}</span>
              <span>{report.score}% · {report.status}</span>
            </Button>
          ))}
          {reports.length === 0 && <Typography color="text.secondary">No reports have been generated.</Typography>}
        </Stack>
      </Paper>

      {/* Frameworks */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Compliance Frameworks</Typography>
        <Grid container spacing={2}>
          {frameworks.map((fw) => (
            <Grid item xs={12} sm={6} md={4} key={fw.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="medium">{fw.name}</Typography>
                    <Box flexGrow={1} />
                    <Chip label={fw.status?.toUpperCase()} color={getStatusColor(fw.status) as any} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{fw.description}</Typography>
                  {fw.enabled && (
                    <Box display="flex" alignItems="center" mt={1}>
                      <LinearProgress variant="determinate" value={fw.compliance_score} color={getScoreColor(fw.compliance_score) as any} sx={{ flex: 1, mr: 1 }} />
                      <Typography variant="body2">{fw.compliance_score}%</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Controls Table */}
      <DataTable
        title="Compliance Controls"
        columns={controlColumns}
        data={controls}
        total={totalControls}
        page={controlsPage}
        pageSize={controlsPageSize}
        loading={loading}
        search={controlsSearch}
        onSearchChange={setControlsSearch}
        onPageChange={setControlsPage}
        onPageSizeChange={setControlsPageSize}
        getRowId={(row) => row.id}
        searchPlaceholder="Search controls..."
        emptyTitle="No controls found"
        emptyMessage="No compliance controls match your search."
      />

      {/* Report Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Compliance Report</Typography>
            {selectedReport && <Chip label={selectedReport.status?.toUpperCase()} color={getStatusColor(selectedReport.status) as any} />}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2 }}>
                    <List dense>
                      <ListItem><ListItemIcon><AssignmentIcon /></ListItemIcon><ListItemText primary="Framework" secondary={selectedReport.framework} /></ListItem>
                      <ListItem><ListItemIcon><CalendarIcon /></ListItemIcon><ListItemText primary="Generated" secondary={new Date(selectedReport.generated_at).toLocaleDateString()} /></ListItem>
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h3" color={getScoreColor(selectedReport.score)}>{selectedReport.score}%</Typography>
                    <Typography variant="body2" color="text.secondary">Compliance Score</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={4}><Typography variant="h6" color="success.main">{selectedReport.controls_passed}</Typography><Typography variant="caption">Passed</Typography></Grid>
                      <Grid item xs={4}><Typography variant="h6" color="error.main">{selectedReport.controls_failed}</Typography><Typography variant="caption">Failed</Typography></Grid>
                      <Grid item xs={4}><Typography variant="h6">{selectedReport.controls_total}</Typography><Typography variant="caption">Total</Typography></Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Findings</Typography>
              {selectedReport.findings?.map((f: any, i: number) => (
                <Accordion key={i} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      {f.type === 'critical' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />}
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>{f.title}</Typography>
                      <Chip label={f.severity?.toUpperCase()} color={getSeverityColor(f.severity) as any} size="small" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" gutterBottom><strong>Control:</strong> {f.control}</Typography>
                    <Typography variant="body2" gutterBottom><strong>Description:</strong> {f.description}</Typography>
                    <Typography variant="body2"><strong>Remediation:</strong> {f.remediation}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate New Compliance Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Report Name" value={newReport.name} onChange={(e) => setNewReport({ ...newReport, name: e.target.value })} /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Framework</InputLabel>
                <Select value={newReport.framework} label="Framework" onChange={(e) => setNewReport({ ...newReport, framework: e.target.value })}>
                  {frameworks.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateReport} variant="contained" disabled={!newReport.framework}>Generate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceReports;
