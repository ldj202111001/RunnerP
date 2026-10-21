import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// S6 러닝 상세
export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      id="S6"
      title={`러닝 상세 (run #${id})`}
      items={['지도 경로', '1km 구간 페이스', '거리·시간·고도·케이던스', 'RPE·부하·메모']}
      apis={['GET /runs/{id}']}
    />
  );
}
