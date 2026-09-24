import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants/categories';
import { colors, space } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

/*
 * Every data-driven screen handles loading, empty and error (design doc §9.3).
 * Never render a blank screen or a raw error message.
 */

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.crimsonBright} size="large" />
      <AppText color={colors.textSecondary} style={styles.gap}>
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  icon = 'map-search-outline',
  title,
  body,
}: {
  icon?: IconName;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name={icon} size={40} color={colors.textDisabled} />
      <AppText variant="titleMd" style={[styles.gap, styles.text]}>
        {title}
      </AppText>
      {body && (
        <AppText color={colors.textSecondary} style={styles.text}>
          {body}
        </AppText>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="assertive">
      <MaterialCommunityIcons name="cloud-alert-outline" size={40} color={colors.error} />
      <AppText variant="titleMd" style={[styles.gap, styles.text]}>
        Couldn’t load this right now
      </AppText>
      <AppText color={colors.textSecondary} style={styles.text}>
        {message ?? 'Check your connection and try again.'}
      </AppText>
      {onRetry && (
        <Button label="Try again" variant="secondary" onPress={onRetry} style={styles.retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    gap: space.xs,
  },
  gap: { marginTop: space.sm },
  text: { textAlign: 'center' },
  retry: { marginTop: space.lg, minWidth: 140 },
});
