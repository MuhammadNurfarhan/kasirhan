import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ReportSummary, getReportSummary, getTransactions } from '../repositories/transactionRepository';
import { getProducts } from '../repositories/productRepository';
import { formatRupiah } from '../utils/format';
import { exportTransactionsCsv, exportProductsCsv } from '../utils/csv';

export const ReportScreen: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [summary, setSummary] = useState<ReportSummary>({
    omzet: 0,
    totalHpp: 0,
    grossProfit: 0,
    transactionCount: 0,
    avgTransaction: 0,
    cashTotal: 0,
    qrisTotal: 0,
    debtTotal: 0,
    topProducts: [],
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let start = todayStr;
    const end = todayStr;

    if (period === 'week') {
      const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = `${prevWeek.getFullYear()}-${pad(prevWeek.getMonth() + 1)}-${pad(prevWeek.getDate())}`;
    } else if (period === 'month') {
      const prevMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-${pad(prevMonth.getDate())}`;
    }

    const data = await getReportSummary(start, end);
    setSummary(data);
  };

  const handleExportTransactions = async () => {
    setIsExporting(true);
    try {
      const txs = await getTransactions({ limit: 1000 });
      await exportTransactionsCsv(txs);
    } catch (e: any) {
      Alert.alert('Gagal Ekspor', e?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProducts = async () => {
    setIsExporting(true);
    try {
      const prods = await getProducts();
      await exportProductsCsv(prods);
    } catch (e: any) {
      Alert.alert('Gagal Ekspor', e?.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Laporan & Laba" subtitle="Ringkasan Kinerja Usaha" />

      {/* Period Filter Buttons */}
      <View style={styles.filterRow}>
        {(['today', 'week', 'month'] as const).map((p) => {
          const isActive = period === p;
          const labels = { today: 'Hari Ini', week: '7 Hari Terakhir', month: '30 Hari Terakhir' };
          return (
            <TouchableOpacity
              key={p}
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
                {labels[p]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Main KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.omzetCard]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Total Omzet</Text>
              <Ionicons name="trending-up" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.kpiValue}>{formatRupiah(summary.omzet)}</Text>
            <Text style={styles.kpiSub}>{summary.transactionCount} Transaksi</Text>
          </View>

          <View style={[styles.kpiCard, styles.profitCard]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Laba Kotor (Profit)</Text>
              <Ionicons name="cash" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.kpiValue}>{formatRupiah(summary.grossProfit)}</Text>
            <Text style={styles.kpiSub}>HPP: {formatRupiah(summary.totalHpp)}</Text>
          </View>
        </View>

        {/* Secondary Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Rata-Rata Transaksi</Text>
            <Text style={styles.metricVal}>{formatRupiah(summary.avgTransaction)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Margin Laba</Text>
            <Text style={styles.metricVal}>
              {summary.omzet > 0
                ? `${Math.round((summary.grossProfit / summary.omzet) * 100)}%`
                : '0%'}
            </Text>
          </View>
        </View>

        {/* Payment Methods Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rincian Metode Pembayaran</Text>
          <View style={styles.paymentBreakdown}>
            <View style={styles.payRow}>
              <View style={styles.payNameRow}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.payName}>Tunai (Cash)</Text>
              </View>
              <Text style={styles.payAmount}>{formatRupiah(summary.cashTotal)}</Text>
            </View>

            <View style={styles.payRow}>
              <View style={styles.payNameRow}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.payName}>QRIS</Text>
              </View>
              <Text style={styles.payAmount}>{formatRupiah(summary.qrisTotal)}</Text>
            </View>

            <View style={styles.payRow}>
              <View style={styles.payNameRow}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.payName}>Piutang / Kasbon</Text>
              </View>
              <Text style={styles.payAmount}>{formatRupiah(summary.debtTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Top Selling Products */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Produk Terlaris</Text>
          {summary.topProducts.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada data penjualan pada periode ini.</Text>
          ) : (
            summary.topProducts.map((p, idx) => (
              <View key={p.name} style={styles.topProductRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>
                <View style={styles.topProdInfo}>
                  <Text style={styles.topProdName}>{p.name}</Text>
                  <Text style={styles.topProdQty}>{p.totalQty} terjual</Text>
                </View>
                <Text style={styles.topProdAmount}>{formatRupiah(p.totalAmount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Export CSV Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ekspor Data (CSV)</Text>
          <Text style={styles.exportDesc}>
            Unduh data dalam format CSV untuk diolah di Excel, Google Sheets, atau aplikasi akuntansi.
          </Text>

          <View style={styles.exportButtonsRow}>
            <TouchableOpacity
              style={[styles.exportBtn, isExporting && styles.btnDisabled]}
              onPress={handleExportTransactions}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={18} color="#1E3A8A" />
              <Text style={styles.exportBtnText}>Ekspor Riwayat Transaksi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, isExporting && styles.btnDisabled]}
              onPress={handleExportProducts}
              disabled={isExporting}
            >
              <Ionicons name="cube-outline" size={18} color="#1E3A8A" />
              <Text style={styles.exportBtnText}>Ekspor Katalog & Stok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  omzetCard: {
    backgroundColor: '#1E3A8A',
  },
  profitCard: {
    backgroundColor: '#059669',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  kpiSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  paymentBreakdown: {
    gap: 8,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  payNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  payName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  payAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 12,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  topProdInfo: {
    flex: 1,
  },
  topProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  topProdQty: {
    fontSize: 11,
    color: '#64748B',
  },
  topProdAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  exportDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  exportButtonsRow: {
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
