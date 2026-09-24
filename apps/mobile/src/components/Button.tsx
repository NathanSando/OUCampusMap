import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { IconName } from '@/constants/categories';
import { colors, radius, space } from '@/constants/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const BG: Record<Variant, { idle: string; pressed: string }> = {
  primary: { idle: colors.crimsonBright, pressed: colors.crimsonPressed },
  secondary: { idle: colors.surfaceElevated, pressed: colors.border },
  ghost: { idle: 'transparent', pressed: colors.surfaceElevated },
  destructive: { idle: '#EF4B4B', pressed: '#D43D3D' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  accessibilityHint,
}: Props) {
  const inactive = disabled || loading;
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.textPrimary : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? BG[variant].pressed : BG[variant].idle },
        variant === 'secondary' && styles.outlined,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={fg} />}
          <AppText variant="labelLg" color={fg} style={styles.label}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontSize: 15 },
});
