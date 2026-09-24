import type { ReportCategory } from '@ou-campus-map/shared-types';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Chip } from '@/components/Chip';
import { DemoBanner } from '@/components/DemoBanner';
import { IconButton } from '@/components/IconButton';
import { ReportRow } from '@/components/ReportRow';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView';
import { REPORT_CATEGORY_LIST } from '@/constants/categories';
import { isDemoMode } from '@/constants/config';
import { colors, space } from '@/constants/theme';
import { useActiveReports, useBuildings } from '@/hooks/useCampusData';
import { useVote } from '@/hooks/useVote';

/** Chronological feed of active reports, newest first, live via Realtime (design doc §9.2). */
export default function ReportsScreen() {
  const reports = useActiveReports();
  const buildings = useBuildings();
  const { vote, pendingId } = useVote();
  const [filter, setFilter] = useState<ReportCategory | null>(null);

  const names = useMemo(
    () => new Map((buildings.data ?? []).map((b) => [b.id, b.name])),
    [buildings.data],
  );
  const rows = (reports.data ?? []).filter((r) => !filter || r.category === filter);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader
        subtitle="Live reports"
        right={
          <IconButton
            icon="plus"
            accessibilityLabel="Report a campus condition"
            onPress={() => router.push('/report/new')}
            background={colors.crimsonBright}
            color={colors.white}
          />
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
      >
        <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
        {REPORT_CATEGORY_LIST.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            icon={c.icon}
            color={c.color}
            selected={filter === c.key}
            onPress={() => setFilter(filter === c.key ? null : c.key)}
          />
        ))}
      </ScrollView>

      {reports.isLoading ? (
        <LoadingState label="Loading reports…" />
      ) : reports.isError ? (
        <ErrorState onRetry={() => reports.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, rows.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={reports.isRefetching}
              onRefresh={() => reports.refetch()}
              tintColor={colors.crimsonBright}
            />
          }
          ListHeaderComponent={<DemoBanner />}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle-outline"
              title={filter ? 'No reports in this category' : 'All clear on campus'}
              body={
                isDemoMode
                  ? 'Reports are live data — connect Supabase to see and post them.'
                  : 'No active reports right now. Spot something? Tap + to let other Sooners know.'
              }
            />
          }
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              buildingName={item.building_id ? names.get(item.building_id) : undefined}
              onVote={(v) => vote(item.id, v)}
              voting={pendingId === item.id}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  chipScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm },
  list: { padding: space.lg, gap: space.sm },
});
