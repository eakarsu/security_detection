import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/config';

interface MenuItemProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, subtitle, icon, onPress, badge }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.menuItemRight}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
);

interface MenuScreenProps {
  navigation?: any;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ navigation }) => {
  const menuItems = [
    {
      title: 'User Profile',
      subtitle: 'Manage account and preferences',
      icon: '👤',
      onPress: () => console.log('User Profile'),
    },
    {
      title: 'Settings',
      subtitle: 'App configuration and security',
      icon: '⚙️',
      onPress: () => console.log('Settings'),
    },
    {
      title: 'API Management',
      subtitle: 'Configure API endpoints and keys',
      icon: '🔗',
      onPress: () => console.log('API Management'),
    },
    {
      title: 'Notifications',
      subtitle: 'Alert preferences and channels',
      icon: '🔔',
      onPress: () => console.log('Notifications'),
      badge: '3',
    },
    {
      title: 'Export Data',
      subtitle: 'Download reports and logs',
      icon: '💾',
      onPress: () => console.log('Export Data'),
    },
    {
      title: 'Help & Support',
      subtitle: 'Documentation and contact info',
      icon: '💬',
      onPress: () => console.log('Help & Support'),
    },
    {
      title: 'About',
      subtitle: 'App version and legal information',
      icon: 'ℹ️',
      onPress: () => console.log('About'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>Additional Options</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              onPress={item.onPress}
              badge={item.badge}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>NodeGuard Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>Build 1 • Last updated today</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: SPACING.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chevron: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});

export default MenuScreen;