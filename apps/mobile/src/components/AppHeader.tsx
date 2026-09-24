import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { APP_NAME } from '@/constants/config';
import { colors, space } from '@/constants/theme';
import { AppText } from './AppText';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${APP_NAME} logo`}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.25 }]}
    >
      <MaterialCommunityIcons name="map-marker-radius" size={size * 0.58} color={colors.cream} />
    </View>
  );
}

/** Top bar from the Stitch mockups: crimson crest, app name, screen subtitle. */
export function AppHeader({ subtitle, right }: { subtitle: string; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <Logo />
      <View style={styles.titles}>
        <AppText variant="headlineSm" accessibilityRole="header">
          {APP_NAME}
        </AppText>
        <AppText variant="labelSm" color={colors.textSecondary} uppercase>
          {subtitle}
        </AppText>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  logo: {
    backgroundColor: colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 230, 210, 0.25)',
  },
  titles: { flex: 1 },
});
