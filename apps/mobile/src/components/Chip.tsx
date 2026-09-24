import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/constants/categories';
import { colors, radius, space } from '@/constants/theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  /** Layer/category color — used for the selected border, tint and icon. */
  color?: string;
  icon?: IconName;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** Filter/layer chip: selected = colored border + 15% color wash (design-system §3). */
export function Chip({
  label,
  selected,
  color = colors.crimsonBright,
  icon,
  onPress,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { borderColor: color, backgroundColor: `${color}26` } : styles.idle,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={selected ? color : colors.textSecondary}
        />
      )}
      <AppText variant="labelLg" color={selected ? colors.textPrimary : colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
});
