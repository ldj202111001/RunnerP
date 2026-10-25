import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow, type } from '@/theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  size?: number;
  bg?: string;
  fg?: string;
  loading?: boolean;
  disabled?: boolean;
}

// 측정 화면의 큰 원형 조작 버튼 (시작·일시정지·재개·종료). 아래에 이름이 붙습니다.
export function RoundButton({
  icon,
  label,
  onPress,
  size = 76,
  bg = colors.primary,
  fg = '#fff',
  loading,
  disabled,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {loading ? <ActivityIndicator color={fg} /> : <Ionicons name={icon} size={size * 0.4} color={fg} />}
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  button: { alignItems: 'center', justifyContent: 'center', ...shadow.float },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.5 },
  label: { ...type.caption, color: colors.muted },
});
