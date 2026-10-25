import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { runsApi } from '@/api/endpoints';
import type { RunCreateRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { RoundButton } from '@/components/RoundButton';
import { RunMap } from '@/components/RunMap';
import { useRunTracker } from '@/sensors/useRunTracker';
import { runBuffer } from '@/storage/runBuffer';
import { colors, radius, shadow, spacing, type } from '@/theme';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

const MIN_DISTANCE_M = 100;
// 손잡이를 이만큼 이상 끌면 패널을 여닫습니다.
const SWIPE_THRESHOLD = 20;

function gpsLabel(accuracy: number | null): { text: string; color: string } {
  if (accuracy == null) return { text: 'GPS 찾는 중', color: colors.muted };
  if (accuracy <= 10) return { text: `GPS 좋음 ±${Math.round(accuracy)}m`, color: colors.success };
  if (accuracy <= 25) return { text: `GPS 보통 ±${Math.round(accuracy)}m`, color: colors.warning };
  return { text: `GPS 약함 ±${Math.round(accuracy)}m`, color: colors.danger };
}

// S3 러닝 측정 · 앱 시작 시 첫 화면(홈) (측정 중에는 API 호출 없음, 종료 시 POST /runs)
export default function RunTrackingScreen() {
  const { view, start, pause, resume, finish, discard, restore } = useRunTracker();
  const [pending, setPending] = useState<RunCreateRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [follow, setFollow] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // 손잡이(─)를 탭하면 토글, 위로 끌면 열고 아래로 끌면 닫습니다.
  const handlePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, { dy }) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          if (dy > SWIPE_THRESHOLD) setPanelOpen(false);
          else if (dy < -SWIPE_THRESHOLD) setPanelOpen(true);
          else setPanelOpen((open) => !open);
        },
      }),
    [],
  );

  // 이전에 측정 중 꺼졌거나 전송에 실패한 기록이 있으면 불러옵니다.
  useEffect(() => {
    (async () => {
      if (await restore()) {
        Alert.alert('이전 측정 복구', '끝나지 않은 러닝을 불러왔습니다. 이어서 달리거나 종료할 수 있습니다.');
      }
      setPending(await runBuffer.loadPending());
    })();
  }, [restore]);

  const upload = async (summary: RunCreateRequest) => {
    setUploading(true);
    try {
      const saved = await runsApi.create(summary);
      await runBuffer.clearPending();
      setPending(null);
      router.push({ pathname: '/run-result', params: { runId: String(saved.id) } });
    } catch {
      setPending(summary);
      Alert.alert('저장 실패', '서버에 저장하지 못했습니다. 기록은 휴대폰에 보관되어 있으니 "다시 보내기"를 눌러 주세요.');
    } finally {
      setUploading(false);
    }
  };

  const onFinish = () => {
    const tooShort = view.distanceM < MIN_DISTANCE_M;
    Alert.alert(
      '러닝 종료',
      tooShort ? `거리가 ${MIN_DISTANCE_M}m 미만입니다. 기록을 버릴까요?` : '러닝을 끝내고 저장할까요?',
      [
        { text: '계속 달리기', style: 'cancel' },
        tooShort
          ? { text: '버리기', style: 'destructive', onPress: () => void discard() }
          : {
              text: '종료',
              onPress: async () => {
                const summary = await finish();
                if (summary) await upload(summary);
              },
            },
      ],
    );
  };

  const gps = gpsLabel(view.gpsAccuracy);
  // 측정 정보(거리·시간·페이스·걸음수)는 시작 버튼을 누른 뒤부터 보여 줍니다.
  const showMetrics = view.status !== 'idle';

  return (
    <View style={styles.container}>
      <RunMap route={view.route} position={view.position} follow={follow} onUserPan={() => setFollow(false)} />

      <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.topLeft} pointerEvents="box-none">
          {view.status === 'idle' ? (
            <Pressable
              style={styles.fab}
              onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' })}
              accessibilityLabel="메뉴 열기"
            >
              <Ionicons name="menu" size={22} color={colors.text} />
            </Pressable>
          ) : null}
          {showMetrics ? (
            <View style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: gps.color }]} />
              <Text style={styles.chipText}>{gps.text}</Text>
            </View>
          ) : null}
        </View>
        {!follow ? (
          <Pressable style={styles.fab} onPress={() => setFollow(true)} accessibilityLabel="내 위치로 이동">
            <Ionicons name="locate" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* 안드로이드 내비게이션 바(홈·뒤로가기)에 가리지 않도록 아래 여백에 시스템 영역만큼 더합니다. */}
      <View style={[styles.panel, { paddingBottom: spacing.xl + insets.bottom }, !showMetrics && styles.panelIdle]}>
        {!showMetrics ? (
          <View style={styles.idleHeader}>
            <Text style={styles.idleTitle}>달릴 준비 되셨나요?</Text>
            <Text style={styles.idleSub}>시작을 누르면 거리·페이스를 기록합니다.</Text>
          </View>
        ) : (
          <View
            style={styles.handleArea}
            {...handlePan.panHandlers}
            accessibilityRole="button"
            accessibilityLabel={panelOpen ? '측정 정보 접기' : '측정 정보 펼치기'}
          >
            <View style={styles.handle} />
          </View>
        )}

        {!showMetrics ? null : panelOpen ? (
          <>
            {view.status === 'paused' ? (
              <View style={styles.pausedBadge}>
                <Ionicons name="pause" size={12} color={colors.warning} />
                <Text style={styles.pausedText}>일시정지됨</Text>
              </View>
            ) : null}
            <View style={styles.main}>
              <Text style={styles.distance}>{formatKm(view.distanceM)}</Text>
              <Text style={styles.unit}>km</Text>
            </View>

            <View style={styles.row}>
              <Metric label="시간" value={formatDuration(view.elapsedMs)} />
              <View style={styles.divider} />
              <Metric label="평균 페이스" value={formatPace(view.avgPace)} />
              <View style={styles.divider} />
              <Metric label="현재 페이스" value={formatPace(view.currentPace)} />
            </View>
            <Text style={styles.steps}>
              <Ionicons name="footsteps" size={13} color={colors.onInkMuted} /> {view.steps.toLocaleString()} 걸음
            </Text>
          </>
        ) : (
          <Text style={styles.compact}>
            {formatKm(view.distanceM)} km · {formatDuration(view.elapsedMs)}
            {view.status === 'paused' ? ' · 일시정지' : ''}
          </Text>
        )}

        {view.error ? <Text style={styles.error}>{view.error}</Text> : null}

        <View style={styles.controls}>
          {view.status === 'idle' ? (
            <RoundButton
              icon="play"
              label="시작"
              size={88}
              onPress={() => {
                setFollow(true);
                void start();
              }}
            />
          ) : view.status === 'starting' ? (
            <RoundButton icon="play" label="GPS 준비 중" size={88} loading onPress={() => {}} />
          ) : view.status === 'running' ? (
            <RoundButton icon="pause" label="일시정지" bg={colors.onInk} fg={colors.ink} onPress={() => void pause()} />
          ) : (
            <>
              <RoundButton icon="stop" label="종료" size={64} bg={colors.inkSoft} fg={colors.danger} onPress={onFinish} />
              <RoundButton icon="play" label="재개" onPress={() => void resume()} />
            </>
          )}
        </View>

        {view.status === 'idle' && pending ? (
          <Button
            variant="onInk"
            icon="cloud-upload-outline"
            style={styles.retry}
            label={`저장 안 된 기록 다시 보내기 (${formatKm(pending.distance_m)} km)`}
            onPress={() => void upload(pending)}
            loading={uploading}
          />
        ) : null}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.border },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fab: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 34,
    ...shadow.float,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...type.caption, fontWeight: '700', color: colors.text },
  // 지도 위에 겹치는 어두운 하단 패널 (반투명 배경에 elevation을 주면 안드로이드에서 그림자가 비쳐 보여 테두리로 대신합니다)
  panel: {
    marginTop: 'auto',
    backgroundColor: 'rgba(18, 20, 26, 0.94)',
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.inkBorder,
    paddingHorizontal: spacing.xl,
  },
  panelIdle: { paddingTop: spacing.xxl },
  idleHeader: { alignItems: 'center', marginBottom: spacing.xl },
  idleTitle: { ...type.h2, color: colors.onInk },
  idleSub: { ...type.body, color: colors.onInkMuted, marginTop: spacing.xs },
  handleArea: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  compact: {
    ...type.h3,
    textAlign: 'center',
    fontSize: 20,
    color: colors.onInk,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.lg,
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pausedText: { ...type.overline, color: colors.warning },
  main: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  distance: { ...type.display, fontSize: 72, color: colors.onInk },
  unit: { ...type.h3, color: colors.onInkMuted },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { ...type.stat, color: colors.onInk },
  metricLabel: { ...type.caption, color: colors.onInkMuted, marginTop: 2 },
  steps: { ...type.caption, color: colors.onInkMuted, textAlign: 'center', marginTop: spacing.lg },
  error: { ...type.caption, color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.xxxl,
    marginTop: spacing.xl,
  },
  retry: { marginTop: spacing.xl },
});
