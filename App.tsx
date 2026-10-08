import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  AppState,
  AppStateStatus,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuthStore } from './src/stores/authStore';
import { useAppStore } from './src/stores/appStore';
import { ActivationScreen } from './src/screens/ActivationScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { CashierScreen } from './src/screens/CashierScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { FaqScreen } from './src/screens/FaqScreen';
import { Navbar } from './src/components/Navbar';

export default function App() {
  const {
    isLicensed,
    isSetup,
    isLocked,
    isLoading,
    initializeAuth,
    lockApp,
  } = useAuthStore();

  const { currentScreen, loadProfile } = useAppStore();

  useEffect(() => {
    initializeAuth();
    loadProfile();

    // Auto-lock when app moves to background
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lockApp();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Memuat Kasirhan POS Offline...</Text>
      </View>
    );
  }

  // 1. Mandatory Offline License Activation
  if (!isLicensed) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ActivationScreen />
      </>
    );
  }

  // 2. Initial Onboarding for First Time Use
  if (!isSetup) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <OnboardingScreen />
      </>
    );
  }

  // 3. Security PIN Lock Screen
  if (isLocked) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <PinLockScreen />
      </>
    );
  }

  // 4. Main App Screens
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.screenContainer}>
        {currentScreen === 'cashier' && <CashierScreen />}
        {currentScreen === 'products' && <ProductsScreen />}
        {currentScreen === 'history' && <HistoryScreen />}
        {currentScreen === 'reports' && <ReportScreen />}
        {currentScreen === 'customers' && <CustomersScreen />}
        {currentScreen === 'settings' && <SettingsScreen />}
        {currentScreen === 'faq' && <FaqScreen />}
      </View>
      <Navbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
  },
});
