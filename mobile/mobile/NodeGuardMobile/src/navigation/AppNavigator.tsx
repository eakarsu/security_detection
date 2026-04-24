import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../constants/config';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import IncidentsScreen from '../screens/IncidentsScreen';
import WorkflowBuilderScreen from '../screens/WorkflowBuilderScreen';
import ThreatIntelScreen from '../screens/ThreatIntelScreen';
import ComplianceScreen from '../screens/ComplianceScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab bar icon component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const getIcon = () => {
    switch (name) {
      case 'Dashboard': return focused ? '🏠' : '🏘️';
      case 'Incidents': return focused ? '🚨' : '⚠️';
      case 'Workflows': return focused ? '⚙️' : '🔧';
      case 'Threat Intel': return focused ? '🛡️' : '🔍';
      case 'Compliance': return focused ? '📋' : '📄';
      case 'Settings': return focused ? '⚙️' : '🔧';
      default: return '📱';
    }
  };

  return (
    <Text style={{ 
      fontSize: 16, 
      opacity: focused ? 1 : 0.6,
    }}>
      {getIcon()}
    </Text>
  );
};

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.background,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 4,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Incidents" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Workflows"
        component={WorkflowBuilderScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Workflows" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Threat Intel"
        component={ThreatIntelScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Threat Intel" focused={focused} />,
          tabBarLabel: 'Intel',
        }}
      />
      <Tab.Screen
        name="Compliance"
        component={ComplianceScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Compliance" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Root navigator without authentication (for development)
interface AppNavigatorProps {}

const AppNavigator: React.FC<AppNavigatorProps> = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;