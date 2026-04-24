import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'notification';
  description: string;
  config?: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: WorkflowStep[];
  createdAt: string;
  lastRun?: string;
  runCount: number;
  successRate: number;
}

interface WorkflowCardProps {
  workflow: Workflow;
  onPress: () => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onPress, onToggleActive }) => {
  const getStatusColor = (isActive: boolean) => isActive ? COLORS.success : COLORS.textSecondary;

  return (
    <TouchableOpacity style={styles.workflowCard} onPress={onPress}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowInfo}>
          <Text style={styles.workflowName}>{workflow.name}</Text>
          <Text style={styles.workflowDescription} numberOfLines={2}>
            {workflow.description}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.statusToggle, { backgroundColor: getStatusColor(workflow.isActive) }]}
          onPress={() => onToggleActive(workflow.id, !workflow.isActive)}
        >
          <Text style={styles.statusText}>
            {workflow.isActive ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.workflowStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Steps</Text>
          <Text style={styles.statValue}>{workflow.steps.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Runs</Text>
          <Text style={styles.statValue}>{workflow.runCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={[styles.statValue, { color: workflow.successRate > 90 ? COLORS.success : workflow.successRate > 70 ? COLORS.warning : COLORS.error }]}>
            {workflow.successRate}%
          </Text>
        </View>
        {workflow.lastRun && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Last Run</Text>
            <Text style={styles.statValue}>
              {new Date(workflow.lastRun).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface WorkflowDetailModalProps {
  workflow: Workflow | null;
  visible: boolean;
  onClose: () => void;
  onRunWorkflow: (id: string) => void;
}

const WorkflowDetailModal: React.FC<WorkflowDetailModalProps> = ({
  workflow,
  visible,
  onClose,
  onRunWorkflow,
}) => {
  if (!workflow) return null;

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'trigger': return '⚡';
      case 'condition': return '🔍';
      case 'action': return '⚙️';
      case 'notification': return '📧';
      default: return '📋';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'trigger': return COLORS.warning;
      case 'condition': return COLORS.info;
      case 'action': return COLORS.primary;
      case 'notification': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{workflow.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.detailDescription}>{workflow.description}</Text>
          
          <View style={styles.workflowActions}>
            <TouchableOpacity
              style={styles.runButton}
              onPress={() => onRunWorkflow(workflow.id)}
            >
              <Text style={styles.runButtonText}>▶ Run Workflow</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Workflow Steps</Text>
          {workflow.steps.map((step, index) => (
            <View key={step.id} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepIcon}>{getStepIcon(step.type)}</Text>
                  <View style={[styles.stepTypeIndicator, { backgroundColor: getStepColor(step.type) }]} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepName}>{step.name}</Text>
                  <Text style={styles.stepType}>{step.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
              {index < workflow.steps.length - 1 && <View style={styles.stepConnector} />}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const WorkflowBuilderScreen: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock workflow data
    const mockWorkflows: Workflow[] = [
      {
        id: '1',
        name: 'Critical Threat Response',
        description: 'Automated response workflow for critical security threats. Isolates affected systems, notifies security team, and initiates incident response procedures.',
        isActive: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        runCount: 23,
        successRate: 96,
        steps: [
          {
            id: 's1',
            name: 'Threat Detection',
            type: 'trigger',
            description: 'Monitors for threats with risk score ≥ 8.0'
          },
          {
            id: 's2', 
            name: 'Verify Threat Level',
            type: 'condition',
            description: 'Confirms threat severity and impact assessment'
          },
          {
            id: 's3',
            name: 'Isolate System',
            type: 'action',
            description: 'Automatically isolates affected systems from network'
          },
          {
            id: 's4',
            name: 'Notify Security Team',
            type: 'notification',
            description: 'Sends immediate alert to security operations center'
          },
          {
            id: 's5',
            name: 'Create Incident',
            type: 'action',
            description: 'Automatically creates high-priority incident ticket'
          }
        ]
      },
      {
        id: '2',
        name: 'Failed Login Investigation',
        description: 'Investigates multiple failed login attempts and implements protective measures to prevent brute force attacks.',
        isActive: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastRun: new Date(Date.now() - 7200000).toISOString(),
        runCount: 156,
        successRate: 89,
        steps: [
          {
            id: 's1',
            name: 'Failed Login Trigger',
            type: 'trigger',
            description: 'Detects 5+ failed logins within 15 minutes'
          },
          {
            id: 's2',
            name: 'Check IP Reputation',
            type: 'condition',
            description: 'Verifies if source IP is on threat intelligence feeds'
          },
          {
            id: 's3',
            name: 'Temporary Account Lock',
            type: 'action',
            description: 'Temporarily locks affected user account'
          },
          {
            id: 's4',
            name: 'Block Suspicious IP',
            type: 'action',
            description: 'Adds source IP to firewall block list'
          },
          {
            id: 's5',
            name: 'Alert User & Admin',
            type: 'notification',
            description: 'Notifies account owner and security admin'
          }
        ]
      },
      {
        id: '3',
        name: 'Compliance Monitoring',
        description: 'Continuous monitoring for compliance violations and automated remediation actions to maintain regulatory standards.',
        isActive: false,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        runCount: 67,
        successRate: 78,
        steps: [
          {
            id: 's1',
            name: 'Policy Violation Detection',
            type: 'trigger',
            description: 'Monitors for GDPR, HIPAA compliance violations'
          },
          {
            id: 's2',
            name: 'Assess Violation Severity',
            type: 'condition',
            description: 'Determines if immediate action is required'
          },
          {
            id: 's3',
            name: 'Generate Compliance Report',
            type: 'action',
            description: 'Creates detailed violation report with evidence'
          },
          {
            id: 's4',
            name: 'Notify Compliance Officer',
            type: 'notification',
            description: 'Alerts compliance team of potential violation'
          }
        ]
      },
      {
        id: '4',
        name: 'Malware Containment',
        description: 'Rapid containment and analysis workflow for detected malware to prevent spread across the network.',
        isActive: true,
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        lastRun: new Date(Date.now() - 21600000).toISOString(),
        runCount: 8,
        successRate: 100,
        steps: [
          {
            id: 's1',
            name: 'Malware Detection',
            type: 'trigger',
            description: 'Antivirus or EDR detects malware signature'
          },
          {
            id: 's2',
            name: 'Quarantine File',
            type: 'action',
            description: 'Immediately quarantines suspicious file'
          },
          {
            id: 's3',
            name: 'Network Isolation',
            type: 'action',
            description: 'Isolates infected system from network'
          },
          {
            id: 's4',
            name: 'Malware Analysis',
            type: 'action',
            description: 'Submits sample for detailed analysis'
          },
          {
            id: 's5',
            name: 'Incident Documentation',
            type: 'action',
            description: 'Documents incident for forensic review'
          }
        ]
      }
    ];
    
    setWorkflows(mockWorkflows);
    setIsLoading(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setWorkflows(prevWorkflows =>
      prevWorkflows.map(workflow =>
        workflow.id === id ? { ...workflow, isActive } : workflow
      )
    );
    
    Alert.alert('Success', `Workflow ${isActive ? 'activated' : 'deactivated'}`);
  };

  const handleRunWorkflow = async (id: string) => {
    Alert.alert(
      'Run Workflow',
      'Are you sure you want to manually execute this workflow?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            setWorkflows(prevWorkflows =>
              prevWorkflows.map(workflow =>
                workflow.id === id
                  ? {
                      ...workflow,
                      runCount: workflow.runCount + 1,
                      lastRun: new Date().toISOString()
                    }
                  : workflow
              )
            );
            
            Alert.alert('Success', 'Workflow executed successfully');
            setModalVisible(false);
          }
        }
      ]
    );
  };

  const openWorkflowDetail = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workflow Builder</Text>
        <Text style={styles.subtitle}>Automated Security Response</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchWorkflows} />
        }
      >
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workflows.filter(w => w.isActive).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workflows.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.round(workflows.reduce((acc, w) => acc + w.runCount, 0) / workflows.length) || 0}
            </Text>
            <Text style={styles.statLabel}>Avg Runs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.round(workflows.reduce((acc, w) => acc + w.successRate, 0) / workflows.length) || 0}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onPress={() => openWorkflowDetail(workflow)}
            onToggleActive={handleToggleActive}
          />
        ))}
      </ScrollView>

      <WorkflowDetailModal
        workflow={selectedWorkflow}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onRunWorkflow={handleRunWorkflow}
      />
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
  scrollContent: {
    padding: SPACING.md,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  workflowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  workflowInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  workflowDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  statusToggle: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  workflowStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  detailDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  workflowActions: {
    marginBottom: SPACING.lg,
  },
  runButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  runButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  stepCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepIconContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepTypeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepType: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.surface,
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  stepConnector: {
    position: 'absolute',
    bottom: -6,
    left: 36,
    width: 2,
    height: 12,
    backgroundColor: COLORS.primary,
  },
});

export default WorkflowBuilderScreen;