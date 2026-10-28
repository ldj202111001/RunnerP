// 폰 DB 입구. 화면은 여기의 profileDb·goalsDb·runsDb를 씁니다 (예전 api/endpoints의 usersApi·goalsApi·runsApi 자리).
// 파일은 앱 데이터 폴더의 runner.db 하나이고, 처음 열 때 schema.ts의 마이그레이션을 적용합니다.

import { openDatabaseAsync } from 'expo-sqlite';

import type { GoalCreateRequest, Profile, RunCreateRequest } from '@/api/types';

import { createGoal, currentGoal, updateGoal } from './goals';
import { getProfile, updateProfile } from './profile';
import { createRun, deleteRun, getRun, listRuns, summarizeRuns } from './runs';
import { migrate } from './schema';
import type { Db } from './sqlite';

export { NotFoundError, ValidationError } from './sqlite';

const DB_NAME = 'runner.db';

let opening: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!opening) {
    const next = (async (): Promise<Db> => {
      const db = await openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
    // 열기에 실패하면 다음 호출 때 다시 시도
    next.catch(() => {
      opening = null;
    });
    opening = next;
  }
  return opening;
}

export const profileDb = {
  get: async () => getProfile(await getDb()),
  update: async (body: Profile) => updateProfile(await getDb(), body),
};

export const goalsDb = {
  create: async (body: GoalCreateRequest) => createGoal(await getDb(), body),
  current: async () => currentGoal(await getDb()),
  update: async (id: number, body: GoalCreateRequest) => updateGoal(await getDb(), id, body),
};

export const runsDb = {
  create: async (body: RunCreateRequest) => createRun(await getDb(), body),
  list: async (params: { from?: string; to?: string; page?: number } = {}) => listRuns(await getDb(), params),
  get: async (id: number) => getRun(await getDb(), id),
  remove: async (id: number) => deleteRun(await getDb(), id),
  // from·to는 시간대가 붙은 ISO 시각 (to는 포함하지 않음)
  summary: async (params: { from: string; to?: string }) => summarizeRuns(await getDb(), params),
};
