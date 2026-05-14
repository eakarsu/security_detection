/**
 * ThreatIntelFeeds — admin page for the new threat-intel loader.
 * Audit fix: replaces the empty `KNOWN_MALICIOUS_IPS` set with a live,
 * multi-source feed manager (local file + remote feeds + DB IOCs).
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ENDPOINTS } from "../config/api.ts";

interface Stats {
  exact_ips: number;
  networks: number;
  sources: { source: string; count: number }[];
  last_loaded_age_seconds?: number;
  last_loaded_epoch?: number;
}

const ThreatIntelFeeds: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(ENDPOINTS.detectionThreatIntelStats());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStats(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFeeds = useCallback(async () => {
    setRefreshing(true);
    setErr(null);
    try {
      const res = await fetch(ENDPOINTS.detectionThreatIntelRefresh(), { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStats(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Threat Intel Feeds
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Loaded from local JSON file (THREAT_INTEL_LOCAL_PATH), remote HTTP feeds
        (THREAT_INTEL_FEED_URLS), and the security.threat_intel_iocs DB table.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction="row" spacing={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Exact IPs</Typography>
            <Typography variant="h3">{stats?.exact_ips ?? "-"}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">CIDR networks</Typography>
            <Typography variant="h3">{stats?.networks ?? "-"}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Last refresh</Typography>
            <Typography variant="h6">
              {stats?.last_loaded_age_seconds != null
                ? `${stats.last_loaded_age_seconds}s ago`
                : "never"}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Box mb={2}>
        <Button
          variant="contained"
          startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          onClick={refreshFeeds}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh feeds"}
        </Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell align="right">Indicators loaded</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(stats?.sources || []).length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No sources loaded. Configure THREAT_INTEL_LOCAL_PATH or THREAT_INTEL_FEED_URLS.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {(stats?.sources || []).map((s) => (
              <TableRow key={s.source}>
                <TableCell>
                  <Chip
                    label={s.source.split(":")[0]}
                    size="small"
                    color={s.source.startsWith("feed") ? "primary" : s.source.startsWith("db") ? "secondary" : "default"}
                  />
                  <code style={{ marginLeft: 8 }}>{s.source.split(":").slice(1).join(":")}</code>
                </TableCell>
                <TableCell align="right">{s.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ThreatIntelFeeds;
