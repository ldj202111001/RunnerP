import Ionicons from '@expo/vector-icons/Ionicons';
import { Drawer, DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usersApi } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { colors, radius, spacing, type } from '@/theme';

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

// 위: 프로필 머리말 / 가운데: 메뉴 / 아래: 로그아웃
function DrawerMenu(props: DrawerContentComponentProps) {
  const { signOut } = useSession();
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .me()
      .then((me) => {
        setNickname(me.nickname);
        setEmail(me.email);
      })
      .catch(() => {
        // 서버 없이 둘러보는 중이면 기본 문구를 보여줍니다.
      });
  }, []);

  const confirmSignOut = () =>
    Alert.alert('로그아웃', '로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{nickname ? nickname.slice(0, 1) : '🏃'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {nickname ?? '러너'}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email ?? '오늘도 가볍게 달려볼까요?'}
        </Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.items}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Pressable
        style={({ pressed }) => [styles.signOut, { marginBottom: insets.bottom + spacing.lg }, pressed && styles.pressed]}
        onPress={confirmSignOut}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.muted} />
        <Text style={styles.signOutText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { backgroundColor: colors.ink, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
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
  name: { ...type.h3, color: colors.onInk },
  email: { ...type.caption, color: colors.onInkMuted, marginTop: 2 },
  items: { paddingTop: spacing.md, paddingHorizontal: spacing.sm },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.background },
  signOutText: { ...type.bodyStrong, color: colors.muted },
});
