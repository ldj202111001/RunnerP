import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: '#fff' },
  secondary: { bg: colors.surface, pressed: colors.surfaceAlt, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primary },
  danger: { bg: colors.dangerSoft, pressed: '#FAD9DA', fg: colors.danger },
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style }: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? p.pressed : p.bg },
        p.border ? { borderWidth: 1, borderColor: p.border } : null,
        inactive && styles.dimmed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={p.fg} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={p.fg} />
        ) : null}
        <Text style={[styles.label, { color: p.fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, paddingHorizontal: 20, borderRadius: radius.md, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dimmed: { opacity: 0.55 },
  label: { ...type.bodyStrong, fontSize: 16 },
});
