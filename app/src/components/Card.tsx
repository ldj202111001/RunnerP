import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing, type } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 흰 배경 + 둥근 모서리 + 옅은 그림자의 기본 카드
export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// 카드 묶음 위에 붙는 작은 제목 (예: "1KM 구간")
export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.h3, color: colors.text },
});
