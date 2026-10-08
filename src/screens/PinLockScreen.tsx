import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';

export const PinLockScreen: React.FC = () => {
  const { unlockApp, resetPin } = useAuthStore();
  const { profile } = useAppStore();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 6) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length >= 4) {
      const success = await unlockApp(nextPin);
      if (success) {
        setPin('');
      } else if (nextPin.length === 6) {
        setErrorMsg('PIN salah. Silakan coba lagi.');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleReset = async () => {
    if (!recoveryCode.trim() || newPin.length < 4) {
      Alert.alert('Peringatan', 'Masukkan kode pemulihan 12 karakter dan PIN baru (min 4 digit).');
      return;
    }
    const success = await resetPin(recoveryCode.trim(), newPin.trim());
    if (success) {
      Alert.alert('Sukses', 'PIN berhasil direset dan aplikasi dibuka.');
    } else {
      Alert.alert('Gagal', 'Kode pemulihan salah. Silakan periksa kembali.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#1E3A8A" />
          </View>
          <Text style={styles.appName}>{profile.name || 'Kasirhan POS'}</Text>
          <Text style={styles.title}>
            {isRecovering ? 'Reset PIN dengan Kode Pemulihan' : 'Aplikasi Terkunci'}
          </Text>
          <Text style={styles.subtitle}>
            {isRecovering
              ? 'Ketik 12 karakter kode pemulihan Anda'
              : 'Masukkan PIN untuk mengakses kasir'}
          </Text>
        </View>

        {!isRecovering ? (
          <View style={styles.lockContent}>
            {/* Dots */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <View
                  key={idx}
                  style={[styles.dot, pin.length > idx && styles.dotFilled]}
                />
              ))}
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* Keypad */}
            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.key}
                  onPress={() => handleKeyPress(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.key, styles.keyAction]}
                onPress={() => setPin('')}
                activeOpacity={0.6}
              >
                <Text style={styles.actionText}>C</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.key}
                onPress={() => handleKeyPress('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.key, styles.keyAction]}
                onPress={handleDelete}
                activeOpacity={0.6}
              >
                <Ionicons name="backspace-outline" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.recoveryBtn}
              onPress={() => setIsRecovering(true)}
            >
              <Text style={styles.recoveryBtnText}>Lupa PIN? Gunakan Kode Pemulihan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recoveryCard}>
            <Text style={styles.label}>Kode Pemulihan (12 Karakter):</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: ABCD-EFGH-JKLM"
              placeholderTextColor="#94A3B8"
              value={recoveryCode}
              onChangeText={setRecoveryCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>PIN Baru (4-6 Angka):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ketik PIN Baru"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={newPin}
              onChangeText={setNewPin}
            />

            <View style={styles.recoveryActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsRecovering(false)}
              >
                <Text style={styles.cancelBtnText}>Kembali ke PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>Buka & Simpan PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  lockContent: {
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    width: 270,
    marginTop: 10,
  },
  key: {
    width: 74,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  keyAction: {
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
  },
  recoveryBtn: {
    marginTop: 24,
    padding: 8,
  },
  recoveryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  recoveryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  recoveryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  resetBtn: {
    flex: 1.5,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
