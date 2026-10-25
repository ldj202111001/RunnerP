import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, radius, spacing, type } from '@/theme';

interface Props {
  id: string; // 설계서 화면 ID (S0–S6)
  title: string;
  items: string[]; // 들어갈 주요 요소
  apis: string[]; // 호출할 API
  icon?: ComponentProps<typeof Ionicons>['name'];
  children?: ReactNode; // 임시 이동 버튼 등
}

// 실제 화면을 구현하기 전까지 "준비 중" 안내와 들어갈 기능을 보여주는 자리표시 화면
// 설계서 화면 ID와 API는 개발 빌드에서만 보입니다.
export function ScreenPlaceholder({ id, title, items, apis, icon = 'construct-outline', children }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>곧 만나볼 수 있어요. 이런 기능이 준비되고 있습니다.</Text>
      </View>

      <Card style={styles.list}>
        {items.map((item, i) => (
          <View key={item} style={[styles.item, i > 0 && styles.itemDivider]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </Card>

      {children ? <View style={styles.actions}>{children}</View> : null}

      {__DEV__ ? (
        <View style={styles.dev}>
          <Text style={styles.devText}>
            {id} · {apis.length === 0 ? 'API 없음' : apis.join('  ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...type.h2, color: colors.text },
  subtitle: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  list: { paddingVertical: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemText: { ...type.body, color: colors.text, flex: 1 },
  actions: { marginTop: spacing.xxl, gap: spacing.md },
  dev: { marginTop: spacing.xxl, alignItems: 'center' },
  devText: { ...type.caption, color: colors.muted, fontFamily: 'monospace', textAlign: 'center' },
});
