import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { isDemoMode } from '@/constants/config';
import { colors, radius, space } from '@/constants/theme';
import { AppText } from './AppText';

/** Shown when Supabase isn't configured, so nobody mistakes bundled data for live data. */
export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialCommunityIcons name="information-outline" size={16} color={colors.info} />
      <AppText variant="bodySm" color={colors.textSecondary} style={styles.text}>
        Demo mode — showing bundled campus data. Reports and accounts need Supabase (see README).
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  text: { flex: 1 },
});
