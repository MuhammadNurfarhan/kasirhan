import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatRupiah } from '../utils/format';

interface QuickCashButtonsProps {
  totalAmount: number;
  onSelectAmount: (amount: number) => void;
}

export const QuickCashButtons: React.FC<QuickCashButtonsProps> = ({
  totalAmount,
  onSelectAmount,
}) => {
  // Generate smart denominations based on totalAmount
  const denominations: number[] = [];

  const baseNotes = [10000, 20000, 50000, 100000];
  for (const note of baseNotes) {
    if (note >= totalAmount) {
      denominations.push(note);
    }
  }

  // Next higher 50.000 and 100.000
  const next50k = Math.ceil(totalAmount / 50000) * 50000;
  const next100k = Math.ceil(totalAmount / 100000) * 100000;

  if (next50k > totalAmount && !denominations.includes(next50k)) {
    denominations.push(next50k);
  }
  if (next100k > totalAmount && !denominations.includes(next100k)) {
    denominations.push(next100k);
  }

  // Always sort ascending
  denominations.sort((a, b) => a - b);
  const displayNotes = Array.from(new Set(denominations)).slice(0, 4);

  return (
    <View style={styles.container}>
      {/* Exact Amount Button */}
      <TouchableOpacity
        style={[styles.btn, styles.exactBtn]}
        onPress={() => onSelectAmount(totalAmount)}
        activeOpacity={0.7}
      >
        <Text style={styles.exactBtnText}>Uang Pas</Text>
        <Text style={styles.exactSubtext}>{formatRupiah(totalAmount)}</Text>
      </TouchableOpacity>

      {/* Suggested Banknotes */}
      {displayNotes.map((amt) => (
        <TouchableOpacity
          key={amt}
          style={styles.btn}
          onPress={() => onSelectAmount(amt)}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>{formatRupiah(amt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  btn: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  exactBtn: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  exactBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  exactSubtext: {
    fontSize: 10,
    color: '#2563EB',
    marginTop: 2,
  },
});
