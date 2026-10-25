import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// S4 주간 계획
export default function WeeklyPlanScreen() {
  return (
    <ScreenPlaceholder
      id="S4"
      title="주간 계획"
      icon="calendar-outline"
      items={[
        '요일별 훈련 7칸',
        '저강도/고강도 비율 (80/20)',
        '이번 주 총 부하',
        'ACWR 게이지',
      ]}
      apis={['GET /plans/week?start=YYYY-MM-DD']}
    />
  );
}
