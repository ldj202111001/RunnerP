import Ionicons from '@expo/vector-icons/Ionicons';
import { Drawer, DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goalsDb } from '@/db';
import type { Goal } from '@/db/types';
import { colors, radius, spacing, type } from '@/theme';
import { formatDate, formatDuration } from '@/utils/format';

// 왼쪽 위 ☰ 버튼으로 여는 옆 메뉴: 러닝(지도·측정) / 추천 / 계획 / 기록
// 앱을 켜면 index(지도)에서 시작합니다. 지도 화면은 헤더 없이 떠 있는 메뉴 버튼을 씁니다.
export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        drawerActiveTintColor: colors.primary,
        drawerActiveBackgroundColor: colors.primarySoft,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { ...type.bodyStrong, fontSize: 16 },
        drawerItemStyle: { borderRadius: radius.md },
        drawerStyle: { backgroundColor: colors.surface, width: 300 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { ...type.h3, color: colors.text },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: '러닝',
          headerShown: false,
          drawerIcon: ({ color, size }) => <Ionicons name="navigate" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="today"
        options={{
          title: '오늘의 추천',
          drawerIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="plan"
        options={{
          title: '주간 계획',
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

const DISTANCE_LABELS: Record<number, string> = { 5: '5K', 10: '10K', 21.0975: '하프', 42.195: '풀' };

// 머리말에 보여 줄 목표 한 줄 (제목·부제)
function describeGoal(goal: Goal): [string, string] {
  const label = goal.distance_km ? (DISTANCE_LABELS[goal.distance_km] ?? `${goal.distance_km}km`) : '';
  switch (goal.type) {
    case 'HEALTH':
      return ['건강하게 꾸준히', `주 ${goal.weekly_minutes_target ?? 150}분 달리기`];
    case 'IMPROVE':
      return [`${label} 기록 단축`, goal.target_time_sec ? `목표 ${formatDuration(goal.target_time_sec * 1000)}` : ''];
    case 'RACE':
      return [`${label} 대회 준비`, goal.target_date ? formatDate(goal.target_date) : ''];
  }
}

// 위: 목표 머리말 / 아래: 메뉴
function DrawerMenu(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    goalsDb
      .current()
      .then(setGoal)
      .catch(() => {
        // 목표를 못 읽으면 기본 문구를 보여줍니다.
      });
  }, []);

  const [title, subtitle] = goal ? describeGoal(goal) : ['러너', '오늘도 가볍게 달려볼까요?'];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🏃</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={[styles.items, { paddingBottom: insets.bottom }]}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...type.h2, color: '#fff' },
  name: { ...type.h3, color: colors.text },
  subtitle: { ...type.caption, color: colors.muted, marginTop: 2 },
  items: { paddingTop: spacing.md, paddingHorizontal: spacing.sm },
});
