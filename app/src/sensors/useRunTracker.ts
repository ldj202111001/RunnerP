import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RunCreateRequest } from '@/api/types';
import { runBuffer, type ActiveRun } from '@/storage/runBuffer';
import { startBarometer } from './altitude';
import { filterFix } from './gpsFilter';
import { startStepCounter } from './pedometer';
import { distanceBetween, paceSecPerKm, segmentDistance, summarizeRun, type TrackPoint } from './summary';

export type TrackerStatus = 'idle' | 'starting' | 'running' | 'paused';

export interface TrackerView {
  status: TrackerStatus;
  elapsedMs: number;
  distanceM: number;
  steps: number;
  avgPace: number; // 초/km, 0이면 아직 계산 불가
  currentPace: number; // 최근 30초 기준
  gpsAccuracy: number | null; // 마지막으로 받은 GPS 오차 (m)
  position: LatLng | null; // 마지막으로 받은 GPS 위치 (지도 카메라용)
  route: LatLng[][]; // 지도에 그릴 경로, 일시정지 구간마다 끊어서
  error: string | null;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

// 구간(segment)별로 끊어진 경로
function toRoute(points: TrackPoint[]): LatLng[][] {
  const route: LatLng[][] = [];
  let segment: number | null = null;
  for (const p of points) {
    if (p.segment !== segment) {
      route.push([]);
      segment = p.segment;
    }
    route[route.length - 1].push({ latitude: p.latitude, longitude: p.longitude });
  }
  return route;
}

const KEEP_AWAKE_TAG = 'run-tracker';
const PERSIST_EVERY_MS = 10_000;
const CURRENT_PACE_WINDOW_MS = 30_000;

const initialView: TrackerView = {
  status: 'idle',
  elapsedMs: 0,
  distanceM: 0,
  steps: 0,
  avgPace: 0,
  currentPace: 0,
  gpsAccuracy: null,
  position: null,
  route: [],
  error: null,
};

type Sub = { remove: () => void } | null;

// 러닝 측정 엔진: 시작/일시정지/재개/종료, GPS·걸음수·기압 수집, 측정 중 버퍼 저장
export function useRunTracker() {
  const [view, setView] = useState<TrackerView>(initialView);

  // 렌더링과 무관한 측정 상태는 ref에 둡니다 (센서 콜백이 항상 최신 값을 보도록).
  const run = useRef<ActiveRun | null>(null);
  const status = useRef<TrackerStatus>('idle');
  const elapsedBase = useRef(0); // 직전 재개 전까지의 운동 시간
  const resumedAt = useRef<number | null>(null); // 마지막 시작/재개 시각
  const stepBase = useRef(0); // 직전 걸음수 구독까지의 누적
  const stepsNow = useRef(0); // 현재 걸음수 구독의 누적
  const distance = useRef(0);
  const lastAccepted = useRef<TrackPoint | null>(null); // 현재 구간의 마지막 지점
  const gpsAccuracy = useRef<number | null>(null);
  const position = useRef<LatLng | null>(null);
  const lastPersist = useRef(0);

  const locationSub = useRef<Sub>(null);
  const stepSub = useRef<Sub>(null);
  const baroSub = useRef<Awaited<ReturnType<typeof startBarometer>>>(null);

  const elapsedNow = () => elapsedBase.current + (resumedAt.current ? Date.now() - resumedAt.current : 0);
  const totalSteps = () => stepBase.current + stepsNow.current;

  const currentPace = (elapsed: number) => {
    const points = run.current?.points ?? [];
    let d = 0;
    let i = points.length - 1;
    const last = points[i];
    if (!last) return 0;
    while (i > 0 && points[i - 1].segment === last.segment && elapsed - points[i - 1].elapsedMs <= CURRENT_PACE_WINDOW_MS) {
      d += distanceBetween(points[i - 1], points[i]);
      i--;
    }
    return paceSecPerKm(d, (last.elapsedMs - points[i].elapsedMs) / 1000);
  };

  const refresh = useCallback((error: string | null = null) => {
    const elapsed = elapsedNow();
    setView({
      status: status.current,
      elapsedMs: elapsed,
      distanceM: distance.current,
      steps: totalSteps(),
      avgPace: paceSecPerKm(distance.current, elapsed / 1000),
      currentPace: status.current === 'running' ? currentPace(elapsed) : 0,
      gpsAccuracy: gpsAccuracy.current,
      position: position.current,
      route: toRoute(run.current?.points ?? []),
      error,
    });
  }, []);

  const persist = useCallback(async () => {
    if (!run.current) return;
    lastPersist.current = Date.now();
    await runBuffer.saveActive({ ...run.current, elapsedMs: elapsedNow(), steps: totalSteps() });
  }, []);

  const stopSensors = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    stepSub.current?.remove();
    stepSub.current = null;
    stepBase.current += stepsNow.current;
    stepsNow.current = 0;
  }, []);

  const onLocation = useCallback(
    (loc: Location.LocationObject) => {
      const current = run.current;
      if (!current || status.current !== 'running') return;
      gpsAccuracy.current = loc.coords.accuracy;
      position.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

      const fix = {
        timestamp: loc.timestamp,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
      };
      if (filterFix(lastAccepted.current, fix) === 'accept') {
        const point: TrackPoint = {
          timestamp: fix.timestamp,
          elapsedMs: elapsedNow(),
          segment: current.segment,
          latitude: fix.latitude,
          longitude: fix.longitude,
          altitude: baroSub.current?.latest() ?? fix.altitude,
          speed: fix.speed != null && fix.speed >= 0 ? fix.speed : null,
        };
        if (lastAccepted.current) distance.current += segmentDistance(lastAccepted.current, point);
        current.points.push(point);
        lastAccepted.current = point;
      }

      if (Date.now() - lastPersist.current >= PERSIST_EVERY_MS) void persist();
      refresh();
    },
    [persist, refresh],
  );

  const startSensors = useCallback(async () => {
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      onLocation,
    );
    stepSub.current = await startStepCounter((steps) => {
      stepsNow.current = steps;
    });
    if (!baroSub.current) baroSub.current = await startBarometer();
  }, [onLocation]);

  // 위치 서비스와 권한을 확인합니다. 문제가 있으면 사용자에게 보여줄 문장을 돌려줍니다.
  const checkLocation = async (): Promise<string | null> => {
    if (!(await Location.hasServicesEnabledAsync())) return '휴대폰의 위치 서비스(GPS)를 켜 주세요.';
    const { granted } = await Location.requestForegroundPermissionsAsync();
    return granted ? null : '러닝을 측정하려면 위치 권한이 필요합니다.';
  };

  const start = useCallback(
    async (plannedSessionId: number | null = null) => {
      if (status.current !== 'idle') return;
      status.current = 'starting';
      refresh();

      const problem = await checkLocation();
      if (problem) {
        status.current = 'idle';
        refresh(problem);
        return;
      }

      const now = Date.now();
      run.current = { startedAt: now, elapsedMs: 0, segment: 0, steps: 0, points: [], plannedSessionId };
      elapsedBase.current = 0;
      resumedAt.current = now;
      stepBase.current = 0;
      stepsNow.current = 0;
      distance.current = 0;
      lastAccepted.current = null;
      status.current = 'running';

      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      await startSensors();
      await persist();
      refresh();
    },
    [persist, refresh, startSensors],
  );

  const pause = useCallback(async () => {
    if (status.current !== 'running') return;
    elapsedBase.current = elapsedNow();
    resumedAt.current = null;
    status.current = 'paused';
    stopSensors();
    await persist();
    refresh();
  }, [persist, refresh, stopSensors]);

  const resume = useCallback(async () => {
    if (status.current !== 'paused' || !run.current) return;
    const problem = await checkLocation();
    if (problem) {
      refresh(problem);
      return;
    }
    // 새 구간: 일시정지 동안 이동한 거리는 세지 않습니다.
    run.current.segment += 1;
    lastAccepted.current = null;
    resumedAt.current = Date.now();
    status.current = 'running';
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    await startSensors();
    refresh();
  }, [refresh, startSensors]);

  const reset = useCallback(async () => {
    stopSensors();
    baroSub.current?.remove();
    baroSub.current = null;
    await deactivateKeepAwake(KEEP_AWAKE_TAG);
    run.current = null;
    status.current = 'idle';
    elapsedBase.current = 0;
    resumedAt.current = null;
    stepBase.current = 0;
    distance.current = 0;
    lastAccepted.current = null;
    gpsAccuracy.current = null;
    position.current = null;
    await runBuffer.clearActive();
    setView(initialView);
  }, [stopSensors]);

  // 측정을 끝내고 서버로 보낼 요약을 만듭니다.
  // 요약은 먼저 '전송 대기'로 저장해 두므로, 전송이 실패해도 기록은 남습니다.
  const finish = useCallback(async (): Promise<RunCreateRequest | null> => {
    const current = run.current;
    if (!current) return null;
    const elapsedSec = elapsedNow() / 1000;
    const summary =
      current.points.length >= 2
        ? summarizeRun(current.points, elapsedSec, current.startedAt, totalSteps() || null, current.plannedSessionId)
        : null;
    if (summary) await runBuffer.savePending(summary);
    await reset();
    return summary;
  }, [reset]);

  // 앱이 측정 중에 꺼졌다면 저장된 버퍼를 일시정지 상태로 불러옵니다.
  const restore = useCallback(async (): Promise<boolean> => {
    if (status.current !== 'idle') return false;
    const saved = await runBuffer.loadActive();
    if (!saved) return false;
    run.current = saved;
    elapsedBase.current = saved.elapsedMs;
    resumedAt.current = null;
    stepBase.current = saved.steps;
    stepsNow.current = 0;
    distance.current = saved.points.reduce((sum, p, i) => (i > 0 ? sum + segmentDistance(saved.points[i - 1], p) : sum), 0);
    lastAccepted.current = null;
    const last = saved.points[saved.points.length - 1];
    position.current = last ? { latitude: last.latitude, longitude: last.longitude } : null;
    status.current = 'paused';
    refresh();
    return true;
  }, [refresh]);

  // 달리는 동안 1초마다 시간 표시 갱신
  useEffect(() => {
    if (view.status !== 'running') return;
    const timer = setInterval(() => refresh(), 1000);
    return () => clearInterval(timer);
  }, [view.status, refresh]);

  // 화면이 사라지면 센서 정리 (버퍼는 남겨 두어 다음에 복구)
  useEffect(
    () => () => {
      locationSub.current?.remove();
      stepSub.current?.remove();
      baroSub.current?.remove();
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    },
    [],
  );

  return { view, start, pause, resume, finish, discard: reset, restore };
}
