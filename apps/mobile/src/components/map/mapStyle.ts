import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps (Android) dark style matched to the app palette. iOS uses Apple Maps with
 * userInterfaceStyle="dark" instead. Business POIs are hidden — our own layers replace them.
 */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#16191b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9196' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#101214' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#172419' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.school', elementType: 'geometry', stylers: [{ color: '#1c1f22' }] },
  { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#23272a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2e31' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1d1f' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#383d40' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1a24' }] },
];
