import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Run, Split } from '@/db/types';
import { Card, SectionTitle } from '@/components/Card';
import { RouteMap } from '@/components/RouteMap';
import { StatTile } from '@/components/StatTile';
import { decodePolyline } from '@/sensors/summary';
import { colors, radius, spacing, type } from '@/theme';
import { formatDateTime, formatDuration, formatKm, formatPace } from '@/utils/format';

interface Props {
  run: Run;
  badge?: string; // 요약 카드 왼쪽 위 표시 (예: "러닝 완료")
}

// 러닝 1건의 요약·경로·상세 지표·코스 지형·1km 구간 (결과 화면과 러닝 상세가 함께 씀)
export function RunSummary({ run, badge }: Props) {
  const route = useMemo(() => decodePolyline(run.route_polyline), [run.route_polyline]);
  const hasTerrain = run.max_grade_pct != null && run.min_grade_pct != null;

  return (
    <>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          {badge ? (
            <View style={styles.badge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
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

      {route.length > 0 ? (
        <>
          <SectionTitle title="경로" />
          <View style={styles.map}>
            <RouteMap points={route} />
          </View>
        </>
      ) : null}

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
    </>
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
  hero: { borderRadius: radius.xl, padding: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { ...type.caption, fontWeight: '700', color: '#fff' },
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

  map: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },

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
});
