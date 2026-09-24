import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CAMPUS_CENTER,
  isWithinCampus,
  type LatLng,
  type ReportCategory,
} from '@ou-campus-map/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CampusMap } from '@/components/map/CampusMap';
import { EmptyState, LoadingState } from '@/components/StateView';
import { REPORT_CATEGORY_LIST, REPORT_CATEGORY_META, formatTtl } from '@/constants/categories';
import { colors, fonts, radius, space } from '@/constants/theme';
import { queryKeys, useBuildings } from '@/hooks/useCampusData';
import { useUserLocation } from '@/hooks/useUserLocation';
import { api } from '@/lib/api';
import { distanceMeters } from '@/lib/geo';
import { useAuth } from '@/providers/AuthProvider';

const NEAREST_BUILDING_MAX_M = 150; // matches the API's association radius

export default function NewReportScreen() {
  const { session, ready, available } = useAuth();

  if (!available) {
    return (
      <EmptyState
        icon="account-lock-outline"
        title="Reporting needs an account"
        body="This build isn't connected to Supabase, so accounts and reports are unavailable. See the README to configure it."
      />
    );
  }
  if (!ready) return <LoadingState />;
  // Requires sign-in; come back here afterwards (design doc §9.2).
  if (!session)
    return <Redirect href={{ pathname: '/auth/sign-in', params: { redirect: '/report/new' } }} />;
  return <ReportForm />;
}

function ReportForm() {
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const { location } = useUserLocation({ request: true });
  const buildings = useBuildings();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // The pin defaults to the user's GPS position (if on campus) until they drag it.
  const [draggedPin, setDraggedPin] = useState<LatLng | null>(null);
  const gpsPin = location && isWithinCampus(location) ? location : null;
  const pin: LatLng = draggedPin ?? gpsPin ?? CAMPUS_CENTER;

  useEffect(() => {
    if (draggedPin || !gpsPin) return;
    mapRef.current?.animateToRegion(
      { latitude: gpsPin.lat, longitude: gpsPin.lng, latitudeDelta: 0.003, longitudeDelta: 0.003 },
      300,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsPin?.lat, gpsPin?.lng]);

  const nearest = useMemo(() => {
    if (!buildings.data?.length) return null;
    let best: { name: string; id: string; d: number } | null = null;
    for (const b of buildings.data) {
      const d = distanceMeters(pin, b);
      if (!best || d < best.d) best = { name: b.name, id: b.id, d };
    }
    return best && best.d <= NEAREST_BUILDING_MAX_M ? best : null;
  }, [pin, buildings.data]);

  const submit = useMutation({
    mutationFn: () =>
      api.createReport({
        category: category!,
        title: title.trim(),
        description: description.trim() || undefined,
        lat: pin.lat,
        lng: pin.lng,
        buildingId: nearest?.id,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      if (res.categoryChangedFrom) {
        Alert.alert(
          'Report posted',
          `We filed this under “${REPORT_CATEGORY_META[res.report.category].label}” because it looked like a better fit.`,
        );
      }
      router.back();
    },
    onError: (err) =>
      Alert.alert('Report not posted', err instanceof Error ? err.message : 'Try again.'),
  });

  const titleOk = title.trim().length >= 3;
  const pinOk = isWithinCampus(pin);
  const canSubmit = !!category && titleOk && pinOk && !submit.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="bodyMd" color={colors.textSecondary}>
          Keep fellow Sooners updated in real time across Norman campus.
        </AppText>

        <AppText variant="titleMd" accessibilityRole="header">
          What’s happening?
        </AppText>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {REPORT_CATEGORY_LIST.map((c) => {
            const selected = category === c.key;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={c.label}
                onPress={() => setCategory(c.key)}
                style={[
                  styles.tile,
                  selected && { borderColor: c.color, backgroundColor: colors.surfaceElevated },
                ]}
              >
                <View style={[styles.tileIcon, { backgroundColor: `${c.color}33` }]}>
                  <MaterialCommunityIcons name={c.icon} size={28} color={c.color} />
                </View>
                <AppText
                  variant="labelMd"
                  color={selected ? colors.textPrimary : colors.textSecondary}
                  style={styles.tileLabel}
                >
                  {c.label}
                </AppText>
                {selected && (
                  <View style={[styles.check, { backgroundColor: c.color }]}>
                    <MaterialCommunityIcons name="check" size={14} color={colors.background} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <AppText variant="titleMd" accessibilityRole="header">
          Where?
        </AppText>
        <View style={styles.mapBox}>
          <CampusMap
            ref={mapRef}
            initialRegion={{
              latitude: pin.lat,
              longitude: pin.lng,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
          >
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              pinColor={colors.crimsonBright}
              onDragEnd={(e) =>
                setDraggedPin({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })
              }
              accessibilityLabel="Report location. Press and drag to adjust."
            />
          </CampusMap>
        </View>
        <AppText variant="bodySm" color={pinOk ? colors.textSecondary : colors.error}>
          {!pinOk
            ? 'Move the pin onto the Norman campus.'
            : nearest
              ? `Near ${nearest.name} · press and drag the pin to adjust`
              : 'Press and drag the pin to adjust'}
        </AppText>

        <AppText variant="titleMd" accessibilityRole="header">
          Details
        </AppText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Short title, e.g. “North elevator out of service”"
          placeholderTextColor={colors.textSecondary}
          maxLength={100}
          style={styles.input}
          accessibilityLabel="Report title (required)"
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Anything else people should know? (optional)"
          placeholderTextColor={colors.textSecondary}
          maxLength={500}
          multiline
          style={[styles.input, styles.multiline]}
          accessibilityLabel="Report description (optional)"
        />
        <AppText variant="bodySm" color={colors.textSecondary} style={{ alignSelf: 'flex-end' }}>
          {description.length}/500
        </AppText>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button
          label="Submit report"
          icon="send"
          disabled={!canSubmit}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
        <View style={styles.expiry}>
          <MaterialCommunityIcons name="timer-sand" size={16} color={colors.warning} />
          <AppText variant="bodySm" color={colors.textSecondary}>
            {category
              ? `This will disappear in ${formatTtl(category)} unless it's removed sooner.`
              : 'Reports expire automatically — pick a category to see when.'}
          </AppText>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '31.5%',
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { textAlign: 'center' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBox: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 48,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  footer: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  expiry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
