import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  overallScore: number;
  controlsTotal: number;
  controlsPassed: number;
  controlsFailed: number;
  lastAudit: string;
  nextAudit: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_tested';
  severity: 'critical' | 'high' | 'medium' | 'low';
  lastChecked: string;
  evidence?: string;
  remediationSteps?: string[];
}

interface ComplianceReport {
  id: string;
  name: string;
  framework: string;
  generatedAt: string;
  period: string;
  overallScore: number;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  status: 'draft' | 'final' | 'submitted';
}

interface FrameworkCardProps {
  framework: ComplianceFramework;
  onPress: () => void;
}

const FrameworkCard: React.FC<FrameworkCardProps> = ({ framework, onPress }) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return COLORS.critical;
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      case 'low': return COLORS.low;
      default: return COLORS.textSecondary;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return COLORS.success;
    if (score >= 75) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <TouchableOpacity style={styles.frameworkCard} onPress={onPress}>
      <View style={styles.frameworkHeader}>
        <View style={styles.frameworkInfo}>
          <Text style={styles.frameworkName}>{framework.name}</Text>
          <Text style={styles.frameworkDescription} numberOfLines={2}>
            {framework.description}
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: getScoreColor(framework.overallScore) }]}>
            {framework.overallScore}%
          </Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </View>
      
      <View style={styles.frameworkStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{framework.controlsPassed}</Text>
          <Text style={styles.statLabel}>Passed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>{framework.controlsFailed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{framework.controlsTotal}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.riskIndicator}>
          <View style={[styles.riskDot, { backgroundColor: getRiskColor(framework.riskLevel) }]} />
          <Text style={[styles.riskText, { color: getRiskColor(framework.riskLevel) }]}>
            {framework.riskLevel.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.auditInfo}>
        <Text style={styles.auditText}>
          Last Audit: {new Date(framework.lastAudit).toLocaleDateString()}
        </Text>
        <Text style={styles.auditText}>
          Next Audit: {new Date(framework.nextAudit).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface ControlCardProps {
  control: ComplianceControl;
  onPress: () => void;
}

const ControlCard: React.FC<ControlCardProps> = ({ control, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return COLORS.success;
      case 'non_compliant': return COLORS.error;
      case 'partial': return COLORS.warning;
      case 'not_tested': return COLORS.textSecondary;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return '✅';
      case 'non_compliant': return '❌';
      case 'partial': return '⚠️';
      case 'not_tested': return '⏳';
      default: return '❓';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return COLORS.critical;
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      case 'low': return COLORS.low;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <TouchableOpacity style={styles.controlCard} onPress={onPress}>
      <View style={styles.controlHeader}>
        <View style={styles.controlInfo}>
          <Text style={styles.controlId}>{control.controlId}</Text>
          <Text style={styles.controlTitle} numberOfLines={2}>{control.title}</Text>
        </View>
        <View style={styles.controlStatus}>
          <Text style={styles.statusIcon}>{getStatusIcon(control.status)}</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(control.severity) }]}>
            <Text style={styles.severityText}>{control.severity.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.controlDescription} numberOfLines={3}>
        {control.description}
      </Text>
      
      <View style={styles.controlFooter}>
        <Text style={[styles.statusText, { color: getStatusColor(control.status) }]}>
          {control.status.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.lastCheckedText}>
          Checked: {new Date(control.lastChecked).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface ReportCardProps {
  report: ComplianceReport;
  onPress: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final': return COLORS.success;
      case 'draft': return COLORS.warning;
      case 'submitted': return COLORS.info;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportName}>{report.name}</Text>
          <Text style={styles.reportFramework}>{report.framework}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
          <Text style={styles.statusBadgeText}>{report.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.reportStats}>
        <Text style={styles.reportScore}>{report.overallScore}% Overall Score</Text>
        <Text style={styles.reportDetails}>
          {report.passedControls}/{report.totalControls} controls passed
        </Text>
      </View>
      
      <View style={styles.reportFooter}>
        <Text style={styles.reportPeriod}>Period: {report.period}</Text>
        <Text style={styles.reportDate}>
          Generated: {new Date(report.generatedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ComplianceScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'frameworks' | 'controls' | 'reports'>('frameworks');
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFrameworks = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockFrameworks: ComplianceFramework[] = [
      {
        id: '1',
        name: 'GDPR',
        description: 'General Data Protection Regulation for EU data protection and privacy',
        isEnabled: true,
        overallScore: 87,
        controlsTotal: 99,
        controlsPassed: 86,
        controlsFailed: 13,
        lastAudit: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
        nextAudit: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        riskLevel: 'medium'
      },
      {
        id: '2',
        name: 'SOX',
        description: 'Sarbanes-Oxley Act compliance for financial reporting and internal controls',
        isEnabled: true,
        overallScore: 94,
        controlsTotal: 67,
        controlsPassed: 63,
        controlsFailed: 4,
        lastAudit: new Date(Date.now() - 1814400000).toISOString(), // 21 days ago
        nextAudit: new Date(Date.now() + 3456000000).toISOString(), // 40 days from now
        riskLevel: 'low'
      },
      {
        id: '3',
        name: 'HIPAA',
        description: 'Health Insurance Portability and Accountability Act for healthcare data protection',
        isEnabled: false,
        overallScore: 72,
        controlsTotal: 154,
        controlsPassed: 111,
        controlsFailed: 43,
        lastAudit: new Date(Date.now() - 5184000000).toISOString(), // 60 days ago
        nextAudit: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        riskLevel: 'high'
      },
      {
        id: '4',
        name: 'ISO 27001',
        description: 'International standard for information security management systems',
        isEnabled: true,
        overallScore: 91,
        controlsTotal: 114,
        controlsPassed: 104,
        controlsFailed: 10,
        lastAudit: new Date(Date.now() - 1209600000).toISOString(), // 14 days ago
        nextAudit: new Date(Date.now() + 7776000000).toISOString(), // 90 days from now
        riskLevel: 'low'
      }
    ];
    
    setFrameworks(mockFrameworks);
    setIsLoading(false);
  };

  const fetchControls = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockControls: ComplianceControl[] = [
      {
        id: '1',
        framework: 'GDPR',
        controlId: 'GDPR-7.1',
        title: 'Data Processing Records',
        description: 'Maintain records of all data processing activities including purpose, categories of data subjects, and retention periods',
        status: 'non_compliant',
        severity: 'high',
        lastChecked: new Date(Date.now() - 604800000).toISOString(),
        evidence: 'Missing documentation for 3 data processing activities',
        remediationSteps: [
          'Document all data processing activities',
          'Implement automated record keeping system',
          'Train staff on documentation requirements'
        ]
      },
      {
        id: '2',
        framework: 'SOX',
        controlId: 'SOX-404.1',
        title: 'Internal Control Assessment',
        description: 'Management must assess and report on the effectiveness of internal control over financial reporting',
        status: 'compliant',
        severity: 'critical',
        lastChecked: new Date(Date.now() - 259200000).toISOString(),
        evidence: 'Annual assessment completed and documented'
      },
      {
        id: '3',
        framework: 'ISO 27001',
        controlId: 'A.9.1.1',
        title: 'Access Control Policy',
        description: 'An access control policy shall be established, documented and reviewed',
        status: 'partial',
        severity: 'medium',
        lastChecked: new Date(Date.now() - 432000000).toISOString(),
        evidence: 'Policy exists but requires annual review',
        remediationSteps: [
          'Schedule annual policy review',
          'Update policy with current best practices',
          'Obtain management approval for updated policy'
        ]
      },
      {
        id: '4',
        framework: 'GDPR',
        controlId: 'GDPR-25.1',
        title: 'Data Protection by Design',
        description: 'Implement appropriate technical and organizational measures to integrate data protection safeguards',
        status: 'compliant',
        severity: 'high',
        lastChecked: new Date(Date.now() - 172800000).toISOString(),
        evidence: 'Privacy impact assessments completed for all new systems'
      },
      {
        id: '5',
        framework: 'HIPAA',
        controlId: 'HIPAA-164.308',
        title: 'Administrative Safeguards',
        description: 'Implement administrative safeguards to protect electronic health information',
        status: 'not_tested',
        severity: 'critical',
        lastChecked: new Date(Date.now() - 2592000000).toISOString(),
        remediationSteps: [
          'Conduct security risk assessment',
          'Implement required administrative controls',
          'Document compliance procedures'
        ]
      }
    ];
    
    setControls(mockControls);
    setIsLoading(false);
  };

  const fetchReports = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const mockReports: ComplianceReport[] = [
      {
        id: '1',
        name: 'GDPR Q4 2024 Assessment',
        framework: 'GDPR',
        generatedAt: new Date(Date.now() - 604800000).toISOString(),
        period: 'Q4 2024',
        overallScore: 87,
        totalControls: 99,
        passedControls: 86,
        failedControls: 13,
        status: 'final'
      },
      {
        id: '2',
        name: 'SOX Annual Compliance Report',
        framework: 'SOX',
        generatedAt: new Date(Date.now() - 1209600000).toISOString(),
        period: 'FY 2024',
        overallScore: 94,
        totalControls: 67,
        passedControls: 63,
        failedControls: 4,
        status: 'submitted'
      },
      {
        id: '3',
        name: 'ISO 27001 Certification Audit',
        framework: 'ISO 27001',
        generatedAt: new Date(Date.now() - 259200000).toISOString(),
        period: 'Annual 2024',
        overallScore: 91,
        totalControls: 114,
        passedControls: 104,
        failedControls: 10,
        status: 'final'
      },
      {
        id: '4',
        name: 'HIPAA Readiness Assessment',
        framework: 'HIPAA',
        generatedAt: new Date(Date.now() - 1814400000).toISOString(),
        period: 'Q3 2024',
        overallScore: 72,
        totalControls: 154,
        passedControls: 111,
        failedControls: 43,
        status: 'draft'
      }
    ];
    
    setReports(mockReports);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFrameworks();
    fetchControls();
    fetchReports();
  }, []);

  const refreshData = () => {
    switch (activeTab) {
      case 'frameworks':
        fetchFrameworks();
        break;
      case 'controls':
        fetchControls();
        break;
      case 'reports':
        fetchReports();
        break;
    }
  };

  const getOverallComplianceScore = () => {
    if (frameworks.length === 0) return 0;
    return Math.round(
      frameworks
        .filter(f => f.isEnabled)
        .reduce((acc, f) => acc + f.overallScore, 0) / 
        frameworks.filter(f => f.isEnabled).length
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Compliance Dashboard</Text>
        <Text style={styles.subtitle}>Regulatory Framework Monitoring</Text>
      </View>

      <View style={styles.overallScoreCard}>
        <Text style={styles.overallScoreTitle}>Overall Compliance Score</Text>
        <Text style={[
          styles.overallScoreValue,
          { color: getOverallComplianceScore() >= 85 ? COLORS.success : 
                   getOverallComplianceScore() >= 70 ? COLORS.warning : COLORS.error }
        ]}>
          {getOverallComplianceScore()}%
        </Text>
        <Text style={styles.overallScoreSubtitle}>
          {frameworks.filter(f => f.isEnabled).length} active frameworks
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'frameworks' && styles.activeTab]}
          onPress={() => setActiveTab('frameworks')}
        >
          <Text style={[styles.tabText, activeTab === 'frameworks' && styles.activeTabText]}>
            Frameworks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'controls' && styles.activeTab]}
          onPress={() => setActiveTab('controls')}
        >
          <Text style={[styles.tabText, activeTab === 'controls' && styles.activeTabText]}>
            Controls
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
      >
        {activeTab === 'frameworks' && (
          <View>
            {frameworks.map((framework) => (
              <FrameworkCard
                key={framework.id}
                framework={framework}
                onPress={() => {}}
              />
            ))}
          </View>
        )}

        {activeTab === 'controls' && (
          <View>
            {controls.map((control) => (
              <ControlCard
                key={control.id}
                control={control}
                onPress={() => {}}
              />
            ))}
          </View>
        )}

        {activeTab === 'reports' && (
          <View>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onPress={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  overallScoreCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  overallScoreTitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  overallScoreSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    marginTop: 0,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  // Framework styles
  frameworkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  frameworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  frameworkInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  frameworkName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  frameworkDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  frameworkStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  riskText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  auditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  auditText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Control styles
  controlCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  controlInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  controlId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  controlStatus: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  severityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  controlDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  controlFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastCheckedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Report styles
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reportInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reportFramework: {
    fontSize: 14,
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reportStats: {
    marginBottom: SPACING.sm,
  },
  reportScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reportDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  reportPeriod: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default ComplianceScreen;