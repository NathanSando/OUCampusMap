import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants/categories';
import { colors, elevation, radius, space } from '@/constants/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface StatTile {
  icon: IconName;
  color: string;
  label: string;
  value: string;
}

interface Props {
  title: string;
  titleIcon?: { name: IconName; color: string };
  meta?: ReactNode;
  tiles?: StatTile[];
  actions: ReactNode;
  onClose: () => void;
}

/** Card that peeks up from the bottom of the map when a marker is tapped (Stitch: map screen). */
export function PeekSheet({ title, titleIcon, meta, tiles, actions, onClose }: Props) {
  return (
    <View style={[styles.sheet, elevation.level3]} accessibilityViewIsModal={false}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {titleIcon && (
            <MaterialCommunityIcons name={titleIcon.name} size={20} color={titleIcon.color} />
          )}
          <AppText
            variant="headlineSm"
            numberOfLines={2}
            style={styles.title}
            accessibilityRole="header"
          >
            {title}
          </AppText>
        </View>
        <IconButton icon="close" accessibilityLabel="Close details" onPress={onClose} size={40} />
      </View>
      {meta && <View style={styles.meta}>{meta}</View>}
      {tiles && tiles.length > 0 && (
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <View
              key={t.label}
              style={styles.tile}
              accessible
              accessibilityLabel={`${t.label}: ${t.value}`}
            >
              <View style={styles.tileLabel}>
                <MaterialCommunityIcons name={t.icon} size={14} color={t.color} />
                <AppText variant="labelSm" color={colors.textSecondary} uppercase numberOfLines={1}>
                  {t.label}
                </AppText>
              </View>
              <AppText variant="labelLg" numberOfLines={1}>
                {t.value}
              </AppText>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
  },
  title: { flexShrink: 1 },
  meta: { gap: space.xs },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: space.sm + 2,
    gap: space.xxs,
  },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  actions: { flexDirection: 'row', gap: space.sm },
});
