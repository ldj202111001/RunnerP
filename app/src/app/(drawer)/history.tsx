import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { runsApi } from '@/api/endpoints';
import type { Run, RunTotals } from '@/api/types';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { colors, radius, spacing, type } from '@/theme';
import { formatDateTime, formatDuration, formatKm, formatPace } from '@/utils/format';

// S6 기록: 이번 달 합계 + 러닝 목록(최신순, 20개씩 이어 불러오기) → 누르면 러닝 상세
export default function HistoryScreen() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [month, setMonth] = useState<RunTotals | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // 새로 불러오는 중에 이전 요청의 응답이 늦게 오면 버립니다.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const req = ++requestId.current;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    try {
      const [first, totals] = await Promise.all([
        runsApi.list({ page: 1 }),
        runsApi.summary({ from: monthStart.toISOString() }),
      ]);
      if (req !== requestId.current) return;
      setRuns(first.items);
      setTotal(first.total);
      setPage(1);
      setMonth(totals);
      setStatus('ready');
    } catch {
      if (req === requestId.current) setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  // 화면에 돌아올 때마다 새로 불러옵니다 (새 러닝 저장·상세에서 삭제 반영).
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || status !== 'ready' || runs.length >= total) return;
    const req = requestId.current;
    setLoadingMore(true);
    try {
      const next = await runsApi.list({ page: page + 1 });
      if (req !== requestId.current) return;
      // 그사이 새 기록이 생겨 한 칸씩 밀렸을 수 있으니 이미 있는 id는 뺍니다.
      setRuns((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...next.items.filter((r) => !seen.has(r.id))];
      });
      setTotal(next.total);
      setPage(next.page);
    } catch {
      // 다음에 끝까지 스크롤하면 다시 시도합니다.
    } finally {
      setLoadingMore(false);
    }
  };

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
        <Text style={styles.centerText}>기록을 불러오지 못했습니다.</Text>
        <Button
          variant="secondary"
          label="다시 시도"
          onPress={() => {
            setStatus('loading');
            void reload();
          }}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.container}
      data={runs}
      keyExtractor={(r) => String(r.id)}
      renderItem={({ item }) => <RunRow run={item} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListHeaderComponent={
        <>
          {month ? <MonthCard totals={month} /> : null}
          <SectionTitle title="전체 기록" right={<Text style={styles.count}>{total}개</Text>} />
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="walk-outline" size={36} color={colors.muted} />
          <Text style={styles.centerText}>아직 러닝 기록이 없어요.</Text>
          <Text style={styles.emptySub}>러닝을 마치면 여기에 쌓입니다.</Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.more} color={colors.primary} /> : undefined}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[colors.primary]} />}
    />
  );
}

function MonthCard({ totals }: { totals: RunTotals }) {
  return (
    <Card style={styles.month}>
      <Text style={styles.monthLabel}>{new Date().getMonth() + 1}월 러닝</Text>
      <View style={styles.monthMain}>
        <Text style={styles.monthDistance}>{formatKm(totals.distance_m)}</Text>
        <Text style={styles.monthUnit}>km</Text>
      </View>
      <View style={styles.monthRow}>
        <MonthMetric label="횟수" value={`${totals.count}회`} />
        <MonthMetric label="시간" value={formatDuration(totals.duration_sec * 1000)} />
        <MonthMetric
          label="평균 페이스"
          value={totals.distance_m > 0 ? formatPace(totals.duration_sec / (totals.distance_m / 1000)) : `--'--"`}
        />
      </View>
    </Card>
  );
}

function MonthMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.monthMetricValue}>{value}</Text>
      <Text style={styles.monthMetricLabel}>{label}</Text>
    </View>
  );
}

function RunRow({ run }: { run: Run }) {
  return (
    <Pressable onPress={() => router.push(`/runs/${run.id}`)}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.rowPressed]}>
          <View style={styles.rowIcon}>
            <Ionicons name="footsteps" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowDate}>{formatDateTime(run.started_at)}</Text>
            <View style={styles.rowMain}>
              <Text style={styles.rowDistance}>{formatKm(run.distance_m)}</Text>
              <Text style={styles.rowUnit}>km</Text>
            </View>
          </View>
          <View style={styles.rowSide}>
            <Text style={styles.rowStat}>{formatDuration(run.duration_sec * 1000)}</Text>
            <Text style={styles.rowStatSub}>{formatPace(run.avg_pace_sec_per_km)} /km</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  centerText: { ...type.body, color: colors.textSecondary },
  count: { ...type.caption, color: colors.muted },

  month: { borderRadius: radius.xl, padding: spacing.xl },
  monthLabel: { ...type.caption, color: colors.muted },
  monthMain: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm },
  monthDistance: { ...type.h1, fontSize: 40, color: colors.text, fontVariant: ['tabular-nums'] },
  monthUnit: { ...type.h3, color: colors.muted },
  monthRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  monthMetricValue: { ...type.h3, color: colors.text, fontVariant: ['tabular-nums'] },
  monthMetricLabel: { ...type.caption, color: colors.muted, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDate: { ...type.caption, color: colors.muted },
  rowMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  rowDistance: { ...type.stat, color: colors.text },
  rowUnit: { ...type.caption, color: colors.muted },
  rowSide: { alignItems: 'flex-end' },
  rowStat: { ...type.bodyStrong, color: colors.text, fontVariant: ['tabular-nums'] },
  rowStatSub: { ...type.caption, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptySub: { ...type.caption, color: colors.muted },
  more: { marginTop: spacing.lg },
});
