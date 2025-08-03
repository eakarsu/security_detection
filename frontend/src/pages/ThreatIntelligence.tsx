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
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  Public as PublicIcon,
  Shield as ShieldIcon,
  BugReport as BugReportIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';
import LoadingSpinner from '../components/common/LoadingSpinner.tsx';
import { ENDPOINTS } from '../config/api.ts';

interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  description: string;
  tags: string[];
  ioc_count?: number;
}

interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  status: 'active' | 'inactive' | 'error';
  last_updated: string;
  indicators_count: number;
  feed_type: string;
}

const ThreatIntelligence: React.FC = () => {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIndicator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchThreatData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterSeverity) params.append('severity', filterSeverity);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`${ENDPOINTS.threatIntel()}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch threat intelligence data');
      }
      
      const data = await response.json();
      setIndicators(data.indicators || []);
      setFeeds(data.feeds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch threat intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatData();
  }, [filterType, filterSeverity, searchTerm]);

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
      case 'ip': return <PublicIcon />;
      case 'domain': return <PublicIcon />;
      case 'hash': return <BugReportIcon />;
      case 'url': return <PublicIcon />;
      case 'email': return <ComputerIcon />;
      default: return <SecurityIcon />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (indicator: ThreatIndicator) => {
    setSelectedIndicator(indicator);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedIndicator(null);
  };

  if (loading && indicators.length === 0) {
    return <LoadingSpinner message="Loading threat intelligence data..." />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Threat Intelligence
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and analyze threat intelligence feeds
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchThreatData}
          disabled={loading}
        >
          Refresh Data
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
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Indicators
                  </Typography>
                  <Typography variant="h4">
                    {indicators.length}
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
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <ErrorIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Critical Threats
                  </Typography>
                  <Typography variant="h4" color="error">
                    {indicators.filter(i => i.severity === 'critical').length}
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
                  <ShieldIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Feeds
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {feeds.filter(f => f.status === 'active').length}
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
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    High Confidence
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {indicators.filter(i => i.confidence >= 0.8).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threat Feeds Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Threat Intelligence Feeds
        </Typography>
        <Grid container spacing={2}>
          {feeds.map((feed) => (
            <Grid item xs={12} sm={6} md={4} key={feed.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {feed.name}
                    </Typography>
                    <Chip
                      label={feed.status.toUpperCase()}
                      color={feed.status === 'active' ? 'success' : feed.status === 'error' ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {feed.source}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Indicators: {feed.indicators_count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {formatDate(feed.last_updated)}
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
          <FilterIcon />
          <TextField
            size="small"
            label="Search indicators"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              label="Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ip">IP Address</MenuItem>
              <MenuItem value="domain">Domain</MenuItem>
              <MenuItem value="hash">Hash</MenuItem>
              <MenuItem value="url">URL</MenuItem>
              <MenuItem value="email">Email</MenuItem>
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
          {loading && <CircularProgress size={20} />}
        </Stack>
      </Paper>

      {/* Threat Indicators Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Indicator</TableCell>
              <TableCell>Threat Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Last Seen</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indicators.map((indicator) => (
              <TableRow key={indicator.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {getTypeIcon(indicator.type)}
                    <Typography variant="body2" ml={1}>
                      {indicator.type.toUpperCase()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {indicator.value.length > 30 
                      ? `${indicator.value.substring(0, 30)}...` 
                      : indicator.value}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {indicator.threat_type}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={indicator.severity.toUpperCase()}
                    color={getSeverityColor(indicator.severity) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <LinearProgress
                      variant="determinate"
                      value={indicator.confidence * 100}
                      color={getConfidenceColor(indicator.confidence * 100) as any}
                      sx={{ width: 60, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {Math.round(indicator.confidence * 100)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {indicator.source}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(indicator.last_seen)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(indicator)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Indicator Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Threat Indicator Details
        </DialogTitle>
        <DialogContent>
          {selectedIndicator && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Indicator Value"
                  value={selectedIndicator.value}
                  disabled
                  InputProps={{
                    style: { fontFamily: 'monospace' }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Type"
                  value={selectedIndicator.type.toUpperCase()}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Threat Type"
                  value={selectedIndicator.threat_type}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Severity"
                  value={selectedIndicator.severity.toUpperCase()}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Confidence"
                  value={`${Math.round(selectedIndicator.confidence * 100)}%`}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={selectedIndicator.description}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Source"
                  value={selectedIndicator.source}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Seen"
                  value={formatDate(selectedIndicator.first_seen)}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedIndicator.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatIntelligence;
