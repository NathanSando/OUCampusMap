import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  DAY_KEYS,
  formatTodayHours,
  getOpenState,
  type WeeklyHours,
} from '@ou-campus-map/shared-types';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ReportRow } from '@/components/ReportRow';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView';
import { ACCESSIBILITY_FEATURE_META, LAYER_META, type IconName } from '@/constants/categories';
import { colors, radius, space } from '@/constants/theme';
import {
  useAccessibility,
  useActiveReports,
  useBuilding,
  useDining,
  usePrinters,
} from '@/hooks/useCampusData';

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const building = useBuilding(id);
  const access = useAccessibility();
  const printers = usePrinters();
  const dining = useDining();
  const reports = useActiveReports();

  if (building.isLoading) return <LoadingState label="Loading building…" />;
  if (building.isError) return <ErrorState onRetry={() => building.refetch()} />;
  const b = building.data;
  if (!b)
    return (
      <EmptyState
        icon="office-building-remove-outline"
        title="Building not found"
        body="It may have been removed from the map."
      />
    );

  const features = (access.data ?? []).filter((f) => f.building_id === b.id);
  const buildingPrinters = (printers.data ?? []).filter((p) => p.building_id === b.id);
  const buildingDining = (dining.data ?? []).filter((d) => d.building_id === b.id);
  const buildingReports = (reports.data ?? []).filter((r) => r.building_id === b.id);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: b.abbreviation ?? 'Building' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {b.image_url && (
          <Image
            source={{ uri: b.image_url }}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={`Photo of ${b.name}`}
          />
        )}

        <View style={styles.titleBlock}>
          <AppText variant="headlineLg" accessibilityRole="header">
            {b.name}
          </AppText>
          {(b.abbreviation || b.aliases.length > 0) && (
            <AppText color={colors.textSecondary}>
              {[b.abbreviation, ...b.aliases].filter(Boolean).join(' · ')}
            </AppText>
          )}
          {b.description && <AppText variant="bodyLg">{b.description}</AppText>}
          {b.address && (
            <Row icon="map-marker-outline" color={colors.textSecondary}>
              <AppText color={colors.textSecondary}>{b.address}, Norman, OK</AppText>
            </Row>
          )}
          <HoursLine hours={b.hours} />
        </View>

        <Button
          label="Directions"
          icon="walk"
          onPress={() =>
            router.push({
              pathname: '/directions',
              params: { toLat: String(b.lat), toLng: String(b.lng), toName: b.name },
            })
          }
        />

        {buildingReports.length > 0 && (
          <Section title="Active reports" icon="alert" color={colors.warning}>
            {buildingReports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </Section>
        )}

        <Section
          title="Accessibility"
          icon={LAYER_META.accessibility.icon}
          color={LAYER_META.accessibility.color}
        >
          {access.isLoading ? (
            <AppText color={colors.textSecondary}>Loading…</AppText>
          ) : access.isError ? (
            <AppText color={colors.error}>Couldn’t load accessibility information.</AppText>
          ) : features.length === 0 ? (
            // Never imply the building has no features just because none are recorded (design doc §9.2).
            <AppText color={colors.textSecondary}>
              No accessibility information recorded yet.
            </AppText>
          ) : (
            features.map((f) => {
              const meta = ACCESSIBILITY_FEATURE_META[f.feature_type];
              return (
                <View key={f.id} style={styles.item}>
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={22}
                    color={LAYER_META.accessibility.color}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="labelLg">
                      {meta.label}
                      {f.floor ? ` · Floor ${f.floor}` : ''}
                    </AppText>
                    {f.description && (
                      <AppText color={colors.textSecondary}>{f.description}</AppText>
                    )}
                    <AppText
                      variant="bodySm"
                      color={f.verified_at ? colors.success : colors.warning}
                    >
                      {f.verified_at
                        ? `Verified in person ${f.verified_at}`
                        : 'Not yet verified in person'}
                    </AppText>
                  </View>
                </View>
              );
            })
          )}
        </Section>

        <Section title="Printers" icon={LAYER_META.printers.icon} color={LAYER_META.printers.color}>
          {buildingPrinters.length === 0 ? (
            <AppText color={colors.textSecondary}>No WEPA kiosk listed in this building.</AppText>
          ) : (
            buildingPrinters.map((p) => (
              <View key={p.id} style={styles.item}>
                <MaterialCommunityIcons
                  name="printer-outline"
                  size={22}
                  color={LAYER_META.printers.color}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="labelLg">
                    {p.floor_note ? `WEPA kiosk · ${p.floor_note}` : 'WEPA kiosk'}
                  </AppText>
                  {p.notes && <AppText color={colors.textSecondary}>{p.notes}</AppText>}
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title="Dining" icon={LAYER_META.dining.icon} color={LAYER_META.dining.color}>
          {buildingDining.length === 0 ? (
            <AppText color={colors.textSecondary}>No dining listed in this building.</AppText>
          ) : (
            buildingDining.map((d) => {
              const open = getOpenState(d.hours);
              return (
                <View key={d.id} style={styles.item}>
                  <MaterialCommunityIcons
                    name="silverware-fork-knife"
                    size={22}
                    color={LAYER_META.dining.color}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="labelLg">{d.name}</AppText>
                    <AppText color={open === 'open' ? colors.success : colors.textSecondary}>
                      {open === 'open'
                        ? 'Open now'
                        : open === 'closed'
                          ? 'Closed now'
                          : 'Hours not recorded'}
                      {d.cuisine_type ? ` · ${d.cuisine_type}` : ''}
                    </AppText>
                  </View>
                  {d.menu_url && (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${d.name} menu`}
                      onPress={() => WebBrowser.openBrowserAsync(d.menu_url!)}
                      style={styles.link}
                    >
                      <AppText variant="labelLg" color={colors.crimsonBright}>
                        Menu
                      </AppText>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </Section>

        {/* TODO(team): Tier 2 — study spaces section (design doc §2, T2.2). */}
      </ScrollView>
    </SafeAreaView>
  );
}

function HoursLine({ hours }: { hours: WeeklyHours | null }) {
  if (!hours) {
    return (
      <Row icon="clock-outline" color={colors.textSecondary}>
        <AppText color={colors.textSecondary}>Hours not recorded</AppText>
      </Row>
    );
  }
  const open = getOpenState(hours);
  const today = formatTodayHours(hours);
  return (
    <Row icon="clock-outline" color={open === 'open' ? colors.success : colors.textSecondary}>
      <AppText color={open === 'open' ? colors.success : colors.textSecondary}>
        {open === 'open' ? 'Open now' : open === 'closed' ? 'Closed now' : 'Hours unknown today'}
        {today ? ` · ${today}` : ''}
      </AppText>
      <AppText variant="bodySm" color={colors.textSecondary}>
        {DAY_KEYS.filter((d) => hours[d]).length < 7 ? 'Some days not recorded' : ''}
      </AppText>
    </Row>
  );
}

function Row({ icon, color, children }: { icon: IconName; color: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: IconName;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
        <AppText variant="titleMd" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg },
  photo: { height: 180, borderRadius: radius.lg, backgroundColor: colors.surface },
  titleBlock: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  sectionBody: { gap: space.md },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  link: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
});
