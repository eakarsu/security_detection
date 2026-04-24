import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SECURITY_THRESHOLDS } from '../constants/config';
import { apiService } from '../services/api';
import { DashboardStats, ThreatMetrics } from '../types';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color = COLORS.primary, onPress }) => (
  <TouchableOpacity style={styles.metricCard} onPress={onPress} disabled={!onPress}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

interface RiskLevelIndicatorProps {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
}

const RiskLevelIndicator: React.FC<RiskLevelIndicatorProps> = ({ riskLevel, riskScore }) => {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'critical': return COLORS.critical;
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      case 'low': return COLORS.low;
      default: return COLORS.medium;
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  };

  return (
    <View style={[styles.riskIndicator, { borderColor: getRiskColor() }]}>
      <Text style={styles.riskIcon}>{getRiskIcon()}</Text>
      <View style={styles.riskInfo}>
        <Text style={styles.riskLevel}>{riskLevel.toUpperCase()}</Text>
        {riskScore && <Text style={styles.riskScore}>Score: {riskScore}/10</Text>}
      </View>
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [threatMetrics, setThreatMetrics] = useState<ThreatMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data for demonstration
    const mockStats: DashboardStats = {
      activeThreats: 3,
      resolvedThreats: 127,
      systemUptime: 259200, // 3 days in seconds
      lastScanTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      riskLevel: 'medium'
    };
    
    const mockMetrics: ThreatMetrics = {
      totalIncidents: 142,
      criticalIncidents: 3,
      resolvedIncidents: 127,
      averageResponseTime: 1800, // 30 minutes
      riskScore: 5.2,
      systemHealthScore: 87
    };
    
    setDashboardStats(mockStats);
    setThreatMetrics(mockMetrics);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatUptime = (uptime: number): string => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastScan = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Security Dashboard</Text>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Risk Level Section */}
        {dashboardStats && (
          <RiskLevelIndicator 
            riskLevel={dashboardStats.riskLevel}
            riskScore={threatMetrics?.riskScore}
          />
        )}

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          {dashboardStats && (
            <>
              <MetricCard
                title="Active Threats"
                value={dashboardStats.activeThreats}
                color={dashboardStats.activeThreats > 0 ? COLORS.critical : COLORS.success}
              />
              <MetricCard
                title="Resolved"
                value={dashboardStats.resolvedThreats}
                color={COLORS.success}
              />
              <MetricCard
                title="System Uptime"
                value={formatUptime(dashboardStats.systemUptime)}
                color={COLORS.info}
              />
              <MetricCard
                title="Last Scan"
                value={formatLastScan(dashboardStats.lastScanTime)}
                subtitle="Automated scan"
                color={COLORS.textSecondary}
              />
            </>
          )}
        </View>

        {/* Threat Metrics Section */}
        {threatMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Threat Analysis</Text>
            <View style={styles.threatMetrics}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Incidents</Text>
                <Text style={styles.metricValue}>{threatMetrics.totalIncidents}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Critical Incidents</Text>
                <Text style={[styles.metricValue, { color: COLORS.critical }]}>
                  {threatMetrics.criticalIncidents}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Avg Response Time</Text>
                <Text style={styles.metricValue}>
                  {Math.round(threatMetrics.averageResponseTime / 60)}m
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>System Health</Text>
                <Text style={[
                  styles.metricValue, 
                  { color: threatMetrics.systemHealthScore > 80 ? COLORS.success : COLORS.warning }
                ]}>
                  {threatMetrics.systemHealthScore}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🚨 View Incidents</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📊 Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🔍 Run Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  lastUpdated: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderWidth: 2,
  },
  riskIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  riskInfo: {
    flex: 1,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  riskScore: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metricCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    width: '48%',
    marginBottom: SPACING.md,
  },
  metricTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  metricSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  threatMetrics: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  metricLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  quickActions: {
    gap: SPACING.sm,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default DashboardScreen;