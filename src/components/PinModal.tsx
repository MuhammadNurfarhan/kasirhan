import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyUserPin, resetPinWithRecoveryCode } from '../repositories/profileRepository';

interface PinModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
  allowRecovery?: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  visible,
  title = 'Masukkan PIN',
  subtitle = 'Masukkan PIN keamanan untuk melanjutkan',
  onSuccess,
  onCancel,
  allowRecovery = true,
}) => {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 6) return;
    const nextPin = pin + num;
    setPin(nextPin);
    setErrorMsg('');

    // Automatically check when 4 or 6 digits entered
    if (nextPin.length >= 4) {
      const isValid = await verifyUserPin(nextPin);
      if (isValid) {
        setPin('');
        setErrorMsg('');
        onSuccess();
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

  const handleResetWithRecovery = async () => {
    if (!recoveryCode.trim() || newPin.length < 4) {
      Alert.alert('Peringatan', 'Masukkan kode pemulihan 12 karakter dan PIN baru (min 4 digit).');
      return;
    }
    const success = await resetPinWithRecoveryCode(recoveryCode.trim(), newPin.trim());
    if (success) {
      Alert.alert('Sukses', 'PIN berhasil diubah!');
      setIsRecovering(false);
      setRecoveryCode('');
      setNewPin('');
      onSuccess();
    } else {
      Alert.alert('Gagal', 'Kode pemulihan tidak cocok. Periksa kembali catatan Anda.');
    }
  };

  const handleClose = () => {
    setPin('');
    setErrorMsg('');
    setIsRecovering(false);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(20, insets.top + 8),
            paddingBottom: Math.max(20, insets.bottom + 8),
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{isRecovering ? 'Pemulihan PIN' : title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {isRecovering
              ? 'Masukkan kode pemulihan 12 karakter yang disimpan saat setup'
              : subtitle}
          </Text>

          {!isRecovering ? (
            <>
              {/* PIN Dots */}
              <View style={styles.dotsContainer}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      pin.length > idx && styles.dotFilled,
                    ]}
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

              {allowRecovery && (
                <TouchableOpacity
                  style={styles.recoveryLink}
                  onPress={() => setIsRecovering(true)}
                >
                  <Text style={styles.recoveryText}>Lupa PIN? Gunakan Kode Pemulihan</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.recoveryForm}>
              <Text style={styles.inputLabel}>Kode Pemulihan (12 Karakter):</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: ABCD-EFGH-JKLM"
                placeholderTextColor="#94A3B8"
                value={recoveryCode}
                onChangeText={setRecoveryCode}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>PIN Baru (4-6 digit):</Text>
              <TextInput
                style={styles.input}
                placeholder="PIN Baru"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                value={newPin}
                onChangeText={setNewPin}
              />

              <View style={styles.recoveryButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => setIsRecovering(false)}
                >
                  <Text style={styles.btnOutlineText}>Kembali</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleResetWithRecovery}
                >
                  <Text style={styles.btnPrimaryText}>Reset PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    marginBottom: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    width: 260,
  },
  key: {
    width: 72,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
  },
  keyAction: {
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  recoveryLink: {
    marginTop: 18,
    padding: 6,
  },
  recoveryText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  recoveryForm: {
    width: '100%',
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
  },
  recoveryButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnOutlineText: {
    color: '#475569',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#1E3A8A',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
