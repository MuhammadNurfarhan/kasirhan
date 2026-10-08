import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBarcodePress?: () => void;
  onHoldPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBarcodePress,
  onHoldPress,
}) => {
  const { profile } = useAppStore();
  const { lockApp } = useAuthStore();
  const { items } = useCartStore();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.brand}>{profile.name || 'Kasirhan'}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {onBarcodePress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onBarcodePress} activeOpacity={0.7}>
            <Ionicons name="barcode-outline" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        )}

        {onHoldPress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onHoldPress} activeOpacity={0.7}>
            <Ionicons name="pause-circle-outline" size={24} color="#1E3A8A" />
            {items.length > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.iconBtn, styles.lockBtn]}
          onPress={lockApp}
          activeOpacity={0.7}
        >
          <Ionicons name="lock-closed" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  left: {
    flex: 1,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBtn: {
    backgroundColor: '#FEE2E2',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
