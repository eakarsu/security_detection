import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Policy as PolicyIcon,
  Gavel as GavelIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import LoadingSpinner from '../components/common/LoadingSpinner.tsx';
import { ENDPOINTS } from '../config/api.ts';

interface ComplianceReport {
  id: string;
  name: string;
  framework: string;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  compliance_score: number;
  created_at: string;
  updated_at: string;
  generated_by: string;
  period_start: string;
  period_end: string;
  total_controls: number;
  passed_controls: number;
  failed_controls: number;
  findings: ComplianceFinding[];
}

interface ComplianceFinding {
  id: string;
  control_id: string;
  control_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pass' | 'fail' | 'not_applicable';
  description: string;
  evidence: string;
  remediation: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  total_controls: number;
  categories: string[];
}

const ComplianceReports: React.FC = () => {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterFramework, setFilterFramework] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Form state for creating new reports
  const [newReport, setNewReport] = useState({
    name: '',
    framework: '',
    period_start: '',
    period_end: '',
    description: ''
  });

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterFramework) params.append('framework', filterFramework);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`${ENDPOINTS.compliance()}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch compliance data');
      }
      
      const data = await response.json();
      setReports(data.reports || []);
      setFrameworks(data.frameworks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [filterFramework, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'failed': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const handleViewReport = (report: ComplianceReport) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReport(null);
  };

  const handleCreateReport = async () => {
    try {
      const response = await fetch(`${ENDPOINTS.compliance()}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newReport,
          id: `rpt_${Date.now()}`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generated_by: 'current_user',
          compliance_score: 0,
          total_controls: 0,
          passed_controls: 0,
          failed_controls: 0,
          findings: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create compliance report');
      }

      setCreateDialogOpen(false);
      setNewReport({
        name: '',
        framework: '',
        period_start: '',
        period_end: '',
        description: ''
      });
      fetchComplianceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create compliance report');
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`${ENDPOINTS.compliance()}/reports/${reportId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `compliance-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && reports.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Compliance Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage compliance reports for various frameworks
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchComplianceData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Generate Report
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AssessmentIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Reports
                  </Typography>
                  <Typography variant="h4">
                    {reports.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {reports.filter(r => r.status === 'completed').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    In Progress
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {reports.filter(r => r.status === 'in_progress').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. Score
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {reports.length > 0 
                      ? Math.round(reports.reduce((sum, r) => sum + r.compliance_score, 0) / reports.length)
                      : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Frameworks */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Compliance Frameworks
        </Typography>
        <Grid container spacing={2}>
          {frameworks.map((framework) => (
            <Grid item xs={12} sm={6} md={4} key={framework.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      {framework.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {framework.description}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Version: {framework.version}
                  </Typography>
                  <Typography variant="body2">
                    Controls: {framework.total_controls}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2">Filters:</Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={filterFramework}
              label="Framework"
              onChange={(e) => setFilterFramework(e.target.value)}
            >
              <MenuItem value="">All Frameworks</MenuItem>
              {frameworks.map((framework) => (
                <MenuItem key={framework.id} value={framework.id}>
                  {framework.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          {loading && <CircularProgress size={20} />}
        </Stack>
      </Paper>

      {/* Reports Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report Name</TableCell>
              <TableCell>Framework</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Compliance Score</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {report.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {report.id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={report.framework}
                    size="small"
                    icon={<PolicyIcon />}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={report.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(report.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <LinearProgress
                      variant="determinate"
                      value={report.compliance_score}
                      color={getComplianceScoreColor(report.compliance_score) as any}
                      sx={{ width: 80, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {report.compliance_score}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(report.period_start)} - {formatDate(report.period_end)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(report.created_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {report.generated_by}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Report">
                    <IconButton
                      size="small"
                      onClick={() => handleViewReport(report)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download Report">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadReport(report.id)}
                        disabled={report.status !== 'completed'}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Report Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate New Compliance Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Report Name"
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                placeholder="e.g., Q4 2024 SOC 2 Compliance Report"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Compliance Framework</InputLabel>
                <Select
                  value={newReport.framework}
                  label="Compliance Framework"
                  onChange={(e) => setNewReport({ ...newReport, framework: e.target.value })}
                >
                  {frameworks.map((framework) => (
                    <MenuItem key={framework.id} value={framework.id}>
                      {framework.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Period Start"
                type="date"
                value={newReport.period_start}
                onChange={(e) => setNewReport({ ...newReport, period_start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Period End"
                type="date"
                value={newReport.period_end}
                onChange={(e) => setNewReport({ ...newReport, period_end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                placeholder="Optional description for this compliance report"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateReport} 
            variant="contained"
            disabled={!newReport.name || !newReport.framework}
          >
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Compliance Report Details</Typography>
            {selectedReport && (
              <Chip
                label={selectedReport.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(selectedReport.status) as any}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              {/* Report Summary */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Report Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><AssignmentIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Report Name" 
                          secondary={selectedReport.name} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><PolicyIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Framework" 
                          secondary={selectedReport.framework} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CalendarIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Period" 
                          secondary={`${formatDate(selectedReport.period_start)} - ${formatDate(selectedReport.period_end)}`} 
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Compliance Metrics
                    </Typography>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="h3" color={getComplianceScoreColor(selectedReport.compliance_score)}>
                        {selectedReport.compliance_score}%
                      </Typography>
                      <Box ml={2}>
                        <Typography variant="body2" color="text.secondary">
                          Overall Compliance Score
                        </Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="success.main">
                            {selectedReport.passed_controls}
                          </Typography>
                          <Typography variant="caption">Passed</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="error.main">
                            {selectedReport.failed_controls}
                          </Typography>
                          <Typography variant="caption">Failed</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h6">
                            {selectedReport.total_controls}
                          </Typography>
                          <Typography variant="caption">Total</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Findings */}
              <Typography variant="h6" gutterBottom>
                Compliance Findings
              </Typography>
              {selectedReport.findings.map((finding, index) => (
                <Accordion key={finding.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Box display="flex" alignItems="center" mr={2}>
                        {finding.status === 'pass' ? (
                          <CheckCircleIcon color="success" />
                        ) : finding.status === 'fail' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <InfoIcon color="info" />
                        )}
                      </Box>
                      <Box flexGrow={1}>
                        <Typography variant="subtitle2">
                          {finding.control_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {finding.control_id}
                        </Typography>
                      </Box>
                      <Chip
                        label={finding.severity.toUpperCase()}
                        color={getSeverityColor(finding.severity) as any}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Description:</strong> {finding.description}
                        </Typography>
                      </Grid>
                      {finding.evidence && (
                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Evidence:</strong> {finding.evidence}
                          </Typography>
                        </Grid>
                      )}
                      {finding.remediation && (
                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Remediation:</strong> {finding.remediation}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedReport && selectedReport.status === 'completed' && (
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadReport(selectedReport.id)}
            >
              Download Report
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceReports;
