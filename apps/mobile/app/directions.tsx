import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Building, LatLng } from '@ou-campus-map/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type MapView from 'react-native-maps';
import { Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CampusMap } from '@/components/map/CampusMap';
import { PlaceMarker } from '@/components/map/PlaceMarker';
import { REPORT_CATEGORY_META } from '@/constants/categories';
import { colors, elevation, radius, space } from '@/constants/theme';
import { useActiveReports, useBuildings } from '@/hooks/useCampusData';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatDistance, formatDuration, isNearPath } from '@/lib/geo';
import { getWalkingRoute } from '@/lib/mapbox';
import { searchBuildings } from '@/lib/search';

/** Reports within this distance of the route are flagged. */
const REPORT_NEAR_ROUTE_M = 30;

export default function DirectionsScreen() {
  const params = useLocalSearchParams<{ toLat: string; toLng: string; toName: string }>();
  const to: LatLng | null =
    params.toLat && params.toLng ? { lat: Number(params.toLat), lng: Number(params.toLng) } : null;

  const mapRef = useRef<MapView>(null);
  const { location, permission } = useUserLocation({ request: true });
  const buildings = useBuildings();
  const reports = useActiveReports();

  // "From" defaults to current location; the user can pick a building instead.
  const [fromBuilding, setFromBuilding] = useState<Building | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const from: LatLng | null = fromBuilding ?? location;
  const fromLabel = fromBuilding?.name ?? (location ? 'Your location' : null);

  const route = useQuery({
    queryKey: ['route', from?.lat, from?.lng, to?.lat, to?.lng],
    queryFn: () => getWalkingRoute(from!, to!),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (route.data && route.data.coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(
        route.data.coordinates.map((c) => ({ latitude: c.lat, longitude: c.lng })),
        { edgePadding: { top: 160, bottom: 260, left: 60, right: 60 }, animated: true },
      );
    }
  }, [route.data]);

  const affected = useMemo(() => {
    if (!route.data) return [];
    return (reports.data ?? []).filter((r) =>
      isNearPath(r, route.data.coordinates, REPORT_NEAR_ROUTE_M),
    );
  }, [route.data, reports.data]);

  const results = searchBuildings(buildings.data ?? [], query, 5);

  if (!to) {
    return (
      <View style={styles.center}>
        <AppText>No destination selected.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CampusMap ref={mapRef} showsUserLocation={permission === 'granted'}>
        {from && fromBuilding && (
          <PlaceMarker
            id="from"
            lat={from.lat}
            lng={from.lng}
            color={colors.info}
            icon="circle-slice-8"
            title="Start"
          />
        )}
        <PlaceMarker
          id="to"
          lat={to.lat}
          lng={to.lng}
          color={colors.crimsonBright}
          icon="flag-checkered"
          title={params.toName ?? 'Destination'}
          selected
        />
        {route.data && (
          <Polyline
            coordinates={route.data.coordinates.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
            strokeColor={colors.crimsonBright}
            strokeWidth={5}
            lineDashPattern={route.data.routed ? undefined : [8, 8]}
          />
        )}
        {affected.map((r) => (
          <PlaceMarker
            key={r.id}
            id={r.id}
            lat={r.lat}
            lng={r.lng}
            color={REPORT_CATEGORY_META[r.category].color}
            icon={REPORT_CATEGORY_META[r.category].icon}
            title={r.title}
          />
        ))}
      </CampusMap>

      {/* From / To card */}
      <SafeAreaView edges={[]} style={styles.top} pointerEvents="box-none">
        <View style={[styles.card, elevation.level2]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Starting point: ${fromLabel ?? 'not set'}. Tap to change.`}
            onPress={() => setPicking((p) => !p)}
            style={styles.endpoint}
          >
            <MaterialCommunityIcons name="circle-slice-8" size={18} color={colors.info} />
            <AppText
              variant="labelLg"
              color={fromLabel ? colors.textPrimary : colors.textSecondary}
              style={{ flex: 1 }}
            >
              {fromLabel ??
                (permission === 'denied' ? 'Choose a starting building' : 'Finding your location…')}
            </AppText>
            <AppText variant="labelMd" color={colors.crimsonBright}>
              Change
            </AppText>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.endpoint}>
            <MaterialCommunityIcons name="flag-checkered" size={18} color={colors.crimsonBright} />
            <AppText variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>
              {params.toName ?? 'Destination'}
            </AppText>
          </View>
        </View>

        {(picking || (!location && permission === 'denied' && !fromBuilding)) && (
          <View style={[styles.card, elevation.level2]}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus={picking}
              placeholder="Start from a building…"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              accessibilityLabel="Search for a starting building"
            />
            {location && (
              <Pressable
                style={styles.result}
                onPress={() => {
                  setFromBuilding(null);
                  setPicking(false);
                }}
              >
                <AppText variant="labelLg">Use my location</AppText>
              </Pressable>
            )}
            {results.map((b) => (
              <Pressable
                key={b.id}
                style={styles.result}
                accessibilityRole="button"
                onPress={() => {
                  setFromBuilding(b);
                  setPicking(false);
                  setQuery('');
                }}
              >
                <AppText variant="labelLg">{b.name}</AppText>
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>

      {/* Summary */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <View style={[styles.card, styles.summary, elevation.level3]}>
          {!from ? (
            <AppText color={colors.textSecondary}>
              {permission === 'denied'
                ? 'Location permission is off. Pick a starting building above to get directions.'
                : 'Waiting for your location…'}
            </AppText>
          ) : route.isLoading ? (
            <View style={styles.rowCenter}>
              <ActivityIndicator color={colors.crimsonBright} />
              <AppText color={colors.textSecondary}>Finding a walking route…</AppText>
            </View>
          ) : route.isError ? (
            <View style={{ gap: space.sm }}>
              <AppText color={colors.error}>Couldn’t get walking directions right now.</AppText>
              <Button label="Try again" variant="secondary" onPress={() => route.refetch()} />
            </View>
          ) : route.data ? (
            <View style={{ gap: space.sm }}>
              <View style={styles.rowCenter}>
                <MaterialCommunityIcons name="walk" size={28} color={colors.crimsonBright} />
                <AppText variant="headlineMd">{formatDuration(route.data.durationSeconds)}</AppText>
                <AppText variant="bodyLg" color={colors.cream}>
                  {formatDistance(route.data.distanceMeters)}
                </AppText>
              </View>
              {!route.data.routed && (
                <AppText variant="bodySm" color={colors.warning}>
                  Estimate only — walking routes need a Mapbox token
                  (EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN). The dashed line is not a path.
                </AppText>
              )}
              {affected.length > 0 && (
                <View style={styles.warning} accessibilityRole="alert">
                  <MaterialCommunityIcons name="alert" size={18} color={colors.warning} />
                  <AppText variant="bodyMd" style={{ flex: 1 }}>
                    {affected.length === 1
                      ? `Active report on this route: ${affected[0]!.title}`
                      : `${affected.length} active reports on this route.`}
                  </AppText>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: space.md, left: space.lg, right: space.lg, gap: space.sm },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
  summary: { padding: space.lg },
  endpoint: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 30 },
  input: {
    color: colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    minHeight: 44,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  result: { minHeight: 44, justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderRadius: radius.md,
    padding: space.sm,
  },
});
