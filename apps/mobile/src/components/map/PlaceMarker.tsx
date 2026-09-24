import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { IconName } from '@/constants/categories';
import { colors } from '@/constants/theme';

interface Props {
  id: string;
  lat: number;
  lng: number;
  color: string;
  icon?: IconName;
  title: string;
  selected?: boolean;
  /** Small dot for dense layers (buildings); full pin otherwise. */
  compact?: boolean;
  onPress?: () => void;
}

/** Colored circle marker. tracksViewChanges is off after first render for performance. */
export const PlaceMarker = memo(function PlaceMarker({
  lat,
  lng,
  color,
  icon,
  title,
  selected,
  compact,
  onPress,
}: Props) {
  const size = compact ? (selected ? 18 : 12) : selected ? 34 : 26;
  return (
    <Marker
      // tracksViewChanges={false} freezes the marker bitmap, so remount when selection changes.
      key={selected ? 'selected' : 'idle'}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
      accessibilityLabel={title}
      zIndex={selected ? 10 : compact ? 1 : 2}
    >
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: compact ? color : colors.surfaceElevated,
            borderColor: selected ? colors.cream : compact ? colors.background : color,
          },
        ]}
      >
        {!compact && icon && (
          <MaterialCommunityIcons name={icon} size={size * 0.55} color={color} />
        )}
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
