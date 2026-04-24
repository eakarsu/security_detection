import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Error as ErrorIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  Public as PublicIcon,
  BugReport as BugReportIcon,
  Computer as ComputerIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable from '../components/common/DataTable.tsx';
import ConfirmDialog from '../components/common/ConfirmDialog.tsx';
import { ENDPOINTS } from '../config/api.ts';
import { apiDelete } from '../utils/apiClient.ts';
import type { ThreatIndicator, ThreatFeed } from '../types/index.ts';

const ThreatIntelligence: React.FC = () => {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIndicator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search) params.set('search', search);

      const response = await fetch(`${ENDPOINTS.threatIntel()}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch threat intelligence data');

      const data = await response.json();
      // Handle paginated indicators response
      if (data.indicators?.data) {
        setIndicators(data.indicators.data);
        setTotal(data.indicators.total);
      } else if (Array.isArray(data.indicators)) {
        setIndicators(data.indicators);
        setTotal(data.indicators.length);
      }
      setFeeds(data.feeds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': case 'domain': case 'url': return <PublicIcon fontSize="small" />;
      case 'hash': return <BugReportIcon fontSize="small" />;
      case 'email': return <ComputerIcon fontSize="small" />;
      default: return <SecurityIcon fontSize="small" />;
    }
  };

  const columns = [
    {
      id: 'type', label: 'Type', minWidth: 80,
      format: (val: string) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          {getTypeIcon(val)}
          <Typography variant="body2">{val?.toUpperCase()}</Typography>
        </Box>
      ),
    },
    {
      id: 'value', label: 'Indicator', minWidth: 200,
      format: (val: string) => (
        <Typography variant="body2" fontFamily="monospace">
          {val?.length > 40 ? `${val.substring(0, 40)}...` : val}
        </Typography>
      ),
    },
    { id: 'threat_type', label: 'Threat Type', minWidth: 120 },
    {
      id: 'severity', label: 'Severity', minWidth: 100,
      format: (val: string) => <Chip label={val?.toUpperCase()} color={getSeverityColor(val) as any} size="small" />,
    },
    {
      id: 'confidence', label: 'Confidence', minWidth: 130,
      format: (val: number) => (
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress variant="determinate" value={(val || 0) * 100} sx={{ width: 60 }} color={val >= 0.8 ? 'success' : val >= 0.6 ? 'warning' : 'error'} />
          <Typography variant="body2">{Math.round((val || 0) * 100)}%</Typography>
        </Box>
      ),
    },
    { id: 'source', label: 'Source', minWidth: 120 },
    {
      id: 'last_seen', label: 'Last Seen', minWidth: 140,
      format: (val: string) => val ? new Date(val).toLocaleString() : '-',
    },
    {
      id: 'actions', label: '', minWidth: 50,
      format: (_: any, row: ThreatIndicator) => (
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, ids: [row.id] }); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const handleDelete = async (ids: string[]) => {
    try {
      await apiDelete(ENDPOINTS.bulkThreatIntel(), { ids });
      toast.success(`Deleted ${ids.length} indicator(s)`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
    setConfirmDelete({ open: false, ids: [] });
  };

  const handleExportCsv = () => {
    window.open(ENDPOINTS.exportCsvThreatIntel(), '_blank');
    toast.success('Downloading CSV...');
  };

  const handleExportPdf = () => {
    window.open(ENDPOINTS.exportPdfThreatIntel(), '_blank');
    toast.success('Downloading PDF...');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>Threat Intelligence</Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and analyze threat intelligence feeds ({total} indicators)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
          Refresh Data
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}><SecurityIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Total Indicators</Typography>
                  <Typography variant="h4">{total}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}><ErrorIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Critical Threats</Typography>
                  <Typography variant="h4" color="error">{indicators.filter(i => i.severity === 'critical').length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}><ShieldIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>Active Feeds</Typography>
                  <Typography variant="h4" color="success.main">{feeds.filter(f => f.status === 'active').length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}><TrendingUpIcon /></Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>High Confidence</Typography>
                  <Typography variant="h4" color="info.main">{indicators.filter(i => i.confidence >= 0.8).length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threat Feeds */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Threat Intelligence Feeds</Typography>
        <Grid container spacing={2}>
          {feeds.map((feed) => (
            <Grid item xs={12} sm={6} md={4} key={feed.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="medium">{feed.name}</Typography>
                    <Chip label={feed.status.toUpperCase()} color={feed.status === 'active' ? 'success' : 'default'} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{feed.source} | Indicators: {feed.indicators_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={indicators}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(row) => { setSelectedIndicator(row); setDialogOpen(true); }}
        getRowId={(row) => row.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDelete={(ids) => setConfirmDelete({ open: true, ids })}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        searchPlaceholder="Search indicators..."
        emptyTitle="No indicators found"
        emptyMessage="No threat indicators match your search."
      />

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Threat Indicator Details</DialogTitle>
        <DialogContent>
          {selectedIndicator && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Indicator Value" value={selectedIndicator.value} disabled InputProps={{ style: { fontFamily: 'monospace' } }} />
              </Grid>
              <Grid item xs={6}><TextField fullWidth label="Type" value={selectedIndicator.type?.toUpperCase()} disabled /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Threat Type" value={selectedIndicator.threat_type} disabled /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Severity" value={selectedIndicator.severity?.toUpperCase()} disabled /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Confidence" value={`${Math.round(selectedIndicator.confidence * 100)}%`} disabled /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Description" value={selectedIndicator.description} disabled /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Source" value={selectedIndicator.source} disabled /></Grid>
              <Grid item xs={6}><TextField fullWidth label="First Seen" value={new Date(selectedIndicator.first_seen).toLocaleString()} disabled /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {selectedIndicator.tags?.map((tag, i) => <Chip key={i} label={tag} size="small" />)}
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Indicator(s)"
        message={`Delete ${confirmDelete.ids.length} threat indicator(s)? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => handleDelete(confirmDelete.ids)}
        onCancel={() => setConfirmDelete({ open: false, ids: [] })}
      />
    </Box>
  );
};

export default ThreatIntelligence;
