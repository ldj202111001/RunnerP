import { useSession } from '@/auth/session';
import { Button } from '@/components/Button';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// S1 목표 설정 (최초 1회, 이후 수정 가능)
export default function GoalSetupScreen() {
  const { markGoalCreated } = useSession();

  return (
    <ScreenPlaceholder
      id="S1"
      title="목표 설정"
      items={[
        '성별·나이·키·몸무게',
        '목표 종목 (5K / 10K / 하프 / 풀)',
        '목표 기록, 목표일',
        '주당 가능 일수 (3–6)',
        '최근 5K 기록 (선택, 콜드 스타트용)',
      ]}
      apis={['PUT /users/me/profile', 'POST /goals']}
    >
      <Button label="[임시] 목표 저장 후 홈으로" onPress={markGoalCreated} />
    </ScreenPlaceholder>
  );
}
