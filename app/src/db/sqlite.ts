// DB 함수들이 쓰는 최소한의 SQLite 기능. 앱에서는 expo-sqlite의 SQLiteDatabase가 그대로 맞고,
// 검사(scripts/check-db.mjs)에서는 Node 내장 node:sqlite로 같은 모양을 만들어 씁니다.

export type Param = string | number | null;

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: Param[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(source: string, params: Param[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: Param[]): Promise<T[]>;
  // 이 안의 쿼리는 txn으로만 실행합니다 (모두 반영되거나 모두 취소)
  withExclusiveTransactionAsync(task: (txn: Db) => Promise<void>): Promise<void>;
}

export class NotFoundError extends Error {}

// 화면에 그대로 보여 줄 수 있는 입력 오류 (서버 시절의 422)
export class ValidationError extends Error {}

export const toJson = (v: unknown) => (v == null ? null : JSON.stringify(v));
export const fromJson = <T>(v: string | null): T | null => (v == null ? null : (JSON.parse(v) as T));
