import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface Props {
  id: string; // 설계서 화면 ID (S0–S6)
  title: string;
  items: string[]; // 들어갈 주요 요소
  apis: string[]; // 호출할 API
  children?: ReactNode; // 임시 이동 버튼 등
}

// 실제 화면을 구현하기 전까지 설계서 내용을 그대로 보여주는 자리표시 화면
export function ScreenPlaceholder({ id, title, items, apis, children }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.id}>{id}</Text>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.section}>주요 요소</Text>
      {items.map((item) => (
        <Text key={item} style={styles.item}>• {item}</Text>
      ))}

      <Text style={styles.section}>API</Text>
      {apis.length === 0 ? (
        <Text style={styles.item}>없음</Text>
      ) : (
        apis.map((api) => (
          <Text key={api} style={styles.api}>{api}</Text>
        ))
      )}

      {children ? <View style={styles.actions}>{children}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 6 },
  id: { color: colors.primary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  section: { marginTop: 12, fontWeight: '600', color: colors.text },
  item: { color: colors.muted },
  api: { color: colors.muted, fontFamily: 'monospace' },
  actions: { marginTop: 24, gap: 10 },
});
