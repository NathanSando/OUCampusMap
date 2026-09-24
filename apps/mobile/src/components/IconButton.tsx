import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/constants/categories';
import { colors, elevation, MIN_TAP, radius } from '@/constants/theme';

interface Props {
  icon: IconName;
  /** Required: icon-only buttons must be labelled for screen readers (design doc §9.3). */
  accessibilityLabel: string;
  onPress?: () => void;
  color?: string;
  background?: string;
  size?: number;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = colors.textPrimary,
  background = colors.surfaceElevated,
  size = MIN_TAP + 4,
  floating,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={Math.max(0, (MIN_TAP - size) / 2)}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: background, opacity: pressed ? 0.8 : 1 },
        floating && [styles.floating, elevation.level2],
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.46)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  floating: { borderWidth: 1, borderColor: colors.border },
});
