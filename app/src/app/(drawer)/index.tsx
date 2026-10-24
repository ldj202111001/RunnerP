import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { runsApi } from '@/api/endpoints';
import type { RunCreateRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { RunMap } from '@/components/RunMap';
import { useRunTracker } from '@/sensors/useRunTracker';
import { runBuffer } from '@/storage/runBuffer';
import { colors } from '@/theme';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

const MIN_DISTANCE_M = 100;
// 손잡이를 이만큼 이상 끌면 패널을 여닫습니다.
const SWIPE_THRESHOLD = 20;

function gpsLabel(accuracy: number | null): { text: string; color: string } {
  if (accuracy == null) return { text: 'GPS 찾는 중', color: colors.muted };
  if (accuracy <= 10) return { text: `GPS 좋음 (±${Math.round(accuracy)}m)`, color: '#16A34A' };
  if (accuracy <= 25) return { text: `GPS 보통 (±${Math.round(accuracy)}m)`, color: '#CA8A04' };
  return { text: `GPS 약함 (±${Math.round(accuracy)}m)`, color: colors.danger };
}

// S3 러닝 측정 · 앱 시작 시 첫 화면(홈) (측정 중에는 API 호출 없음, 종료 시 POST /runs)
export default function RunTrackingScreen() {
  const { view, start, pause, resume, finish, discard, restore } = useRunTracker();
  const [pending, setPending] = useState<RunCreateRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [follow, setFollow] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

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
  const active = view.status === 'running' || view.status === 'paused';

  return (
    <View style={styles.container}>
      <RunMap route={view.route} position={view.position} follow={follow} onUserPan={() => setFollow(false)} />

      <View style={styles.topBar} pointerEvents="box-none">
        {active ? (
          <View style={styles.chip}>
            <Text style={[styles.gps, { color: gps.color }]}>{gps.text}</Text>
          </View>
        ) : (
          <View />
        )}
        {!follow ? (
          <Pressable style={styles.locate} onPress={() => setFollow(true)} accessibilityLabel="내 위치로 이동">
            <Ionicons name="locate" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.panel}>
        <View
          style={styles.handleArea}
          {...handlePan.panHandlers}
          accessibilityRole="button"
          accessibilityLabel={panelOpen ? '측정 정보 접기' : '측정 정보 펼치기'}
        >
          <View style={styles.handle} />
        </View>

        {panelOpen ? (
          <>
            <View style={styles.main}>
              <Text style={styles.distance}>{formatKm(view.distanceM)}</Text>
              <Text style={styles.unit}>km</Text>
            </View>

            <View style={styles.row}>
              <Metric label="시간" value={formatDuration(view.elapsedMs)} />
              <Metric label="평균 페이스" value={formatPace(view.avgPace)} />
            </View>
            <View style={styles.row}>
              <Metric label="현재 페이스" value={formatPace(view.currentPace)} />
              <Metric label="걸음수" value={String(view.steps)} />
            </View>
          </>
        ) : (
          <Text style={styles.compact}>
            {formatKm(view.distanceM)} km · {formatDuration(view.elapsedMs)}
          </Text>
        )}

        {view.error ? <Text style={styles.error}>{view.error}</Text> : null}
        {view.status === 'paused' ? <Text style={styles.paused}>일시정지</Text> : null}

        <View style={styles.actions}>
        {view.status === 'idle' ? (
          <Button
            label="시작"
            onPress={() => {
              setFollow(true);
              void start();
            }}
          />
        ) : view.status === 'starting' ? (
          <Button label="준비 중…" onPress={() => {}} disabled />
        ) : view.status === 'running' ? (
          <Button label="일시정지" onPress={() => void pause()} />
        ) : (
          <>
            <Button label="재개" onPress={() => void resume()} />
            <Button variant="secondary" label="종료" onPress={onFinish} />
          </>
        )}

        {view.status === 'idle' && pending ? (
          <Button
            variant="secondary"
            label={uploading ? '보내는 중…' : `저장 안 된 기록 다시 보내기 (${formatKm(pending.distance_m)} km)`}
            onPress={() => void upload(pending)}
            disabled={uploading}
          />
        ) : null}
        </View>
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
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  gps: { fontWeight: '600' },
  locate: {
    backgroundColor: colors.background,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  // 지도 위에 겹치는 반투명 하단 패널 (반투명 배경에 elevation을 주면 안드로이드에서 그림자가 비쳐 보여 테두리로 대신합니다)
  panel: {
    marginTop: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  compact: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
  },
  main: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 16 },
  distance: { fontSize: 56, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 18, color: colors.muted },
  row: { flexDirection: 'row', marginBottom: 14 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  metricLabel: { color: colors.muted, marginTop: 2 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 12 },
  paused: { color: colors.muted, textAlign: 'center', fontWeight: '600', marginBottom: 12 },
  actions: { marginTop: 4, gap: 10 },
});
