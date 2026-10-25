import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  unit?: string;
  tint?: string; // 아이콘 색
}

// 아이콘 + 값 + 단위 + 이름으로 된 작은 지표 칸 (카드 안 2열 격자에 씁니다)
export function StatTile({ icon, label, value, unit, tint = colors.primary }: Props) {
  return (
    <View style={styles.tile}>
      <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: '50%', paddingVertical: spacing.md, paddingRight: spacing.sm },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value: { ...type.stat, color: colors.text },
  unit: { ...type.caption, color: colors.muted },
  label: { ...type.caption, color: colors.muted, marginTop: 2 },
});
