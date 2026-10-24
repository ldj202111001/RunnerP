import Ionicons from '@expo/vector-icons/Ionicons';
import { Drawer } from 'expo-router/drawer';

import { colors } from '@/theme';

// 왼쪽 위 ☰ 버튼으로 여는 옆 메뉴: 러닝(지도·측정) / 추천 / 계획 / 기록
// 앱을 켜면 index(지도)에서 시작합니다.
export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ drawerActiveTintColor: colors.primary }}>
      <Drawer.Screen
        name="index"
        options={{
          title: '러닝',
          drawerIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="today"
        options={{
          title: '추천',
          drawerIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="plan"
        options={{
          title: '계획',
          drawerIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          title: '기록',
          drawerIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color as string} />,
        }}
      />
    </Drawer>
  );
}
