import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { runsApi } from '@/api/endpoints';
import type { Run, Split } from '@/api/types';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { StatTile } from '@/components/StatTile';
import { colors, radius, spacing, type } from '@/theme';
import { formatDateTime, formatDuration, formatKm, formatPace } from '@/utils/format';

// S5 결과 입력 (S3 종료 후 자동 진입) → 저장하면 서버가 계획을 재조정
export default function RunResultScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runsApi
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

  const hasTerrain = run.max_grade_pct != null && run.min_grade_pct != null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.doneText}>러닝 완료</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(run.started_at)}</Text>
          </View>
          <View style={styles.heroMain}>
            <Text style={styles.heroDistance}>{formatKm(run.distance_m)}</Text>
            <Text style={styles.heroUnit}>km</Text>
          </View>
          <View style={styles.heroRow}>
            <HeroMetric label="시간" value={formatDuration(run.duration_sec * 1000)} />
            <HeroMetric label="평균 페이스" value={formatPace(run.avg_pace_sec_per_km)} />
          </View>
        </Card>

        <SectionTitle title="상세 지표" />
        <Card style={styles.grid}>
          <StatTile icon="trending-up" label="상승 고도" value={String(run.elevation_gain_m)} unit="m" tint={colors.success} />
          <StatTile
            icon="trending-down"
            label="하강 고도"
            value={run.elevation_loss_m != null ? String(run.elevation_loss_m) : '-'}
            unit={run.elevation_loss_m != null ? 'm' : undefined}
            tint={colors.info}
          />
          <StatTile icon="footsteps" label="걸음수" value={run.steps != null ? run.steps.toLocaleString() : '-'} />
          <StatTile
            icon="pulse"
            label="케이던스"
            value={run.cadence_spm != null ? String(run.cadence_spm) : '-'}
            unit={run.cadence_spm != null ? 'spm' : undefined}
            tint={colors.warning}
          />
        </Card>

        {hasTerrain ? (
          <>
            <SectionTitle title="코스 지형" />
            <Card style={styles.grid}>
              <StatTile
                icon="analytics"
                label="고도 범위"
                value={`${run.min_altitude_m}–${run.max_altitude_m}`}
                unit="m"
                tint={colors.info}
              />
              <StatTile
                icon="git-commit"
                label="최대 경사 (오르막 / 내리막)"
                value={`${formatGrade(run.max_grade_pct!)} / ${formatGrade(run.min_grade_pct!)}`}
                tint={colors.warning}
              />
              <StatTile
                icon="arrow-up"
                label="오르막 (3%+)"
                value={formatKm(run.uphill_distance_m ?? 0)}
                unit="km"
                tint={colors.success}
              />
              <StatTile
                icon="arrow-down"
                label="내리막 (3%+)"
                value={formatKm(run.downhill_distance_m ?? 0)}
                unit="km"
                tint={colors.info}
              />
            </Card>
          </>
        ) : null}

        {run.splits.length > 0 ? (
          <>
            <SectionTitle title="1km 구간" />
            <Card>
              <Splits splits={run.splits} />
            </Card>
          </>
        ) : null}

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

function formatGrade(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

// 구간별 페이스 막대: 가장 빠른 구간이 가장 길고 강조색입니다.
function Splits({ splits }: { splits: Split[] }) {
  const paces = splits.map((s) => s.pace_sec_per_km).filter((p) => p > 0);
  const fastest = paces.length ? Math.min(...paces) : 0;

  return (
    <View style={styles.splits}>
      <View style={styles.splitRow}>
        <Text style={[styles.splitHead, styles.splitKm]}>KM</Text>
        <Text style={[styles.splitHead, styles.splitPace]}>페이스</Text>
        <View style={styles.splitBarWrap} />
        <Text style={[styles.splitHead, styles.splitElev]}>고도</Text>
      </View>
      {splits.map((s) => {
        const ratio = fastest && s.pace_sec_per_km > 0 ? fastest / s.pace_sec_per_km : 0;
        const best = s.pace_sec_per_km === fastest;
        return (
          <View key={s.km_index} style={styles.splitRow}>
            <Text style={[styles.splitText, styles.splitKm]}>{s.km_index}</Text>
            <Text style={[styles.splitText, styles.splitPace, best && styles.splitBest]}>
              {formatPace(s.pace_sec_per_km)}
            </Text>
            <View style={styles.splitBarWrap}>
              <View
                style={[
                  styles.splitBar,
                  { width: `${Math.max(ratio * 100, 8)}%`, backgroundColor: best ? colors.primary : '#FFB8A6' },
                ]}
              />
            </View>
            <Text style={[styles.splitText, styles.splitElev]}>
              {s.elevation_delta_m >= 0 ? '+' : ''}
              {s.elevation_delta_m}m
            </Text>
          </View>
        );
      })}
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

  hero: { borderRadius: radius.xl, padding: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  doneText: { ...type.caption, fontWeight: '700', color: '#fff' },
  date: { ...type.caption, color: colors.muted },
  heroMain: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.lg },
  heroDistance: { ...type.display, color: colors.text },
  heroUnit: { ...type.h3, color: colors.muted },
  heroRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  heroMetric: { flex: 1 },
  heroMetricValue: { ...type.stat, color: colors.text },
  heroMetricLabel: { ...type.caption, color: colors.muted, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: spacing.sm },

  splits: { gap: spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  splitHead: { ...type.overline, color: colors.muted },
  splitText: { ...type.bodyStrong, color: colors.text, fontVariant: ['tabular-nums'] },
  splitKm: { width: 24 },
  splitPace: { width: 52 },
  splitBest: { color: colors.primary },
  splitBarWrap: { flex: 1 },
  splitBar: { height: 10, borderRadius: radius.pill },
  splitElev: { width: 48, textAlign: 'right', color: colors.textSecondary },

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
