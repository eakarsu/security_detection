import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
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
  Alert,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable from '../components/common/DataTable.tsx';
import ConfirmDialog from '../components/common/ConfirmDialog.tsx';
import BulkUpdateDialog from '../components/common/BulkUpdateDialog.tsx';
import { usePaginatedData } from '../hooks/usePaginatedData.ts';
import { ENDPOINTS } from '../config/api.ts';
import { apiPost, apiPut, apiDelete } from '../utils/apiClient.ts';
import type { Incident } from '../types/index.ts';

const IncidentManagement: React.FC = () => {
  const {
    data: incidents,
    total,
    page,
    pageSize,
    loading,
    error,
    search,
    setPage,
    setPageSize,
    setSearch,
    refresh,
  } = usePaginatedData<Incident>({ endpoint: ENDPOINTS.incidents(), defaultPageSize: 20 });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdateIds, setBulkUpdateIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Incident>>({
    title: '', description: '', severity: 'medium', status: 'open', assigned_to: '', tags: []
  });

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
      case 'blocked': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon fontSize="small" />;
      case 'high': return <WarningIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  const columns = [
    {
      id: 'title',
      label: 'Title',
      minWidth: 200,
      format: (_: any, row: Incident) => (
        <Box display="flex" alignItems="center" gap={1}>
          {getSeverityIcon(row.severity)}
          <Box>
            <Typography variant="body2" fontWeight="medium">{row.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.description?.substring(0, 60)}...
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'severity',
      label: 'Severity',
      minWidth: 100,
      format: (val: string) => (
        <Chip label={val?.toUpperCase()} color={getSeverityColor(val) as any} size="small" />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      format: (val: string) => (
        <Chip label={val?.toUpperCase()} color={getStatusColor(val) as any} size="small" variant="outlined" />
      ),
    },
    {
      id: 'assigned_to',
      label: 'Assigned To',
      minWidth: 120,
      format: (val: string) => val || <Typography variant="body2" color="text.secondary">Unassigned</Typography>,
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 150,
      format: (val: string) => new Date(val).toLocaleString(),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 100,
      format: (_: any, row: Incident) => (
        <Stack direction="row" spacing={0}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog('edit', row); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, ids: [row.incident_id] }); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const handleOpenDialog = (mode: 'view' | 'edit' | 'create', incident?: Incident) => {
    setDialogMode(mode);
    if (incident) {
      setSelectedIncident(incident);
      setFormData(incident);
    } else {
      setSelectedIncident(null);
      setFormData({ title: '', description: '', severity: 'medium', status: 'open', assigned_to: '', tags: [] });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedIncident(null);
  };

  const handleSaveIncident = async () => {
    try {
      if (dialogMode === 'create') {
        await apiPost(ENDPOINTS.incidents(), {
          ...formData,
          incident_id: `inc_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success('Incident created successfully');
      } else {
        await apiPut(`${ENDPOINTS.incidents()}/${selectedIncident?.incident_id}`, {
          ...formData,
          updated_at: new Date().toISOString(),
        });
        toast.success('Incident updated successfully');
      }
      handleCloseDialog();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save incident');
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      await apiDelete(ENDPOINTS.bulkIncidents(), { ids });
      toast.success(`Deleted ${ids.length} incident(s)`);
      setSelectedIds([]);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete incidents');
    }
    setConfirmDelete({ open: false, ids: [] });
  };

  const handleBulkUpdate = async (updates: Record<string, string>) => {
    try {
      const items = bulkUpdateIds.map(id => ({ id, updates }));
      await apiPut(ENDPOINTS.bulkIncidents(), { items });
      toast.success(`Updated ${bulkUpdateIds.length} incident(s)`);
      setSelectedIds([]);
      setBulkUpdateOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update incidents');
    }
  };

  const handleExportCsv = () => {
    window.open(ENDPOINTS.exportCsvIncidents(), '_blank');
    toast.success('Downloading CSV...');
  };

  const handleExportPdf = () => {
    window.open(ENDPOINTS.exportPdfIncidents(), '_blank');
    toast.success('Downloading PDF...');
  };

  const handleRowClick = useCallback((row: Incident) => {
    handleOpenDialog('view', row);
  }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Incident Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track security incidents ({total} total)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog('create')}>
          Create Incident
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Incidents</Typography>
              <Typography variant="h4" color="primary">{total.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Critical & High</Typography>
              <Typography variant="h4" color="error">
                {incidents.filter(i => ['critical', 'high'].includes(i.severity)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Open</Typography>
              <Typography variant="h4" color="warning.main">
                {incidents.filter(i => i.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Resolved</Typography>
              <Typography variant="h4" color="success.main">
                {incidents.filter(i => i.status === 'resolved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={incidents}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        getRowId={(row) => row.incident_id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDelete={(ids) => setConfirmDelete({ open: true, ids })}
        onBulkUpdate={(ids) => { setBulkUpdateIds(ids); setBulkUpdateOpen(true); }}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        searchPlaceholder="Search incidents..."
        emptyTitle="No incidents found"
        emptyMessage="No security incidents match your current filters."
      />

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
              <TextField fullWidth label="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} disabled={dialogMode === 'view'} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={dialogMode === 'view'} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select value={formData.severity || 'medium'} label="Severity" onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })} disabled={dialogMode === 'view'}>
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
                <Select value={formData.status || 'open'} label="Status" onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} disabled={dialogMode === 'view'}>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="investigating">Investigating</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Assigned To" value={formData.assigned_to || ''} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} disabled={dialogMode === 'view'} />
            </Grid>
            {dialogMode === 'view' && selectedIncident && (
              <>
                <Grid item xs={6}>
                  <TextField fullWidth label="Created At" value={new Date(selectedIncident.created_at).toLocaleString()} disabled />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Updated At" value={new Date(selectedIncident.updated_at).toLocaleString()} disabled />
                </Grid>
                {selectedIncident.source_ip && (
                  <Grid item xs={6}>
                    <TextField fullWidth label="Source IP" value={selectedIncident.source_ip} disabled />
                  </Grid>
                )}
                {selectedIncident.ml_score !== undefined && selectedIncident.ml_score !== null && (
                  <Grid item xs={6}>
                    <TextField fullWidth label="ML Score" value={`${(selectedIncident.ml_score * 100).toFixed(1)}%`} disabled />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedIncident.tags?.map((tag, i) => <Chip key={i} label={tag} size="small" />)}
                  </Stack>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          {dialogMode === 'view' && selectedIncident && (
            <>
              <Button color="error" onClick={() => { handleCloseDialog(); setConfirmDelete({ open: true, ids: [selectedIncident.incident_id] }); }}>
                Delete
              </Button>
              <Button onClick={() => { setDialogMode('edit'); }}>Edit</Button>
            </>
          )}
          <Button onClick={handleCloseDialog}>{dialogMode === 'view' ? 'Close' : 'Cancel'}</Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveIncident} variant="contained">
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Incident(s)"
        message={`Are you sure you want to delete ${confirmDelete.ids.length} incident(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => handleDelete(confirmDelete.ids)}
        onCancel={() => setConfirmDelete({ open: false, ids: [] })}
      />

      {/* Bulk Update */}
      <BulkUpdateDialog
        open={bulkUpdateOpen}
        count={bulkUpdateIds.length}
        onClose={() => setBulkUpdateOpen(false)}
        onConfirm={handleBulkUpdate}
        fields={[
          { key: 'status', label: 'Status', options: [
            { value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' },
            { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
          ]},
          { key: 'severity', label: 'Severity', options: [
            { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
          ]},
        ]}
      />
    </Box>
  );
};

export default IncidentManagement;
