import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  formatTodayHours,
  getOpenState,
  type AccessibilityFeature,
  type Building,
  type DiningLocation,
  type Printer,
  type Report,
} from '@ou-campus-map/shared-types';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DemoBanner } from '@/components/DemoBanner';
import { IconButton } from '@/components/IconButton';
import { CampusMap } from '@/components/map/CampusMap';
import { PlaceMarker } from '@/components/map/PlaceMarker';
import { PeekSheet, type StatTile } from '@/components/PeekSheet';
import {
  ACCESSIBILITY_FEATURE_META,
  type IconName,
  LAYER_KEYS,
  LAYER_META,
  REPORT_CATEGORY_META,
} from '@/constants/categories';
import { colors, elevation, radius, space } from '@/constants/theme';
import {
  useAccessibility,
  useActiveReports,
  useBuildings,
  useDining,
  usePrinters,
} from '@/hooks/useCampusData';
import { useLayerPrefs } from '@/hooks/useLayerPrefs';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  distanceMeters,
  estimateWalkSeconds,
  formatDistance,
  formatDuration,
  timeUntil,
} from '@/lib/geo';
import { searchBuildings } from '@/lib/search';

type Selection =
  | { type: 'building'; item: Building }
  | { type: 'dining'; item: DiningLocation }
  | { type: 'printer'; item: Printer }
  | { type: 'accessibility'; item: AccessibilityFeature }
  | { type: 'report'; item: Report };

// Printers and building-wide accessibility features sit on their building's centroid.
// Nudge them visually (data stays exact) so they don't hide under the building dot.
const NUDGE = { printer: [0.00009, 0.00009], accessibility: [-0.00009, 0.00009] } as const;

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ focusType?: string; focusId?: string; t?: string }>();
  const { layers, toggle } = useLayerPrefs();
  const { location, permission, refresh } = useUserLocation();

  const buildings = useBuildings();
  const dining = useDining();
  const printers = usePrinters();
  const accessibility = useAccessibility();
  const reports = useActiveReports();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const buildingsById = useMemo(
    () => new Map((buildings.data ?? []).map((b) => [b.id, b])),
    [buildings.data],
  );
  const results = useMemo(
    () => searchBuildings(buildings.data ?? [], query),
    [buildings.data, query],
  );

  const focus = (lat: number, lng: number) =>
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 },
      400,
    );

  const select = (next: Selection) => setSelection(next);

  // Move the camera whenever the selection changes (the map is an external system).
  useEffect(() => {
    if (!selection) return;
    const { lat, lng } = coordsOf(selection, buildingsById);
    if (lat != null && lng != null) focus(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  // Deep links from the assistant's place chips: /?focusType=printer&focusId=…&t=…
  // Adjusts state during render when the params change (react.dev "you might not need an effect").
  const focusKey =
    params.focusType && params.focusId
      ? `${params.focusType}:${params.focusId}:${params.t ?? ''}`
      : null;
  const [handledFocusKey, setHandledFocusKey] = useState<string | null>(null);
  if (focusKey && focusKey !== handledFocusKey) {
    const find = <T extends { id: string }>(rows: T[] | undefined) =>
      rows?.find((r) => r.id === params.focusId);
    const next =
      params.focusType === 'building'
        ? wrap('building', find(buildings.data))
        : params.focusType === 'dining'
          ? wrap('dining', find(dining.data))
          : params.focusType === 'printer'
            ? wrap('printer', find(printers.data))
            : params.focusType === 'report'
              ? wrap('report', find(reports.data))
              : null;
    // Wait until the data has loaded before consuming the deep link.
    if (next) {
      setHandledFocusKey(focusKey);
      setSelection(next);
    }
  }

  const locateMe = async () => {
    const here = location ?? (await refresh());
    if (here) focus(here.lat, here.lng);
  };

  const loadError = buildings.isError || dining.isError || printers.isError;

  return (
    <View style={styles.screen}>
      <CampusMap
        ref={mapRef}
        showsUserLocation={permission === 'granted'}
        onPress={() => {
          setSelection(null);
          Keyboard.dismiss();
        }}
      >
        {layers.buildings &&
          buildings.data?.map((b) => (
            <PlaceMarker
              key={b.id}
              id={b.id}
              lat={b.lat}
              lng={b.lng}
              compact
              color={LAYER_META.buildings.color}
              title={b.name}
              selected={selection?.type === 'building' && selection.item.id === b.id}
              onPress={() => select({ type: 'building', item: b })}
            />
          ))}
        {layers.dining &&
          dining.data?.map((d) => (
            <PlaceMarker
              key={d.id}
              id={d.id}
              lat={d.lat}
              lng={d.lng}
              color={LAYER_META.dining.color}
              icon={LAYER_META.dining.icon}
              title={d.name}
              selected={selection?.type === 'dining' && selection.item.id === d.id}
              onPress={() => select({ type: 'dining', item: d })}
            />
          ))}
        {layers.printers &&
          printers.data?.map((p) => (
            <PlaceMarker
              key={p.id}
              id={p.id}
              lat={p.lat + NUDGE.printer[0]}
              lng={p.lng + NUDGE.printer[1]}
              color={LAYER_META.printers.color}
              icon={LAYER_META.printers.icon}
              title={`Printer: ${p.label}`}
              selected={selection?.type === 'printer' && selection.item.id === p.id}
              onPress={() => select({ type: 'printer', item: p })}
            />
          ))}
        {layers.accessibility &&
          accessibility.data?.map((a) => {
            const at = a.lat != null && a.lng != null ? a : buildingsById.get(a.building_id);
            if (!at || at.lat == null || at.lng == null) return null;
            const nudge = a.lat == null ? NUDGE.accessibility : [0, 0];
            return (
              <PlaceMarker
                key={a.id}
                id={a.id}
                lat={at.lat + nudge[0]!}
                lng={at.lng + nudge[1]!}
                color={LAYER_META.accessibility.color}
                icon={ACCESSIBILITY_FEATURE_META[a.feature_type].icon}
                title={ACCESSIBILITY_FEATURE_META[a.feature_type].label}
                selected={selection?.type === 'accessibility' && selection.item.id === a.id}
                onPress={() => select({ type: 'accessibility', item: a })}
              />
            );
          })}
        {layers.reports &&
          reports.data?.map((r) => (
            <PlaceMarker
              key={r.id}
              id={r.id}
              lat={r.lat}
              lng={r.lng}
              color={REPORT_CATEGORY_META[r.category].color}
              icon={REPORT_CATEGORY_META[r.category].icon}
              title={`${REPORT_CATEGORY_META[r.category].label}: ${r.title}`}
              selected={selection?.type === 'report' && selection.item.id === r.id}
              onPress={() => select({ type: 'report', item: r })}
            />
          ))}
      </CampusMap>

      {/* Top overlay: header, search, layer chips */}
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.headerBg}>
          <AppHeader subtitle="Campus map" />
        </View>
        <View style={styles.searchWrap}>
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search buildings, e.g. Devon, SEC, the Union"
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search buildings"
            />
            {query.length > 0 && (
              <IconButton
                icon="close-circle"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                size={36}
                background="transparent"
                color={colors.textSecondary}
              />
            )}
          </View>
          {query.length > 0 && (
            <View style={styles.results}>
              {results.length === 0 ? (
                <AppText color={colors.textSecondary} style={styles.resultRow}>
                  No buildings match “{query}”.
                </AppText>
              ) : (
                results.map((b) => (
                  <Pressable
                    key={b.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setQuery('');
                      select({ type: 'building', item: b });
                    }}
                  >
                    <MaterialCommunityIcons
                      name="office-building-outline"
                      size={20}
                      color={LAYER_META.buildings.color}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="labelLg">{b.name}</AppText>
                      {(b.abbreviation || b.aliases.length > 0) && (
                        <AppText variant="bodySm" color={colors.textSecondary} numberOfLines={1}>
                          {[b.abbreviation, ...b.aliases].filter(Boolean).join(' · ')}
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {LAYER_KEYS.map((k) => (
            <Chip
              key={k}
              label={LAYER_META[k].label}
              icon={LAYER_META[k].icon}
              color={LAYER_META[k].color}
              selected={layers[k]}
              onPress={() => toggle(k)}
              accessibilityHint={`${layers[k] ? 'Hides' : 'Shows'} ${LAYER_META[k].label.toLowerCase()} on the map`}
            />
          ))}
        </ScrollView>
        <View style={styles.banner}>
          <DemoBanner />
          {loadError && (
            <Pressable
              style={styles.errorPill}
              accessibilityRole="button"
              accessibilityHint="Retries loading map data"
              onPress={() => {
                buildings.refetch();
                dining.refetch();
                printers.refetch();
                accessibility.refetch();
              }}
            >
              <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.error} />
              <AppText variant="bodySm" color={colors.textPrimary} style={{ flex: 1 }}>
                Some map data couldn’t load. Tap to retry.
              </AppText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom overlay: floating controls + peek sheet */}
      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.fabs} pointerEvents="box-none">
          <IconButton
            icon="crosshairs-gps"
            accessibilityLabel={
              permission === 'denied'
                ? 'Location unavailable — permission denied'
                : 'Center map on my location'
            }
            onPress={locateMe}
            floating
            color={permission === 'denied' ? colors.textDisabled : colors.crimsonBright}
          />
          <IconButton
            icon="alert-plus"
            accessibilityLabel="Report a campus condition"
            onPress={() => router.push('/report/new')}
            floating
            size={56}
            background={colors.crimsonBright}
            color={colors.white}
          />
        </View>
        {selection && (
          <SelectionSheet
            selection={selection}
            buildingsById={buildingsById}
            printers={printers.data ?? []}
            dining={dining.data ?? []}
            accessibility={accessibility.data ?? []}
            reports={reports.data ?? []}
            userLocation={location}
            onClose={() => setSelection(null)}
          />
        )}
      </View>
    </View>
  );
}

function wrap<T extends Selection['type']>(
  type: T,
  item: Extract<Selection, { type: T }>['item'] | undefined,
) {
  return item ? ({ type, item } as Selection) : null;
}

function coordsOf(
  s: Selection,
  buildingsById: Map<string, Building>,
): { lat?: number | null; lng?: number | null } {
  if (s.type === 'accessibility' && s.item.lat == null)
    return buildingsById.get(s.item.building_id) ?? {};
  return s.item;
}

interface SheetProps {
  selection: Selection;
  buildingsById: Map<string, Building>;
  printers: Printer[];
  dining: DiningLocation[];
  accessibility: AccessibilityFeature[];
  reports: Report[];
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

function SelectionSheet({
  selection,
  buildingsById,
  printers,
  dining,
  accessibility,
  reports,
  userLocation,
  onClose,
}: SheetProps) {
  const target = coordsOf(selection, buildingsById);
  const hasTarget = target.lat != null && target.lng != null;
  const dist =
    userLocation && hasTarget
      ? distanceMeters(userLocation, { lat: target.lat!, lng: target.lng! })
      : null;

  const directions = hasTarget && (
    <Button
      label={
        dist != null
          ? `Navigate (~${formatDuration(estimateWalkSeconds(dist * 1.3))})`
          : 'Directions'
      }
      icon="walk"
      style={{ flex: 1 }}
      onPress={() =>
        router.push({
          pathname: '/directions',
          params: {
            toLat: String(target.lat),
            toLng: String(target.lng),
            toName: titleOf(selection, buildingsById),
          },
        })
      }
    />
  );

  const buildingId =
    selection.type === 'building'
      ? selection.item.id
      : selection.type === 'report'
        ? selection.item.building_id
        : selection.item.building_id;
  const details = buildingId && buildingsById.has(buildingId) && (
    <Button
      label="Details"
      variant="secondary"
      icon="information-outline"
      onPress={() => router.push({ pathname: '/building/[id]', params: { id: buildingId } })}
    />
  );

  const distanceText = dist != null ? `${formatDistance(dist)} away` : null;
  const meta: ReactNode[] = [];
  let tiles: StatTile[] = [];
  let titleIcon: { name: IconName; color: string } | undefined;

  switch (selection.type) {
    case 'building': {
      const b = selection.item;
      const inside = (id: string | null) => id === b.id;
      const nPrinters = printers.filter((p) => inside(p.building_id)).length;
      const nDining = dining.filter((d) => inside(d.building_id)).length;
      const nAccess = accessibility.filter((a) => a.building_id === b.id).length;
      const nReports = reports.filter((r) => inside(r.building_id)).length;
      const open = getOpenState(b.hours);
      meta.push(
        <MetaLine
          key="m"
          parts={[
            b.abbreviation,
            open !== 'unknown' ? (open === 'open' ? 'Open now' : 'Closed now') : null,
            distanceText,
          ]}
        />,
      );
      tiles = [
        {
          icon: LAYER_META.printers.icon,
          color: LAYER_META.printers.color,
          label: 'WEPA',
          value: nPrinters ? `${nPrinters} kiosk${nPrinters > 1 ? 's' : ''}` : 'None',
        },
        {
          icon: LAYER_META.accessibility.icon,
          color: LAYER_META.accessibility.color,
          label: 'Access',
          value: nAccess ? `${nAccess} recorded` : 'Not recorded',
        },
        nReports
          ? { icon: 'alert', color: colors.warning, label: 'Reports', value: `${nReports} active` }
          : {
              icon: LAYER_META.dining.icon,
              color: LAYER_META.dining.color,
              label: 'Dining',
              value: nDining ? `${nDining} here` : 'None',
            },
      ];
      break;
    }
    case 'dining': {
      const d = selection.item;
      const open = getOpenState(d.hours);
      const today = formatTodayHours(d.hours);
      titleIcon = { name: LAYER_META.dining.icon, color: LAYER_META.dining.color };
      meta.push(
        <AppText
          key="o"
          variant="labelLg"
          color={
            open === 'open'
              ? colors.success
              : open === 'closed'
                ? colors.error
                : colors.textSecondary
          }
        >
          {open === 'open' ? 'Open now' : open === 'closed' ? 'Closed now' : 'Hours not recorded'}
          {today && open !== 'unknown' ? ` · ${today}` : ''}
        </AppText>,
        <MetaLine
          key="m"
          parts={[
            d.cuisine_type,
            d.building_id ? buildingsById.get(d.building_id)?.name : null,
            distanceText,
          ]}
        />,
      );
      if (d.accepts_meal_plan != null) {
        meta.push(
          <MetaLine
            key="mp"
            parts={[d.accepts_meal_plan ? 'Accepts meal plans' : 'Meal plans not accepted']}
          />,
        );
      }
      break;
    }
    case 'printer': {
      const p = selection.item;
      titleIcon = { name: LAYER_META.printers.icon, color: LAYER_META.printers.color };
      meta.push(<MetaLine key="m" parts={['WEPA kiosk', p.floor_note, distanceText]} />);
      if (p.notes) meta.push(<MetaLine key="n" parts={[p.notes]} />);
      break;
    }
    case 'accessibility': {
      const a = selection.item;
      titleIcon = {
        name: ACCESSIBILITY_FEATURE_META[a.feature_type].icon,
        color: LAYER_META.accessibility.color,
      };
      meta.push(
        <MetaLine
          key="b"
          parts={[buildingsById.get(a.building_id)?.name, a.floor ? `Floor ${a.floor}` : null]}
        />,
        a.description ? <MetaLine key="d" parts={[a.description]} /> : null,
        <AppText key="v" variant="bodySm" color={a.verified_at ? colors.success : colors.warning}>
          {a.verified_at ? `Verified in person ${a.verified_at}` : 'Not yet verified in person'}
        </AppText>,
      );
      break;
    }
    case 'report': {
      const r = selection.item;
      const cat = REPORT_CATEGORY_META[r.category];
      titleIcon = { name: cat.icon, color: cat.color };
      meta.push(
        <AppText key="c" variant="labelSm" color={cat.color} uppercase>
          {cat.label}
        </AppText>,
        r.description ? <MetaLine key="d" parts={[r.description]} /> : null,
        <MetaLine
          key="t"
          parts={[
            `Expires in ${timeUntil(r.expires_at)}`,
            `Score ${r.upvotes - r.downvotes}`,
            distanceText,
          ]}
        />,
      );
      break;
    }
  }

  return (
    <PeekSheet
      title={titleOf(selection, buildingsById)}
      titleIcon={titleIcon}
      meta={meta}
      tiles={tiles}
      onClose={onClose}
      actions={
        <>
          {directions}
          {details}
        </>
      }
    />
  );
}

function titleOf(s: Selection, buildingsById: Map<string, Building>): string {
  switch (s.type) {
    case 'building':
    case 'dining':
      return s.item.name;
    case 'printer':
      return s.item.label;
    case 'report':
      return s.item.title;
    case 'accessibility':
      return (
        ACCESSIBILITY_FEATURE_META[s.item.feature_type].label +
        (buildingsById.get(s.item.building_id)
          ? ` — ${buildingsById.get(s.item.building_id)!.name}`
          : '')
      );
  }
}

function MetaLine({ parts }: { parts: (string | null | undefined)[] }) {
  const text = parts.filter(Boolean).join(' · ');
  if (!text) return null;
  return (
    <AppText variant="bodyMd" color={colors.textSecondary}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: space.sm },
  headerBg: {
    backgroundColor: 'rgba(16, 18, 20, 0.92)',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  searchWrap: { paddingHorizontal: space.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingLeft: space.md,
    paddingRight: space.xs,
    minHeight: 50,
    ...elevation.level2,
  },
  searchFocused: {
    borderColor: colors.crimsonBright,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceElevated,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    paddingVertical: space.sm,
  },
  results: {
    marginTop: space.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...elevation.level3,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: 48,
  },
  chips: { paddingHorizontal: space.lg, gap: space.sm },
  banner: { paddingHorizontal: space.lg, gap: space.sm },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
    borderColor: colors.error,
    borderWidth: 1,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, gap: space.lg },
  fabs: { alignSelf: 'flex-end', alignItems: 'center', gap: space.sm },
});
