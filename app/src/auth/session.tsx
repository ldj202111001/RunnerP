import { isAxiosError } from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { goalsApi } from '@/api/endpoints';
import { deleteToken, getToken, saveToken } from './token';

// loading: 저장된 토큰 확인 중 / signedOut: S0 로그인 / needsGoal: S1 목표 설정 / ready: 탭 화면
export type SessionStatus = 'loading' | 'signedOut' | 'needsGoal' | 'ready';

interface Session {
  status: SessionStatus;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  markGoalCreated: () => void;
  // 서버 없이 화면만 둘러보는 개발용 진입
  previewWithoutServer: () => void;
}

const SessionContext = createContext<Session | null>(null);

// 진행 중 목표가 있는지로 첫 화면을 정합니다. 404면 목표 없음.
async function resolveStatus(): Promise<SessionStatus> {
  try {
    await goalsApi.current();
    return 'ready';
  } catch (e) {
    if (isAxiosError(e)) {
      if (e.response?.status === 404) return 'needsGoal';
      if (e.response?.status === 401) {
        await deleteToken();
        return 'signedOut';
      }
    }
    // 서버에 닿지 않으면 일단 홈으로 보내고 각 화면에서 오류를 보여줍니다.
    return 'ready';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setStatus(token ? await resolveStatus() : 'signedOut');
    })();
  }, []);

  const signIn = useCallback(async (token: string) => {
    await saveToken(token);
    setStatus(await resolveStatus());
  }, []);

  const signOut = useCallback(async () => {
    await deleteToken();
    setStatus('signedOut');
  }, []);

  const markGoalCreated = useCallback(() => setStatus('ready'), []);
  const previewWithoutServer = useCallback(() => setStatus('ready'), []);

  const value = useMemo(
    () => ({ status, signIn, signOut, markGoalCreated, previewWithoutServer }),
    [status, signIn, signOut, markGoalCreated, previewWithoutServer],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
