/**
 * Web stand-in for react-native-maps, which only ships native (iOS/Android) views.
 * metro.config.js swaps it in for web bundles only. It draws OpenStreetMap raster tiles (darkened with CSS)
 * and supports the subset of the API the app uses: MapView (pan, wheel zoom,
 * animateToRegion, fitToCoordinates), Marker (custom children, press, drag) and Polyline.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';

export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };
export type EdgePadding = { top: number; right: number; bottom: number; left: number };
export type MapStyleElement = Record<string, unknown>;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

const TILE = 256;
const MAX_TILE_ZOOM = 19;
const TILE_URL = 'https://tile.openstreetmap.org';
// Turns the light OSM style into a dark map that matches the app theme.
const DARK_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(0.85) saturate(0.6)';

// Web Mercator in world units: x and y both run 0..1 across the whole map.
const toWorldX = (lng: number) => (lng + 180) / 360;
const toWorldY = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const toLng = (x: number) => x * 360 - 180;
const toLat = (y: number) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y));

type Size = { width: number; height: number };
type Camera = { x: number; y: number; zoom: number };

function cameraForSpan(
  center: { x: number; y: number },
  spanX: number,
  spanY: number,
  size: Size,
): Camera {
  const zx = Math.log2(size.width / (TILE * Math.max(spanX, 1e-9)));
  const zy = Math.log2(size.height / (TILE * Math.max(spanY, 1e-9)));
  return { ...center, zoom: Math.min(zx, zy) };
}

function cameraForRegion(region: Region, size: Size): Camera {
  const top = toWorldY(region.latitude + region.latitudeDelta / 2);
  const bottom = toWorldY(region.latitude - region.latitudeDelta / 2);
  return cameraForSpan(
    { x: toWorldX(region.longitude), y: toWorldY(region.latitude) },
    region.longitudeDelta / 360,
    Math.abs(bottom - top),
    size,
  );
}

function regionForCamera(cam: Camera, size: Size): Region {
  const scale = TILE * 2 ** cam.zoom;
  const halfH = size.height / 2 / scale;
  return {
    latitude: toLat(cam.y),
    longitude: toLng(cam.x),
    latitudeDelta: Math.abs(toLat(cam.y - halfH) - toLat(cam.y + halfH)),
    longitudeDelta: (size.width / scale) * 360,
  };
}

interface MapContextValue {
  project: (c: LatLng) => { x: number; y: number };
  unproject: (x: number, y: number) => LatLng;
  container: HTMLDivElement | null;
  size: Size;
}

const MapContext = createContext<MapContextValue | null>(null);

export interface MapViewHandle {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coords: LatLng[],
    options?: { edgePadding?: Partial<EdgePadding>; animated?: boolean },
  ) => void;
}

interface MapViewProps {
  children?: ReactNode;
  style?: unknown;
  initialRegion?: Region;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  onPress?: (e: unknown) => void;
  onRegionChangeComplete?: (region: Region) => void;
  accessibilityLabel?: string;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    children,
    initialRegion,
    minZoomLevel = 0,
    maxZoomLevel = MAX_TILE_ZOOM,
    onPress,
    onRegionChangeComplete,
    accessibilityLabel,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [cam, setCam] = useState<Camera | null>(null);
  // Camera requests that arrive before the first measurement.
  const pending = useRef<(s: Size) => Camera>(null);
  const panStart = useRef<{ px: number; py: number; cam: Camera; moved: boolean } | null>(null);

  const clampZoom = useCallback(
    (c: Camera): Camera => ({
      x: c.x,
      y: Math.min(1, Math.max(0, c.y)),
      zoom: Math.min(maxZoomLevel, Math.max(minZoomLevel, c.zoom)),
    }),
    [minZoomLevel, maxZoomLevel],
  );

  const apply = useCallback(
    (make: (s: Size) => Camera) => {
      if (size) setCam(clampZoom(make(size)));
      else pending.current = make;
    },
    [size, clampZoom],
  );

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (region) => apply((s) => cameraForRegion(region, s)),
      fitToCoordinates: (coords, options) => {
        if (!coords.length) return;
        const pad = { top: 0, right: 0, bottom: 0, left: 0, ...options?.edgePadding };
        apply((s) => {
          const xs = coords.map((c) => toWorldX(c.longitude));
          const ys = coords.map((c) => toWorldY(c.latitude));
          const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
          const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
          const avail = {
            width: Math.max(80, s.width - pad.left - pad.right),
            height: Math.max(80, s.height - pad.top - pad.bottom),
          };
          const fit = cameraForSpan(
            { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
            maxX - minX,
            maxY - minY,
            avail,
          );
          // Shift the camera so the route centres in the padded area, not the whole view.
          const scale = TILE * 2 ** fit.zoom;
          return {
            ...fit,
            x: fit.x + (pad.right - pad.left) / 2 / scale,
            y: fit.y + (pad.bottom - pad.top) / 2 / scale,
          };
        });
      },
    }),
    [apply],
  );

  const onLayout = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      setContainerEl(el);
      if (!el) return;
      const observer = new ResizeObserver(([entry]) => {
        const next = { width: entry.contentRect.width, height: entry.contentRect.height };
        if (!next.width || !next.height) return;
        setSize(next);
        setCam((prev) => {
          if (pending.current) {
            const make = pending.current;
            pending.current = null;
            return clampZoom(make(next));
          }
          if (prev) return prev;
          return clampZoom(
            initialRegion
              ? cameraForRegion(initialRegion, next)
              : { x: 0.5, y: 0.5, zoom: minZoomLevel },
          );
        });
      });
      observer.observe(el);
      return () => observer.disconnect();
    },
    // Only the first region matters, like the native initialRegion prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ready = size && cam;
  const scale = ready ? TILE * 2 ** cam.zoom : 0;
  const left = ready ? cam.x * scale - size.width / 2 : 0;
  const top = ready ? cam.y * scale - size.height / 2 : 0;

  const ctx: MapContextValue | null = ready
    ? {
        project: (c) => ({
          x: toWorldX(c.longitude) * scale - left,
          y: toWorldY(c.latitude) * scale - top,
        }),
        unproject: (x, y) => ({
          latitude: toLat((y + top) / scale),
          longitude: toLng((x + left) / scale),
        }),
        container: containerEl,
        size,
      }
    : null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!cam || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panStart.current = { px: e.clientX, py: e.clientY, cam, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStart.current;
    if (!start || !scale) return;
    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    start.moved = true;
    setCam(clampZoom({ ...start.cam, x: start.cam.x - dx / scale, y: start.cam.y - dy / scale }));
  };
  const onPointerUp = () => {
    const start = panStart.current;
    panStart.current = null;
    if (!start) return;
    if (!start.moved) onPress?.({ nativeEvent: {} });
    else if (cam && size) onRegionChangeComplete?.(regionForCamera(cam, size));
  };
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!cam || !size || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - size.width / 2;
    const my = e.clientY - rect.top - size.height / 2;
    const next = clampZoom({ ...cam, zoom: cam.zoom - e.deltaY / 300 });
    const oldScale = TILE * 2 ** cam.zoom;
    const newScale = TILE * 2 ** next.zoom;
    // Keep the point under the cursor fixed while zooming.
    next.x = cam.x + mx / oldScale - mx / newScale;
    next.y = cam.y + my / oldScale - my / newScale;
    setCam(next);
    onRegionChangeComplete?.(regionForCamera(next, size));
  };

  const tiles: ReactNode[] = [];
  if (ready) {
    const z = Math.min(MAX_TILE_ZOOM, Math.max(0, Math.round(cam.zoom)));
    const tileSize = TILE * 2 ** (cam.zoom - z);
    const n = 2 ** z;
    for (let ty = Math.floor(top / tileSize); ty * tileSize < top + size.height; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(left / tileSize); tx * tileSize < left + size.width; tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push(
          <img
            key={`${z}/${tx}/${ty}`}
            src={`${TILE_URL}/${z}/${wx}/${ty}.png`}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: tx * tileSize - left,
              top: ty * tileSize - top,
              width: tileSize + 0.5,
              height: tileSize + 0.5,
              pointerEvents: 'none',
              userSelect: 'none',
              filter: DARK_FILTER,
            }}
          />,
        );
      }
    }
  }

  return (
    <div
      ref={onLayout}
      role="application"
      aria-label={accessibilityLabel}
      style={styles.container}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {tiles}
      {ctx && <MapContext.Provider value={ctx}>{children}</MapContext.Provider>}
      <div style={styles.attribution}>© OpenStreetMap contributors</div>
    </div>
  );
});

export default MapView;

interface MarkerProps {
  coordinate: LatLng;
  children?: ReactNode;
  anchor?: { x: number; y: number };
  zIndex?: number;
  draggable?: boolean;
  pinColor?: string;
  onPress?: (e: { stopPropagation: () => void; nativeEvent: { coordinate: LatLng } }) => void;
  onDragEnd?: (e: { nativeEvent: { coordinate: LatLng } }) => void;
  accessibilityLabel?: string;
}

export function Marker({
  coordinate,
  children,
  anchor,
  zIndex,
  draggable,
  pinColor = '#e03a3e',
  onPress,
  onDragEnd,
  accessibilityLabel,
}: MarkerProps) {
  const map = useContext(MapContext);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  if (!map) return null;

  const at = dragPoint ?? map.project(coordinate);
  // Native defaults: custom views are centred, the stock pin sits on its tip.
  const { x: ax, y: ay } = anchor ?? (children ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 1 });

  const localPoint = (e: ReactPointerEvent) => {
    const rect = map.container?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  return (
    <div
      role="button"
      aria-label={accessibilityLabel}
      style={{
        position: 'absolute',
        left: at.x,
        top: at.y,
        transform: `translate(${-ax * 100}%, ${-ay * 100}%)`,
        zIndex: zIndex ?? 1,
        cursor: draggable ? 'grab' : 'pointer',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        press.current = { px: e.clientX, py: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const start = press.current;
        if (!start || !draggable) return;
        if (!start.moved && Math.hypot(e.clientX - start.px, e.clientY - start.py) < 4) return;
        start.moved = true;
        setDragPoint(localPoint(e));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const start = press.current;
        press.current = null;
        if (!start) return;
        if (start.moved && dragPoint) {
          onDragEnd?.({ nativeEvent: { coordinate: map.unproject(dragPoint.x, dragPoint.y) } });
          setDragPoint(null);
        } else {
          onPress?.({ stopPropagation: () => {}, nativeEvent: { coordinate } });
        }
      }}
    >
      {children ?? (
        <svg width={28} height={38} viewBox="0 0 28 38" style={{ display: 'block' }}>
          <path
            d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 38 14 38s14-13.7 14-24.1C28 6.2 21.7 0 14 0z"
            fill={pinColor}
          />
          <circle cx={14} cy={14} r={5} fill="#fff" />
        </svg>
      )}
    </div>
  );
}

interface PolylineProps {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

export function Polyline({
  coordinates,
  strokeColor = '#000',
  strokeWidth = 1,
  lineDashPattern,
}: PolylineProps) {
  const map = useContext(MapContext);
  if (!map) return null;
  const points = coordinates
    .map((c) => {
      const p = map.project(c);
      return `${p.x},${p.y}`;
    })
    .join(' ');
  return (
    <svg
      width={map.size.width}
      height={map.size.height}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={lineDashPattern?.join(' ')}
      />
    </svg>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    backgroundColor: '#101214',
    touchAction: 'none',
    cursor: 'grab',
  },
  attribution: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'sans-serif',
    pointerEvents: 'none',
    zIndex: 20,
  },
};
