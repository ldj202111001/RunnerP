import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { goalsDb } from '@/db';

// 로그인 없이 폰 하나로 씁니다 (기기 1대 = 사용자 1명).
// loading: 폰 DB 확인 중 / needsGoal: S1 목표 설정 / ready: 옆 메뉴 화면
export type SessionStatus = 'loading' | 'needsGoal' | 'ready';

interface Session {
  status: SessionStatus;
  markGoalCreated: () => void;
}

const SessionContext = createContext<Session | null>(null);

// 진행 중 목표가 있는지로 첫 화면을 정합니다.
async function resolveStatus(): Promise<SessionStatus> {
  try {
    return (await goalsDb.current()) ? 'ready' : 'needsGoal';
  } catch {
    // DB를 열지 못하면 일단 홈으로 보내고 각 화면에서 오류를 보여줍니다.
    return 'ready';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    resolveStatus().then(setStatus);
  }, []);

  const markGoalCreated = useCallback(() => setStatus('ready'), []);

  const value = useMemo(() => ({ status, markGoalCreated }), [status, markGoalCreated]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
