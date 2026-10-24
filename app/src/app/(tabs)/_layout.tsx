import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme';

// 하단 탭: 홈(지도·러닝 측정) / 추천 / 계획 / 기록
// 앱을 켜면 index(지도)에서 시작합니다.
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: '추천',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: '계획',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
