import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BusinessType, BusinessProfile } from '../types';
import { BUSINESS_TYPE_PRESETS, getDefaultCategoriesForType } from '../utils/defaults';
import { saveBusinessProfile } from '../repositories/profileRepository';
import { seedCategories } from '../repositories/categoryRepository';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';

export const OnboardingScreen: React.FC = () => {
  const { completeSetup } = useAuthStore();
  const { updateProfile } = useAppStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Business Type
  const [selectedType, setSelectedType] = useState<BusinessType>('kelontong');

  // Step 2: Profile info
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [isSaving, setIsSaving] = useState(false);

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleFinishOnboarding = async () => {
    if (!businessName.trim()) {
      Alert.alert('Peringatan', 'Silakan isi nama usaha Anda.');
      return;
    }

    try {
      setIsSaving(true);
      const preset = BUSINESS_TYPE_PRESETS.find((p) => p.id === selectedType);
      const profile: BusinessProfile = {
        name: businessName.trim(),
        business_type: selectedType,
        address: address.trim(),
        phone: phone.trim(),
        footer_note: 'Terima kasih atas kunjungan Anda!',
        paper_size: paperSize,
        tax_enabled: false,
        tax_percentage: 11,
        qris_payload: null,
        qris_image_uri: null,
        logo_image_uri: null,
        table_enabled: preset?.enableTable || false,
      };

      await saveBusinessProfile(profile);
      await updateProfile(profile);

      // Seed categories for selected business type
      const defaultCats = getDefaultCategoriesForType(selectedType);
      await seedCategories(defaultCats);

      // Mark setup completed without PIN
      await completeSetup();

      Alert.alert('Selamat!', 'Setup usaha berhasil. Siap mencatat transaksi pertama Anda.');
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal menyimpan data setup.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                step > s && styles.stepDotCompleted,
              ]}
            >
              <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        {/* STEP 1: PILIH JENIS USAHA */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Pilih Jenis Usaha Anda</Text>
            <Text style={styles.stepSubtitle}>
              Fitur kasir akan otomatis disesuaikan dengan kebutuhan bidang usaha Anda.
            </Text>

            <View style={styles.presetList}>
              {BUSINESS_TYPE_PRESETS.map((preset) => {
                const isSelected = selectedType === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                    onPress={() => setSelectedType(preset.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.presetIconBox, isSelected && styles.presetIconBoxSelected]}>
                      <Ionicons
                        name={preset.icon as any}
                        size={24}
                        color={isSelected ? '#FFFFFF' : '#1E3A8A'}
                      />
                    </View>
                    <View style={styles.presetInfo}>
                      <Text style={[styles.presetTitle, isSelected && styles.presetTitleSelected]}>
                        {preset.title}
                      </Text>
                      <Text style={styles.presetDesc}>{preset.description}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#1E3A8A" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep1}>
              <Text style={styles.primaryBtnText}>Lanjutkan</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: PROFIL USAHA */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Profil Toko & Usaha</Text>
            <Text style={styles.stepSubtitle}>
              Informasi ini akan dicetak pada kepala struk pelanggan Anda.
            </Text>

            <Text style={styles.label}>Nama Usaha / Toko *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Toko Berkah Jaya"
              placeholderTextColor="#94A3B8"
              value={businessName}
              onChangeText={setBusinessName}
            />

            <Text style={styles.label}>Alamat Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Jl. Ahmad Yani No. 45"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Nomor Telepon / WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Ukuran Kertas Printer Thermal</Text>
            <View style={styles.toggleRow}>
              {(['58mm', '80mm'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.toggleBtn, paperSize === size && styles.toggleBtnActive]}
                  onPress={() => setPaperSize(size)}
                >
                  <Text style={[styles.toggleText, paperSize === size && styles.toggleTextActive]}>
                    {size} {size === '58mm' ? '(Standar Kecil)' : '(Lebar)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
                onPress={handleFinishOnboarding}
                disabled={isSaving}
              >
                <Text style={styles.primaryBtnText}>
                  {isSaving ? 'Menyimpan...' : 'Mulai Gunakan Kasirhan'}
                </Text>
                <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#1E3A8A',
  },
  stepDotCompleted: {
    backgroundColor: '#059669',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  presetList: {
    gap: 10,
    marginBottom: 20,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  presetCardSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  presetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetIconBoxSelected: {
    backgroundColor: '#1E3A8A',
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  presetTitleSelected: {
    color: '#1E3A8A',
  },
  presetDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  toggleBtnActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#DBEAFE',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  codeBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 14,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  copyCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  confirmCheckboxText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
});
