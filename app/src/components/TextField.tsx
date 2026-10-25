import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface Props extends TextInputProps {
  icon: ComponentProps<typeof Ionicons>['name'];
}

// 왼쪽 아이콘 + 포커스 시 테두리 강조. 비밀번호 칸은 눈 아이콘으로 보이기/숨기기.
export function TextField({ icon, secureTextEntry, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.wrap, focused && styles.focused]}>
      <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.muted} />
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry && hidden}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
      />
      {secureTextEntry ? (
        <Ionicons
          name={hidden ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.muted}
          onPress={() => setHidden((h) => !h)}
          accessibilityLabel={hidden ? '비밀번호 보기' : '비밀번호 숨기기'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  focused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
});
