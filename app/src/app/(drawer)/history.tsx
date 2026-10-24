import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// S6 기록·진행 상황
export default function HistoryScreen() {
  return (
    <ScreenPlaceholder
      id="S6"
      title="기록·진행 상황"
      items={['러닝 이력 목록', '주간 거리·부하 그래프', '예상 기록 추이', '러닝 상세']}
      apis={['GET /runs', 'GET /runs/{id}', 'GET /stats/weekly']}
    >
      <Button label="[임시] 러닝 상세 열기" onPress={() => router.push('/runs/1')} />
    </ScreenPlaceholder>
  );
}
