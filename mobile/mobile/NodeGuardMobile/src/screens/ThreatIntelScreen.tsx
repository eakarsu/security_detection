import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';

interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  description: string;
  isActive: boolean;
  lastUpdate: string;
  threatCount: number;
  reliability: 'high' | 'medium' | 'low';
}

interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  threat_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  description: string;
  tags: string[];
}

interface ThreatFeedCardProps {
  feed: ThreatFeed;
  onPress: () => void;
  onToggle: (id: string, isActive: boolean) => void;
}

const ThreatFeedCard: React.FC<ThreatFeedCardProps> = ({ feed, onPress, onToggle }) => {
  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high': return COLORS.success;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const getReliabilityIcon = (reliability: string) => {
    switch (reliability) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <TouchableOpacity style={styles.feedCard} onPress={onPress}>
      <View style={styles.feedHeader}>
        <View style={styles.feedInfo}>
          <Text style={styles.feedName}>{feed.name}</Text>
          <Text style={styles.feedSource}>Source: {feed.source}</Text>
          <Text style={styles.feedDescription} numberOfLines={2}>
            {feed.description}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: feed.isActive ? COLORS.success : COLORS.textSecondary }]}
          onPress={() => onToggle(feed.id, !feed.isActive)}
        >
          <Text style={styles.toggleText}>{feed.isActive ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.feedStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Threats</Text>
          <Text style={styles.statValue}>{feed.threatCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Reliability</Text>
          <View style={styles.reliabilityContainer}>
            <Text style={styles.reliabilityIcon}>{getReliabilityIcon(feed.reliability)}</Text>
            <Text style={[styles.reliabilityText, { color: getReliabilityColor(feed.reliability) }]}>
              {feed.reliability.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Last Update</Text>
          <Text style={styles.statValue}>
            {new Date(feed.lastUpdate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface ThreatIndicatorCardProps {
  indicator: ThreatIndicator;
  onPress: () => void;
}

const ThreatIndicatorCard: React.FC<ThreatIndicatorCardProps> = ({ indicator, onPress }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return '🌐';
      case 'domain': return '🔗';
      case 'hash': return '#️⃣';
      case 'url': return '📎';
      case 'email': return '📧';
      default: return '🚩';
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
    <TouchableOpacity style={styles.indicatorCard} onPress={onPress}>
      <View style={styles.indicatorHeader}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeIcon}>{getTypeIcon(indicator.type)}</Text>
          <Text style={styles.typeText}>{indicator.type.toUpperCase()}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(indicator.severity) }]}>
          <Text style={styles.severityText}>{indicator.severity.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.indicatorValue} numberOfLines={1}>{indicator.value}</Text>
      <Text style={styles.indicatorThreat}>{indicator.threat_type}</Text>
      
      <View style={styles.indicatorMeta}>
        <Text style={styles.metaText}>Confidence: {indicator.confidence}%</Text>
        <Text style={styles.metaText}>Source: {indicator.source}</Text>
      </View>
      
      <View style={styles.tagContainer}>
        {indicator.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {indicator.tags.length > 3 && (
          <Text style={styles.moreTagsText}>+{indicator.tags.length - 3}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface ThreatDetailModalProps {
  indicator: ThreatIndicator | null;
  visible: boolean;
  onClose: () => void;
}

const ThreatDetailModal: React.FC<ThreatDetailModalProps> = ({ indicator, visible, onClose }) => {
  if (!indicator) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Threat Intelligence</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Indicator Value</Text>
            <Text style={styles.detailValue}>{indicator.value}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Threat Type</Text>
            <Text style={styles.detailValue}>{indicator.threat_type}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailDescription}>{indicator.description}</Text>
          </View>
          
          <View style={styles.detailGrid}>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{indicator.type.toUpperCase()}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>Severity</Text>
              <Text style={styles.detailValue}>{indicator.severity.toUpperCase()}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>Confidence</Text>
              <Text style={styles.detailValue}>{indicator.confidence}%</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>Source</Text>
              <Text style={styles.detailValue}>{indicator.source}</Text>
            </View>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>First Seen</Text>
            <Text style={styles.detailValue}>{new Date(indicator.first_seen).toLocaleString()}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Last Seen</Text>
            <Text style={styles.detailValue}>{new Date(indicator.last_seen).toLocaleString()}</Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailTagContainer}>
              {indicator.tags.map((tag, index) => (
                <View key={index} style={styles.detailTag}>
                  <Text style={styles.detailTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const ThreatIntelScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feeds' | 'indicators'>('indicators');
  const [threatFeeds, setThreatFeeds] = useState<ThreatFeed[]>([]);
  const [threatIndicators, setThreatIndicators] = useState<ThreatIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIndicator | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchThreatFeeds = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockFeeds: ThreatFeed[] = [
      {
        id: '1',
        name: 'MITRE ATT&CK Framework',
        source: 'mitre.org',
        description: 'Comprehensive knowledge base of adversary tactics, techniques, and procedures (TTPs)',
        isActive: true,
        lastUpdate: new Date(Date.now() - 3600000).toISOString(),
        threatCount: 2847,
        reliability: 'high'
      },
      {
        id: '2',
        name: 'VirusTotal Intelligence',
        source: 'virustotal.com',
        description: 'Real-time malware detection and analysis from multiple antivirus engines',
        isActive: true,
        lastUpdate: new Date(Date.now() - 1800000).toISOString(),
        threatCount: 15432,
        reliability: 'high'
      },
      {
        id: '3',
        name: 'AlienVault OTX',
        source: 'otx.alienvault.com',
        description: 'Open threat intelligence platform with community-driven threat data',
        isActive: false,
        lastUpdate: new Date(Date.now() - 14400000).toISOString(),
        threatCount: 8965,
        reliability: 'medium'
      },
      {
        id: '4',
        name: 'Emerging Threats',
        source: 'emergingthreats.net',
        description: 'Real-time threat intelligence rules and IOCs for network security',
        isActive: true,
        lastUpdate: new Date(Date.now() - 7200000).toISOString(),
        threatCount: 4521,
        reliability: 'high'
      }
    ];
    
    setThreatFeeds(mockFeeds);
    setIsLoading(false);
  };

  const fetchThreatIndicators = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockIndicators: ThreatIndicator[] = [
      {
        id: '1',
        type: 'ip',
        value: '192.168.100.45',
        threat_type: 'Command & Control',
        severity: 'critical',
        confidence: 95,
        source: 'VirusTotal',
        first_seen: new Date(Date.now() - 86400000).toISOString(),
        last_seen: new Date(Date.now() - 3600000).toISOString(),
        description: 'IP address associated with known botnet command and control infrastructure. Multiple malware families have been observed communicating with this address.',
        tags: ['botnet', 'c2', 'malware', 'apt29']
      },
      {
        id: '2',
        type: 'domain',
        value: 'malicious-banking-site.com',
        threat_type: 'Phishing',
        severity: 'high',
        confidence: 89,
        source: 'PhishTank',
        first_seen: new Date(Date.now() - 172800000).toISOString(),
        last_seen: new Date(Date.now() - 7200000).toISOString(),
        description: 'Fraudulent domain designed to mimic legitimate banking websites to steal credentials and financial information.',
        tags: ['phishing', 'banking', 'credential-theft', 'social-engineering']
      },
      {
        id: '3',
        type: 'hash',
        value: 'a1b2c3d4e5f6789012345678901234567890abcd',
        threat_type: 'Ransomware',
        severity: 'critical',
        confidence: 98,
        source: 'MITRE ATT&CK',
        first_seen: new Date(Date.now() - 259200000).toISOString(),
        last_seen: new Date(Date.now() - 14400000).toISOString(),
        description: 'SHA1 hash of ransomware executable that encrypts files and demands payment. Part of the NotPetya ransomware family.',
        tags: ['ransomware', 'notpetya', 'encryption', 'destructive']
      },
      {
        id: '4',
        type: 'url',
        value: 'https://evil-download-site.net/malware.exe',
        threat_type: 'Malware Distribution',
        severity: 'high',
        confidence: 92,
        source: 'URLVoid',
        first_seen: new Date(Date.now() - 432000000).toISOString(),
        last_seen: new Date(Date.now() - 21600000).toISOString(),
        description: 'URL hosting malicious executable files. Used in spear-phishing campaigns to distribute trojans and backdoors.',
        tags: ['malware', 'trojan', 'spear-phishing', 'distribution']
      },
      {
        id: '5',
        type: 'email',
        value: 'ceo-fake@company-impersonation.com',
        threat_type: 'Business Email Compromise',
        severity: 'medium',
        confidence: 78,
        source: 'Emerging Threats',
        first_seen: new Date(Date.now() - 518400000).toISOString(),
        last_seen: new Date(Date.now() - 86400000).toISOString(),
        description: 'Email address used in business email compromise attacks, impersonating company executives to conduct wire fraud.',
        tags: ['bec', 'impersonation', 'wire-fraud', 'social-engineering']
      },
      {
        id: '6',
        type: 'ip',
        value: '10.0.0.1',
        threat_type: 'Lateral Movement',
        severity: 'medium',
        confidence: 65,
        source: 'Internal SIEM',
        first_seen: new Date(Date.now() - 604800000).toISOString(),
        last_seen: new Date(Date.now() - 43200000).toISOString(),
        description: 'Internal IP address showing signs of compromise and lateral movement activities across the network.',
        tags: ['lateral-movement', 'internal', 'compromise', 'reconnaissance']
      }
    ];
    
    setThreatIndicators(mockIndicators);
    setIsLoading(false);
  };

  const handleToggleFeed = async (id: string, isActive: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setThreatFeeds(prevFeeds =>
      prevFeeds.map(feed =>
        feed.id === id ? { ...feed, isActive } : feed
      )
    );
    
    Alert.alert('Success', `Threat feed ${isActive ? 'activated' : 'deactivated'}`);
  };

  const openIndicatorDetail = (indicator: ThreatIndicator) => {
    setSelectedIndicator(indicator);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchThreatFeeds();
    fetchThreatIndicators();
  }, []);

  const refreshData = () => {
    if (activeTab === 'feeds') {
      fetchThreatFeeds();
    } else {
      fetchThreatIndicators();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Threat Intelligence</Text>
        <Text style={styles.subtitle}>External Threat Feeds & IOCs</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'indicators' && styles.activeTab]}
          onPress={() => setActiveTab('indicators')}
        >
          <Text style={[styles.tabText, activeTab === 'indicators' && styles.activeTabText]}>
            Indicators ({threatIndicators.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feeds' && styles.activeTab]}
          onPress={() => setActiveTab('feeds')}
        >
          <Text style={[styles.tabText, activeTab === 'feeds' && styles.activeTabText]}>
            Feeds ({threatFeeds.filter(f => f.isActive).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
      >
        {activeTab === 'indicators' && (
          <View>
            {threatIndicators.map((indicator) => (
              <ThreatIndicatorCard
                key={indicator.id}
                indicator={indicator}
                onPress={() => openIndicatorDetail(indicator)}
              />
            ))}
          </View>
        )}

        {activeTab === 'feeds' && (
          <View>
            <View style={styles.feedsStats}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{threatFeeds.filter(f => f.isActive).length}</Text>
                <Text style={styles.statLabel}>Active Feeds</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {threatFeeds.reduce((acc, f) => acc + f.threatCount, 0)}
                </Text>
                <Text style={styles.statLabel}>Total IOCs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {threatFeeds.filter(f => f.reliability === 'high').length}
                </Text>
                <Text style={styles.statLabel}>High Reliability</Text>
              </View>
            </View>

            {threatFeeds.map((feed) => (
              <ThreatFeedCard
                key={feed.id}
                feed={feed}
                onPress={() => {}}
                onToggle={handleToggleFeed}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ThreatDetailModal
        indicator={selectedIndicator}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
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

  // Feed styles
  feedsStats: {
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  feedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  feedInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  feedName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  feedSource: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  feedDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  toggle: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  feedStats: {
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
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reliabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reliabilityIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  reliabilityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Indicator styles
  indicatorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
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
  indicatorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontFamily: 'monospace',
  },
  indicatorThreat: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  indicatorMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  moreTagsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  detailSection: {
    marginBottom: SPACING.lg,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  detailDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
  },
  detailGridItem: {
    width: '48%',
    marginRight: '4%',
    marginBottom: SPACING.md,
  },
  detailTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailTag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailTagText: {
    fontSize: 12,
    color: COLORS.text,
  },
});

export default ThreatIntelScreen;