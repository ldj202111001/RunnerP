import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RunCreateRequest } from '@/api/types';
import type { TrackPoint } from '@/sensors/summary';

const ACTIVE_KEY = 'run_buffer/active';
const PENDING_KEY = 'run_buffer/pending';

// 측정 중인 러닝. 앱이 꺼져도 이어서 측정하거나 저장할 수 있도록 주기적으로 기록합니다.
export interface ActiveRun {
  startedAt: number;
  elapsedMs: number; // 마지막 저장 시점까지의 운동 시간
  segment: number;
  steps: number;
  points: TrackPoint[];
  plannedSessionId: number | null;
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const runBuffer = {
  saveActive: (run: ActiveRun) => AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(run)),
  loadActive: () => read<ActiveRun>(ACTIVE_KEY),
  clearActive: () => AsyncStorage.removeItem(ACTIVE_KEY),

  // 서버 전송에 실패한 러닝 요약. 다시 보내기 전까지 보관합니다.
  savePending: (run: RunCreateRequest) => AsyncStorage.setItem(PENDING_KEY, JSON.stringify(run)),
  loadPending: () => read<RunCreateRequest>(PENDING_KEY),
  clearPending: () => AsyncStorage.removeItem(PENDING_KEY),
};
