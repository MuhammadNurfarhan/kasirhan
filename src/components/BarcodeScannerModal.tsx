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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BarcodeScannerModalProps {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onScan,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const insets = useSafeAreaInsets();

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);
    onScan(data.trim());
    setTimeout(() => {
      setScanned(false);
      onClose();
    }, 500);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Control Bar */}
        <View style={[styles.header, { paddingTop: Math.max(20, insets.top + 8) }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pindai Barcode Produk</Text>
          <TouchableOpacity
            onPress={() => setTorch((prev) => !prev)}
            style={styles.headerBtn}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={24}
              color={torch ? '#FACC15' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        {permission?.granted ? (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.overlay}>
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
                <View style={styles.laserLine} />
              </View>
              <Text style={styles.instructionText}>
                Arahkan kamera ke barcode produk
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noPermissionBox}>
            <Ionicons name="camera-outline" size={54} color="#94A3B8" />
            <Text style={styles.noPermissionText}>
              Izin kamera diperlukan untuk memindai barcode.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Izinkan Kamera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Barcode Input Fallback */}
        <View style={[styles.manualInputContainer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <Text style={styles.manualLabel}>Atau ketik barcode manual:</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nomor barcode..."
              placeholderTextColor="#94A3B8"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="numeric"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 260,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#3B82F6',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#EF4444',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  noPermissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noPermissionText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 14,
    fontSize: 14,
  },
  permissionBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  manualInputContainer: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  manualLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#475569',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    width: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
