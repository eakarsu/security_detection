import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Fab,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import LoadingSpinner from '../components/common/LoadingSpinner.tsx';
import { ENDPOINTS } from '../config/api.ts';

interface Incident {
  incident_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  tags: string[];
}

const IncidentManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalIncidentCount, setTotalIncidentCount] = useState<number>(0);
  const [severityBreakdown, setSeverityBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  // Form state for creating/editing incidents
  const [formData, setFormData] = useState<Partial<Incident>>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    assigned_to: '',
    tags: []
  });

  const fetchIncidentCount = async () => {
    try {
      const response = await fetch(`${ENDPOINTS.incidents()}/count`);
      if (!response.ok) {
        throw new Error('Failed to fetch incident count');
      }
      
      const data = await response.json();
      setTotalIncidentCount(data.total_incidents);
      setSeverityBreakdown(data.severity_breakdown || {});
    } catch (err) {
      console.error('Failed to fetch incident count:', err);
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);
      
      const response = await fetch(`${ENDPOINTS.incidents()}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      
      const data = await response.json();
      setIncidents(data);
      
      // Also fetch the total count
      await fetchIncidentCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filterStatus, filterSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const handleOpenDialog = (mode: 'view' | 'edit' | 'create', incident?: Incident) => {
    setDialogMode(mode);
    if (incident) {
      setSelectedIncident(incident);
      setFormData(incident);
    } else {
      setSelectedIncident(null);
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        assigned_to: '',
        tags: []
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedIncident(null);
    setFormData({});
  };

  const handleSaveIncident = async () => {
    try {
      const method = dialogMode === 'create' ? 'POST' : 'PUT';
      const url = dialogMode === 'create' 
        ? ENDPOINTS.incidents()
        : `${ENDPOINTS.incidents()}/${selectedIncident?.incident_id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          incident_id: dialogMode === 'create' ? `inc_${Date.now()}` : selectedIncident?.incident_id,
          created_at: dialogMode === 'create' ? new Date().toISOString() : selectedIncident?.created_at,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save incident');
      }

      handleCloseDialog();
      fetchIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save incident');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && incidents.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Incident Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track security incidents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Create Incident
        </Button>
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
              <Typography color="textSecondary" gutterBottom>
                Total Incidents (All Time)
              </Typography>
              <Typography variant="h4" color="primary">
                {totalIncidentCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Showing {incidents.length} most recent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical & High
              </Typography>
              <Typography variant="h4" color="error">
                {((severityBreakdown.critical || 0) + (severityBreakdown.high || 0)).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Critical: {severityBreakdown.critical || 0}, High: {severityBreakdown.high || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Open Incidents (Current Page)
              </Typography>
              <Typography variant="h4" color="warning">
                {incidents.filter(i => i.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical Incidents
              </Typography>
              <Typography variant="h4" color="error">
                {incidents.filter(i => i.severity === 'critical').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Resolved Today
              </Typography>
              <Typography variant="h4" color="success.main">
                {incidents.filter(i => i.status === 'resolved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterIcon />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="investigating">Investigating</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filterSeverity}
              label="Severity"
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchIncidents}
            disabled={loading}
          >
            Refresh
          </Button>
          {loading && <CircularProgress size={20} />}
        </Stack>
      </Paper>

      {/* Incidents Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.incident_id} hover>
                <TableCell>{incident.incident_id}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {getSeverityIcon(incident.severity)}
                    <Box ml={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {incident.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {incident.description.substring(0, 50)}...
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={incident.severity.toUpperCase()}
                    color={getSeverityColor(incident.severity) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={incident.status.toUpperCase()}
                    color={getStatusColor(incident.status) as any}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {incident.assigned_to ? (
                    <Chip
                      label={incident.assigned_to}
                      size="small"
                      icon={<AssignmentIcon />}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(incident.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('view', incident)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Incident">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', incident)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Incident Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && 'Create New Incident'}
          {dialogMode === 'edit' && 'Edit Incident'}
          {dialogMode === 'view' && 'Incident Details'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity || 'medium'}
                  label="Severity"
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || 'open'}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="investigating">Investigating</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assigned To"
                value={formData.assigned_to || ''}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                disabled={dialogMode === 'view'}
                placeholder="Enter username or email"
              />
            </Grid>
            {dialogMode === 'view' && selectedIncident && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Created At"
                    value={formatDate(selectedIncident.created_at)}
                    disabled
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Updated At"
                    value={formatDate(selectedIncident.updated_at)}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {selectedIncident.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveIncident} variant="contained">
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => handleOpenDialog('create')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default IncidentManagement;
