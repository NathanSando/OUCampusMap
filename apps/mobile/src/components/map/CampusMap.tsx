import { CAMPUS_BOUNDS, CAMPUS_CENTER } from '@ou-campus-map/shared-types';
import { forwardRef, useCallback, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type EdgePadding, type Region } from 'react-native-maps';

import { darkMapStyle } from './mapStyle';

export const INITIAL_REGION: Region = {
  latitude: CAMPUS_CENTER.lat,
  longitude: CAMPUS_CENTER.lng,
  latitudeDelta: 0.014,
  longitudeDelta: 0.012,
};

/** Keep the camera centre inside the Norman campus so nobody scrolls to Kansas (design doc §9.2). */
function clampToCampus(region: Region): Region | null {
  const lat = Math.min(CAMPUS_BOUNDS.north, Math.max(CAMPUS_BOUNDS.south, region.latitude));
  const lng = Math.min(CAMPUS_BOUNDS.east, Math.max(CAMPUS_BOUNDS.west, region.longitude));
  if (lat === region.latitude && lng === region.longitude) return null;
  return { ...region, latitude: lat, longitude: lng };
}

interface Props {
  children?: ReactNode;
  showsUserLocation?: boolean;
  mapPadding?: EdgePadding;
  onPress?: () => void;
  initialRegion?: Region;
}

/** Dark, campus-bounded map used by every map screen. */
export const CampusMap = forwardRef<MapView, Props>(function CampusMap(
  { children, showsUserLocation, mapPadding, onPress, initialRegion = INITIAL_REGION },
  ref,
) {
  const handleRegionChange = useCallback(
    (region: Region) => {
      const clamped = clampToCampus(region);
      if (clamped && ref && typeof ref !== 'function') ref.current?.animateToRegion(clamped, 250);
    },
    [ref],
  );

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      customMapStyle={darkMapStyle}
      userInterfaceStyle="dark"
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
      minZoomLevel={14}
      maxZoomLevel={20}
      mapPadding={mapPadding}
      onRegionChangeComplete={handleRegionChange}
      onPress={onPress}
      accessibilityLabel="Map of the University of Oklahoma Norman campus"
    >
      {children}
    </MapView>
  );
});
