import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DemoBanner } from '@/components/DemoBanner';
import { ReportRow } from '@/components/ReportRow';
import { colors, radius, space } from '@/constants/theme';
import { queryKeys, useActiveReports } from '@/hooks/useCampusData';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session, displayName, available } = useAuth();
  const reports = useActiveReports();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteReport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    onError: (err) =>
      Alert.alert('Couldn’t delete report', err instanceof Error ? err.message : 'Try again.'),
  });

  if (!session) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <AppHeader subtitle="Profile" />
        <View style={styles.content}>
          <DemoBanner />
          <View style={styles.card}>
            <AppText variant="headlineSm">Sign in to post reports</AppText>
            <AppText color={colors.textSecondary}>
              Browsing the map, directions, dining, printers, accessibility info and the AI guide
              all work without an account. You only need one to report conditions and vote.
            </AppText>
            <Button
              label="Sign in"
              onPress={() => router.push('/auth/sign-in')}
              disabled={!available}
            />
            <Button
              label="Create account"
              variant="secondary"
              onPress={() => router.push('/auth/sign-up')}
              disabled={!available}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const mine = (reports.data ?? []).filter((r) => r.user_id === session.user.id);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader subtitle="Profile" />
      <FlatList
        data={mine}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: space.lg }}>
            <View style={styles.card}>
              <AppText variant="labelSm" color={colors.textSecondary} uppercase>
                Signed in as
              </AppText>
              <AppText variant="headlineSm">{displayName}</AppText>
              {displayName !== session.user.email && (
                <AppText color={colors.textSecondary}>{session.user.email}</AppText>
              )}
              <Button
                label="Sign out"
                variant="secondary"
                icon="logout"
                onPress={() => supabase?.auth.signOut()}
              />
            </View>
            {/* TODO(team): Tier 2 — class schedule and "next class" card (design doc §2, T2.1). */}
            <AppText variant="titleMd" accessibilityRole="header">
              My active reports
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <AppText color={colors.textSecondary}>You have no active reports.</AppText>
        }
        renderItem={({ item }) => (
          <View style={{ gap: space.xs }}>
            <ReportRow report={item} />
            <Button
              label="Delete report"
              variant="ghost"
              icon="trash-can-outline"
              loading={remove.isPending && remove.variables === item.id}
              onPress={() =>
                Alert.alert('Delete this report?', 'It will disappear from everyone’s map.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
                ])
              }
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
});
