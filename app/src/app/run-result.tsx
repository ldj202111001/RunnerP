import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { runsDb } from '@/db';
import type { Run } from '@/db/types';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { RunSummary } from '@/components/RunSummary';
import { colors, spacing, type } from '@/theme';

// S5 결과 입력 (S3 종료 후 자동 진입) → 저장하면 앱 안에서 계획을 재조정 (planner 구현 후)
export default function RunResultScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runsDb
      .get(Number(runId))
      .then(setRun)
      .catch(() => setError('러닝 기록을 불러오지 못했습니다.'));
  }, [runId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
        <Text style={styles.errorText}>{error}</Text>
        <Button variant="secondary" label="홈으로" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }
  if (!run) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <RunSummary run={run} badge="러닝 완료" />

        <SectionTitle title="오늘 러닝은 어땠나요?" />
        <Card style={styles.feedback}>
          <Ionicons name="happy-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.feedbackTitle}>체감 강도·완주 여부 입력</Text>
            <Text style={styles.feedbackSub}>곧 추가됩니다. 입력하면 다음 훈련 계획에 반영돼요.</Text>
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="완료" icon="checkmark" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  errorText: { ...type.body, color: colors.textSecondary },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  feedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedbackTitle: { ...type.bodyStrong, color: colors.text },
  feedbackSub: { ...type.caption, color: colors.muted, marginTop: 2 },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
