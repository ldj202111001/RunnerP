import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// S2 오늘의 추천
export default function TodayScreen() {
  return (
    <ScreenPlaceholder
      id="S2"
      title="오늘의 추천"
      items={[
        '오늘의 훈련 카드 (종류·거리·목표 페이스·강도)',
        '추천 이유 한 줄',
        '목표 진행률',
        '예상 완주 기록',
      ]}
      apis={['GET /plans/today', 'GET /goals/current/progress']}
    >
      <Button label="시작" onPress={() => router.navigate('/')} />
    </ScreenPlaceholder>
  );
}
