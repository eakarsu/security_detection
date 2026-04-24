import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Services
import { notificationService } from './src/services/notifications';
import { authStorage, settingsStorage } from './src/services/storage';

// Hooks
import { useAuth } from './src/hooks/useAuth';

// Constants
import { COLORS } from './src/constants/config';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notification service
      await notificationService.initialize();

      // Set up notification listeners
      const notificationListener = notificationService.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
        }
      );

      const responseListener = notificationService.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          handleNotificationPress(response);
        }
      );

      // Mark app as ready
      setAppReady(true);
      await SplashScreen.hideAsync();

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setAppReady(true);
      await SplashScreen.hideAsync();
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isAuthenticated) {
      // Refresh data when app becomes active
      console.log('App became active, refreshing data...');
    }
  };

  const handleNotificationPress = (response: any) => {
    const { data } = response.notification.request.content;
    
    if (data.incidentId) {
      // Navigate to incident details
      console.log('Navigate to incident:', data.incidentId);
    }
  };

  if (!appReady) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <AppNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
