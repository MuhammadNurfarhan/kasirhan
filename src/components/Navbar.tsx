import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, AppScreen } from '../stores/appStore';

interface NavItem {
  id: AppScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'cashier', label: 'Kasir', icon: 'cart' },
  { id: 'products', label: 'Produk', icon: 'cube' },
  { id: 'history', label: 'Riwayat', icon: 'receipt' },
  { id: 'reports', label: 'Laporan', icon: 'bar-chart' },
  { id: 'customers', label: 'Pelanggan', icon: 'people' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

export const Navbar: React.FC = () => {
  const { currentScreen, setScreen } = useAppStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(8, insets.bottom + 6) }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navButton}
            onPress={() => setScreen(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? item.icon : (`${item.icon}-outline` as any)}
              size={22}
              color={isActive ? '#1E3A8A' : '#64748B'}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
    paddingBottom: 8,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    color: '#64748B',
  },
  navLabelActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
});
