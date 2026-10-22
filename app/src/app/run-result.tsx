import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { runsApi } from '@/api/endpoints';
import type { Run } from '@/api/types';
import { Button } from '@/components/Button';
import { colors } from '@/theme';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

// S5 결과 입력 (S3 종료 후 자동 진입) → 저장하면 서버가 계획을 재조정
export default function RunResultScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runsApi
      .get(Number(runId))
      .then(setRun)
      .catch(() => setError('러닝 기록을 불러오지 못했습니다.'));
  }, [runId]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!run) return <ActivityIndicator style={styles.loading} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>측정 요약</Text>
      <View style={styles.grid}>
        <Item label="거리" value={`${formatKm(run.distance_m)} km`} />
        <Item label="시간" value={formatDuration(run.duration_sec * 1000)} />
        <Item label="평균 페이스" value={formatPace(run.avg_pace_sec_per_km)} />
        <Item label="상승 고도" value={`${run.elevation_gain_m} m`} />
        <Item label="하강 고도" value={run.elevation_loss_m != null ? `${run.elevation_loss_m} m` : '-'} />
        <Item label="걸음수" value={run.steps != null ? String(run.steps) : '-'} />
        <Item label="케이던스" value={run.cadence_spm != null ? `${run.cadence_spm} spm` : '-'} />
      </View>

      {run.max_grade_pct != null && run.min_grade_pct != null ? (
        <>
          <Text style={styles.section}>코스 지형</Text>
          <View style={styles.grid}>
            <Item label="고도 범위" value={`${run.min_altitude_m}–${run.max_altitude_m} m`} />
            <Item label="최대 경사" value={`${formatGrade(run.max_grade_pct)} / ${formatGrade(run.min_grade_pct)}`} />
            <Item label="오르막 (3%+)" value={`${formatKm(run.uphill_distance_m ?? 0)} km`} />
            <Item label="내리막 (3%+)" value={`${formatKm(run.downhill_distance_m ?? 0)} km`} />
          </View>
        </>
      ) : null}

      {run.splits.length > 0 ? (
        <>
          <Text style={styles.section}>1km 구간</Text>
          {run.splits.map((s) => (
            <Text key={s.km_index} style={styles.split}>
              {s.km_index} km   {formatPace(s.pace_sec_per_km)}   {s.elevation_delta_m >= 0 ? '+' : ''}
              {s.elevation_delta_m} m
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>결과 입력 (다음 단계에서 구현)</Text>
      <Text style={styles.todo}>RPE 1–10 슬라이더 · 완주 여부 · 메모 → PATCH /runs/{'{id}'}/feedback</Text>

      <View style={styles.actions}>
        <Button label="[임시] 홈으로" onPress={() => router.dismissTo('/')} />
      </View>
    </ScrollView>
  );
}

function formatGrade(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemValue}>{value}</Text>
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  loading: { marginTop: 40 },
  error: { margin: 20, color: colors.danger },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  item: { width: '50%' },
  itemValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  itemLabel: { color: colors.muted },
  section: { marginTop: 24, marginBottom: 8, fontWeight: '600', color: colors.text },
  split: { color: colors.text, fontVariant: ['tabular-nums'], marginBottom: 4 },
  todo: { color: colors.muted },
  actions: { marginTop: 32 },
});
