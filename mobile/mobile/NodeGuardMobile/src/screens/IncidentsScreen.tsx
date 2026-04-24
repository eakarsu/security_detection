import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';
import { apiService } from '../services/api';
import { SecurityIncident } from '../types';

interface IncidentCardProps {
  incident: SecurityIncident;
  onPress: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onPress, onStatusChange }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return COLORS.critical;
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      case 'low': return COLORS.low;
      default: return COLORS.medium;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return COLORS.critical;
      case 'investigating': return COLORS.warning;
      case 'resolved': return COLORS.success;
      case 'closed': return COLORS.textSecondary;
      default: return COLORS.medium;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity style={styles.incidentCard} onPress={onPress}>
      <View style={styles.incidentHeader}>
        <View style={styles.incidentTitleRow}>
          <Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(incident.severity) }]}>
            <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.incidentMeta}>
          <Text style={styles.incidentDate}>{formatDate(incident.createdAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
            <Text style={styles.statusText}>{incident.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.incidentDescription} numberOfLines={2}>
        {incident.description}
      </Text>
      
      {incident.riskScore && (
        <View style={styles.riskScoreContainer}>
          <Text style={styles.riskScoreLabel}>Risk Score:</Text>
          <Text style={[
            styles.riskScoreValue,
            { color: incident.riskScore >= 8 ? COLORS.critical : 
                     incident.riskScore >= 6 ? COLORS.high :
                     incident.riskScore >= 4 ? COLORS.medium : COLORS.low }
          ]}>
            {incident.riskScore}/10
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface IncidentDetailModalProps {
  incident: SecurityIncident | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ 
  incident, 
  visible, 
  onClose, 
  onStatusChange 
}) => {
  if (!incident) return null;

  const statusOptions = ['open', 'investigating', 'resolved', 'closed'];

  const handleStatusChange = (newStatus: string) => {
    Alert.alert(
      'Change Status',
      `Change incident status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            onStatusChange(incident.id, newStatus);
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Incident Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.detailTitle}>{incident.title}</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Severity:</Text>
            <View style={[styles.severityBadge, { backgroundColor: 
              incident.severity === 'critical' ? COLORS.critical :
              incident.severity === 'high' ? COLORS.high :
              incident.severity === 'medium' ? COLORS.medium : COLORS.low
            }]}>
              <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor:
              incident.status === 'open' ? COLORS.critical :
              incident.status === 'investigating' ? COLORS.warning :
              incident.status === 'resolved' ? COLORS.success : COLORS.textSecondary
            }]}>
              <Text style={styles.statusText}>{incident.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailDescription}>{incident.description}</Text>
          
          {incident.riskScore && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Risk Score:</Text>
              <Text style={styles.riskScoreValue}>{incident.riskScore}/10</Text>
            </View>
          )}
          
          <Text style={styles.detailLabel}>Change Status:</Text>
          <View style={styles.statusButtons}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  incident.status === status && styles.statusButtonActive
                ]}
                onPress={() => handleStatusChange(status)}
                disabled={incident.status === status}
              >
                <Text style={[
                  styles.statusButtonText,
                  incident.status === status && styles.statusButtonTextActive
                ]}>
                  {status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const IncidentsScreen: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock incidents data
    const mockIncidents: SecurityIncident[] = [
      {
        id: '1',
        title: 'Suspicious Network Traffic Detected',
        description: 'Abnormal outbound connections to unknown external servers detected from workstation WS-001. Traffic patterns suggest potential data exfiltration attempt.',
        severity: 'critical',
        status: 'open',
        assignedTo: 'security-analyst-1',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        threatType: 'Data Exfiltration',
        riskScore: 8.5
      },
      {
        id: '2', 
        title: 'Failed Login Attempts',
        description: 'Multiple failed authentication attempts detected for user admin@company.com from IP 192.168.1.100. Possible brute force attack.',
        severity: 'high',
        status: 'investigating',
        assignedTo: 'security-analyst-2',
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updatedAt: new Date(Date.now() - 900000).toISOString(),
        threatType: 'Brute Force',
        riskScore: 7.2
      },
      {
        id: '3',
        title: 'Malware Signature Match',
        description: 'Email attachment from external sender contains known malware signature. File quarantined automatically.',
        severity: 'high',
        status: 'resolved',
        assignedTo: 'security-analyst-1',
        createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        threatType: 'Malware',
        riskScore: 6.8
      },
      {
        id: '4',
        title: 'Unauthorized Access Attempt',
        description: 'User attempted to access restricted financial database outside of business hours. Access denied by security policy.',
        severity: 'medium',
        status: 'investigating',
        createdAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        updatedAt: new Date(Date.now() - 10800000).toISOString(),
        threatType: 'Access Violation',
        riskScore: 4.5
      },
      {
        id: '5',
        title: 'Phishing Email Detected',
        description: 'Suspicious email with potential phishing links detected and blocked. Sender domain flagged for review.',
        severity: 'medium',
        status: 'closed',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 82800000).toISOString(),
        threatType: 'Phishing',
        riskScore: 3.7
      },
      {
        id: '6',
        title: 'USB Device Policy Violation', 
        description: 'Unknown USB storage device connected to workstation WS-045. Device blocked per security policy.',
        severity: 'low',
        status: 'resolved',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 169200000).toISOString(),
        threatType: 'Policy Violation',
        riskScore: 2.1
      }
    ];
    
    setIncidents(mockIncidents);
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIncidents(prevIncidents =>
      prevIncidents.map(incident =>
        incident.id === id ? { ...incident, status: status as any, updatedAt: new Date().toISOString() } : incident
      )
    );
    Alert.alert('Success', 'Incident status updated');
  };

  const openIncidentDetail = (incident: SecurityIncident) => {
    setSelectedIncident(incident);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const renderIncident = ({ item }: { item: SecurityIncident }) => (
    <IncidentCard
      incident={item}
      onPress={() => openIncidentDetail(item)}
      onStatusChange={handleStatusChange}
    />
  );

  const getFilteredIncidents = () => {
    return incidents.sort((a, b) => {
      // Sort by severity priority and date
      const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const severityDiff = (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
                          (severityOrder[b.severity as keyof typeof severityOrder] || 2);
      
      if (severityDiff !== 0) return severityDiff;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Security Incidents</Text>
        <Text style={styles.subtitle}>{incidents.length} total incidents</Text>
      </View>

      {isLoading && incidents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading incidents...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredIncidents()}
          renderItem={renderIncident}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchIncidents} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No incidents found</Text>
            </View>
          }
        />
      )}

      <IncidentDetailModal
        incident={selectedIncident}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
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
  listContainer: {
    padding: SPACING.md,
  },
  incidentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  incidentHeader: {
    marginBottom: SPACING.sm,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  incidentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  incidentDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  severityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  riskScoreValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginRight: SPACING.sm,
  },
  detailDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statusButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusButtonTextActive: {
    color: COLORS.text,
  },
});

export default IncidentsScreen;