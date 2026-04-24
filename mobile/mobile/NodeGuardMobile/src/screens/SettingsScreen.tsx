import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'info' | 'action';
  value?: boolean | string;
  icon?: string;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    biometric: false,
    autoRefresh: true,
    soundAlerts: true,
    vibration: true,
    offlineMode: false,
    dataSync: true,
    analyticsSharing: false,
    crashReporting: true,
  });

  const handleToggle = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    Alert.alert('Settings Updated', `${key} has been ${value ? 'enabled' : 'disabled'}`);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'export_logs':
        Alert.alert('Export Logs', 'Security logs will be exported to device storage');
        break;
      case 'clear_cache':
        Alert.alert('Clear Cache', 'Application cache has been cleared');
        break;
      case 'reset_settings':
        Alert.alert(
          'Reset Settings',
          'Are you sure you want to reset all settings to default?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => {
              setSettings({
                notifications: true,
                darkMode: true,
                biometric: false,
                autoRefresh: true,
                soundAlerts: true,
                vibration: true,
                offlineMode: false,
                dataSync: true,
                analyticsSharing: false,
                crashReporting: true,
              });
              Alert.alert('Success', 'Settings have been reset to default');
            }}
          ]
        );
        break;
      case 'contact_support':
        Alert.alert('Contact Support', 'Opening support portal...');
        break;
      case 'privacy_policy':
        Alert.alert('Privacy Policy', 'Opening privacy policy...');
        break;
      case 'terms_of_service':
        Alert.alert('Terms of Service', 'Opening terms of service...');
        break;
      default:
        Alert.alert('Info', `Navigating to ${action}`);
    }
  };

  const settingsSections: SettingsSection[] = [
    {
      title: 'Security & Privacy',
      items: [
        {
          id: 'biometric',
          title: 'Biometric Authentication',
          subtitle: 'Use fingerprint or face ID to unlock app',
          type: 'toggle',
          value: settings.biometric,
          icon: '🔒',
          onToggle: (value) => handleToggle('biometric', value)
        },
        {
          id: 'offline_mode',
          title: 'Offline Mode',
          subtitle: 'Cache data for offline access',
          type: 'toggle',
          value: settings.offlineMode,
          icon: '📱',
          onToggle: (value) => handleToggle('offlineMode', value)
        },
        {
          id: 'data_sync',
          title: 'Data Synchronization',
          subtitle: 'Sync data with backend servers',
          type: 'toggle',
          value: settings.dataSync,
          icon: '🔄',
          onToggle: (value) => handleToggle('dataSync', value)
        },
      ]
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive security alerts and updates',
          type: 'toggle',
          value: settings.notifications,
          icon: '🔔',
          onToggle: (value) => handleToggle('notifications', value)
        },
        {
          id: 'sound_alerts',
          title: 'Sound Alerts',
          subtitle: 'Play sound for critical security alerts',
          type: 'toggle',
          value: settings.soundAlerts,
          icon: '🔊',
          onToggle: (value) => handleToggle('soundAlerts', value)
        },
        {
          id: 'vibration',
          title: 'Vibration',
          subtitle: 'Vibrate device for notifications',
          type: 'toggle',
          value: settings.vibration,
          icon: '📳',
          onToggle: (value) => handleToggle('vibration', value)
        },
      ]
    },
    {
      title: 'Application',
      items: [
        {
          id: 'dark_mode',
          title: 'Dark Mode',
          subtitle: 'Use dark theme for better visibility',
          type: 'toggle',
          value: settings.darkMode,
          icon: '🌙',
          onToggle: (value) => handleToggle('darkMode', value)
        },
        {
          id: 'auto_refresh',
          title: 'Auto Refresh',
          subtitle: 'Automatically refresh data every 30 seconds',
          type: 'toggle',
          value: settings.autoRefresh,
          icon: '♻️',
          onToggle: (value) => handleToggle('autoRefresh', value)
        },
        {
          id: 'language',
          title: 'Language',
          subtitle: 'English (US)',
          type: 'navigation',
          icon: '🌐',
          onPress: () => handleAction('language')
        },
        {
          id: 'time_zone',
          title: 'Time Zone',
          subtitle: 'UTC-8 (Pacific Standard Time)',
          type: 'navigation',
          icon: '🕒',
          onPress: () => handleAction('time_zone')
        },
      ]
    },
    {
      title: 'Data & Storage',
      items: [
        {
          id: 'analytics_sharing',
          title: 'Analytics Sharing',
          subtitle: 'Share anonymous usage data to improve app',
          type: 'toggle',
          value: settings.analyticsSharing,
          icon: '📊',
          onToggle: (value) => handleToggle('analyticsSharing', value)
        },
        {
          id: 'crash_reporting',
          title: 'Crash Reporting',
          subtitle: 'Automatically report crashes to developers',
          type: 'toggle',
          value: settings.crashReporting,
          icon: '🔧',
          onToggle: (value) => handleToggle('crashReporting', value)
        },
        {
          id: 'export_logs',
          title: 'Export Security Logs',
          subtitle: 'Export app logs for analysis',
          type: 'action',
          icon: '📄',
          onPress: () => handleAction('export_logs')
        },
        {
          id: 'clear_cache',
          title: 'Clear Cache',
          subtitle: 'Clear all cached data (125 MB)',
          type: 'action',
          icon: '🗑️',
          onPress: () => handleAction('clear_cache')
        },
      ]
    },
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          subtitle: 'Update account information',
          type: 'navigation',
          icon: '👤',
          onPress: () => handleAction('profile')
        },
        {
          id: 'security_settings',
          title: 'Security Settings',
          subtitle: 'Password, 2FA, and security options',
          type: 'navigation',
          icon: '🔐',
          onPress: () => handleAction('security_settings')
        },
        {
          id: 'api_keys',
          title: 'API Keys',
          subtitle: 'Manage integration API keys',
          type: 'navigation',
          icon: '🗝️',
          onPress: () => handleAction('api_keys')
        },
      ]
    },
    {
      title: 'Advanced',
      items: [
        {
          id: 'developer_mode',
          title: 'Developer Options',
          subtitle: 'Advanced debugging and testing features',
          type: 'navigation',
          icon: '⚙️',
          onPress: () => handleAction('developer_mode')
        },
        {
          id: 'reset_settings',
          title: 'Reset Settings',
          subtitle: 'Reset all settings to default values',
          type: 'action',
          icon: '🔄',
          onPress: () => handleAction('reset_settings')
        },
      ]
    },
    {
      title: 'About',
      items: [
        {
          id: 'version',
          title: 'Version',
          subtitle: '1.0.0 (Build 1)',
          type: 'info',
          icon: 'ℹ️',
        },
        {
          id: 'privacy_policy',
          title: 'Privacy Policy',
          subtitle: 'View our privacy policy',
          type: 'navigation',
          icon: '📋',
          onPress: () => handleAction('privacy_policy')
        },
        {
          id: 'terms_of_service',
          title: 'Terms of Service',
          subtitle: 'View terms and conditions',
          type: 'navigation',
          icon: '📜',
          onPress: () => handleAction('terms_of_service')
        },
        {
          id: 'contact_support',
          title: 'Contact Support',
          subtitle: 'Get help and report issues',
          type: 'navigation',
          icon: '💬',
          onPress: () => handleAction('contact_support')
        },
      ]
    },
  ];

  const renderSettingsItem = (item: SettingsItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingsItem}
        onPress={item.onPress}
        disabled={item.type === 'toggle' || item.type === 'info'}
      >
        <View style={styles.itemLeft}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.itemRight}>
          {item.type === 'toggle' && (
            <Switch
              value={item.value as boolean}
              onValueChange={item.onToggle}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.primary }}
              thumbColor={COLORS.text}
              ios_backgroundColor={COLORS.textSecondary}
            />
          )}
          {(item.type === 'navigation' || item.type === 'action') && (
            <Text style={styles.chevron}>›</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Preferences & Configuration</Text>
      </View>

      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>SA</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Security Analyst</Text>
          <Text style={styles.profileEmail}>analyst@nodeguard.ai</Text>
          <Text style={styles.profileRole}>Administrator</Text>
        </View>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map(renderSettingsItem)}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NodeGuard AI Security Platform</Text>
          <Text style={styles.footerSubtext}>
            Powered by advanced threat detection and response
          </Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  editProfileButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editProfileText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionItems: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  itemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  footerVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});

export default SettingsScreen;