import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { runsDb } from '@/db';
import type { Run } from '@/db/types';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { RunSummary } from '@/components/RunSummary';
import { StatTile } from '@/components/StatTile';
import { colors, spacing, type } from '@/theme';

// S6 러닝 상세: 지난 러닝 하나의 경로·지표·구간, 그리고 삭제
export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    runsDb
      .get(Number(id))
      .then(setRun)
      .catch(() => setError('러닝 기록을 불러오지 못했습니다.'));
  }, [id]);

  const remove = async () => {
    setDeleting(true);
    try {
      await runsDb.remove(Number(id));
      router.back();
    } catch {
      setDeleting(false);
      Alert.alert('삭제하지 못했습니다', '잠시 후 다시 시도해 주세요.');
    }
  };

  const confirmRemove = () =>
    Alert.alert('기록 삭제', '이 러닝 기록을 삭제할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
        <Text style={styles.errorText}>{error}</Text>
        <Button variant="secondary" label="돌아가기" onPress={() => router.back()} />
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

  const hasFeedback = run.rpe != null || run.memo;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <RunSummary run={run} />

      {hasFeedback ? (
        <>
          <SectionTitle title="체감" />
          <Card>
            <View style={styles.grid}>
              <StatTile icon="speedometer" label="체감 강도 (RPE)" value={run.rpe != null ? `${run.rpe}/10` : '-'} />
              <StatTile icon="barbell" label="훈련 부하" value={run.load != null ? String(run.load) : '-'} />
            </View>
            {run.memo ? <Text style={styles.memo}>{run.memo}</Text> : null}
          </Card>
        </>
      ) : null}

      <Button
        variant="danger"
        icon="trash-outline"
        label="기록 삭제"
        loading={deleting}
        onPress={confirmRemove}
        style={styles.delete}
      />
    </ScrollView>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  memo: { ...type.body, color: colors.textSecondary, marginTop: spacing.md },
  delete: { marginTop: spacing.xxl },
});
