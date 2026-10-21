import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { colors, space } from '@/constants/theme';

/** Placeholder until the AI campus guide ships. */
export default function AssistantScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader subtitle="AI campus guide" />
      <View style={styles.empty}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="creation" size={28} color={colors.cream} />
        </View>
        <AppText variant="headlineSm" style={{ textAlign: 'center' }}>
          Feature coming soon
        </AppText>
        <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
          The AI guide isn’t available yet. Check back in a future update.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
