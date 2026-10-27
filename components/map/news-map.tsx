"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  FullscreenControl,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
  type SkySpecification,
} from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryColor } from "@/lib/categories";
import type { NewsItem } from "@/lib/types";
import { NewsCard } from "./news-card";

const SOURCE_ID = "news";
const HIT_LAYER_ID = "news-hit";
const PULSE_LAYER_ID = "news-pulse";
const MAX_POPUP_ITEMS = 5;

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Atmosphere glow around the globe. It fades out as the user zooms in. */
const SKY: SkySpecification = {
  "sky-color": "#04060f",
  "horizon-color": "#2b4dbb",
  "fog-color": "#0a1028",
  "sky-horizon-blend": 0.5,
  "horizon-fog-blend": 0.8,
  "fog-ground-blend": 0.9,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
};

const isHovered: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
const isSelected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];

/** Soft density glow at world scale. It hands over to the points as you zoom in. */
const heatLayer: LayerProps = {
  id: "news-heat",
  type: "heatmap",
  maxzoom: 8,
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1.5],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 18, 6, 50],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.55, 5, 0.4, 8, 0],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0, "rgba(59,130,246,0)",
      0.2, "rgba(56,189,248,0.45)",
      0.45, "rgba(167,139,250,0.6)",
      0.7, "rgba(244,114,182,0.75)",
      1, "rgba(251,191,36,0.9)",
    ],
  },
};

/** Wide blurred halo in the category colour. */
const glowLayer: LayerProps = {
  id: "news-glow",
  type: "circle",
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 6, 22, 12, 30],
    "circle-blur": 1,
    "circle-opacity": ["case", isHovered, 0.7, isSelected, 0.6, 0.35],
    "circle-pitch-alignment": "map",
  },
};

/** Expanding ring. Its radius and opacity are animated in `usePulse`. */
const pulseLayer: LayerProps = {
  id: PULSE_LAYER_ID,
  type: "circle",
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": 8,
    "circle-stroke-color": ["get", "color"],
    "circle-stroke-width": 1.5,
    "circle-stroke-opacity": 0.5,
    "circle-pitch-alignment": "map",
  },
};

/** Solid marker. */
const coreLayer: LayerProps = {
  id: "news-core",
  type: "circle",
  paint: {
    "circle-color": ["get", "color"],
    // MapLibre only allows `zoom` in a top-level interpolate, so the
    // hover/selected boost goes inside each stop.
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, ["case", isHovered, 7.5, isSelected, 7, 4.5],
      6, ["case", isHovered, 9.5, isSelected, 9, 6.5],
      12, ["case", isHovered, 11, isSelected, 10.5, 8],
    ],
    "circle-stroke-color": "rgba(255,255,255,0.9)",
    "circle-stroke-width": ["case", isSelected, 2.5, 1.5],
    // Keep the marker round, even near the edge of the globe.
    "circle-pitch-alignment": "viewport",
  },
};

/** Invisible, larger target so small markers are easy to hover. */
const hitLayer: LayerProps = {
  id: HIT_LAYER_ID,
  type: "circle",
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 6, 16],
  },
};

interface NewsMapProps {
  items: NewsItem[];
  isGlobe: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** When this value changes, the map zooms to fit `items` (for example on a filter change). */
  fitKey?: string;
}

export function NewsMap({ items, isGlobe, selectedId, onSelect, fitKey }: NewsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoverIds, setHoverIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const geojson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: items.map((item) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: item.coordinates },
        properties: { id: item.id, color: getCategoryColor(item.category) },
      })),
    }),
    [items],
  );

  // Set the projection only after the style loads: MapLibre throws if it is set earlier.
  useEffect(() => {
    if (loaded) mapRef.current?.getMap().setProjection({ type: isGlobe ? "globe" : "mercator" });
  }, [loaded, isGlobe]);

  useFeatureState(mapRef, loaded, "hover", hoverIds);
  useFeatureState(mapRef, loaded, "selected", selectedId ? [selectedId] : []);
  usePulse(mapRef, loaded && items.length > 0);
  // Spin only in the default view; a filter or a selection means the user is looking at something.
  useAutoRotate(mapRef, loaded && isGlobe && !selectedId && (fitKey ?? "all") === "all");

  // Zoom to the visible stories when the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || items.length === 0 || fitKey === undefined) return;
    const lngs = items.map((i) => i.coordinates[0]);
    const lats = items.map((i) => i.coordinates[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, maxZoom: 5, duration: 1200 },
    );
    // Only on filter changes, not when more stories stream in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Fly to a story when it is selected (from the list or the map).
  useEffect(() => {
    const item = selectedId ? itemsById.get(selectedId) : undefined;
    const map = mapRef.current;
    if (!item || !map) return;
    map.flyTo({
      center: item.coordinates,
      zoom: Math.max(map.getZoom(), 4),
      duration: 1600,
      essential: true,
    });
    // Only when the selection changes, not when more stories stream in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const ids = [...new Set((event.features ?? []).map((f) => f.properties?.id as string).filter(Boolean))];
    setHoverIds((prev) => (prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids));
    event.target.getCanvas().style.cursor = ids.length > 0 ? "pointer" : "";
  }, []);

  const onMouseLeave = useCallback(() => setHoverIds([]), []);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => onSelect((event.features?.[0]?.properties?.id as string) ?? null),
    [onSelect],
  );

  // A pinned (selected) story wins over hover.
  const selected = selectedId ? itemsById.get(selectedId) : undefined;
  const popupItems = selected
    ? [selected]
    : hoverIds.map((id) => itemsById.get(id)).filter((i): i is NewsItem => Boolean(i));

  return (
    <div className="map-space absolute inset-0">
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: 15, latitude: 22, zoom: 1.9 }}
        mapStyle={MAP_STYLE}
        sky={SKY}
        minZoom={0.5}
        maxZoom={18}
        dragRotate={isGlobe}
        touchZoomRotate
        interactiveLayerIds={[HIT_LAYER_ID]}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (!loaded) setTilesFailed(true);
          console.warn("[map]", e.error?.message);
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" visualizePitch />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" />

        <Source id={SOURCE_ID} type="geojson" data={geojson} promoteId="id">
          <Layer {...heatLayer} />
          <Layer {...glowLayer} />
          <Layer {...pulseLayer} />
          <Layer {...coreLayer} />
          <Layer {...hitLayer} />
        </Source>

        {popupItems.length > 0 && (
          <Popup
            longitude={popupItems[0].coordinates[0]}
            latitude={popupItems[0].coordinates[1]}
            offset={14}
            closeButton={false}
            closeOnClick={false}
            maxWidth="none"
            className="news-popup"
          >
            <div className="custom-scrollbar max-h-[60vh] space-y-2 overflow-y-auto p-1">
              {popupItems.slice(0, MAX_POPUP_ITEMS).map((item) => (
                <NewsCard key={item.id} item={item} onClose={selected ? () => onSelect(null) : undefined} />
              ))}
            </div>
          </Popup>
        )}
      </MapGL>

      {tilesFailed && !loaded && (
        <p className="absolute inset-x-0 top-1/2 mx-auto w-fit max-w-[90%] -translate-y-1/2 rounded-lg border bg-background/90 px-4 py-3 text-center text-sm text-muted-foreground shadow-lg">
          The map tiles could not load. Check your connection. The stories are still in the list.
        </p>
      )}
    </div>
  );
}

/** Keep a boolean feature-state flag in sync with a list of feature IDs. */
function useFeatureState(
  mapRef: React.RefObject<MapRef | null>,
  enabled: boolean,
  key: string,
  ids: string[],
) {
  const previous = useRef<string[]>([]);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!enabled || !map?.getSource(SOURCE_ID)) return;
    for (const id of previous.current) map.setFeatureState({ source: SOURCE_ID, id }, { [key]: false });
    for (const id of ids) map.setFeatureState({ source: SOURCE_ID, id }, { [key]: true });
    previous.current = ids;
  }, [mapRef, enabled, key, ids]);
}

/**
 * Spin the globe slowly at world zoom until the user grabs, scrolls or
 * taps the map. Stays off for users who prefer reduced motion.
 */
function useAutoRotate(mapRef: React.RefObject<MapRef | null>, enabled: boolean) {
  const stopped = useRef(false);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!enabled || !map || stopped.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const DEGREES_PER_SECOND = 4;
    let active = true;

    const spin = () => {
      if (!active || map.getZoom() > 3) return;
      const center = map.getCenter();
      center.lng -= DEGREES_PER_SECOND;
      map.easeTo({ center, duration: 1000, easing: (t) => t });
    };
    const stop = () => {
      active = false;
      stopped.current = true;
    };

    const interactions = ["mousedown", "touchstart", "wheel", "dragstart"] as const;
    interactions.forEach((type) => map.on(type, stop));
    map.on("moveend", spin);
    spin();

    return () => {
      active = false;
      interactions.forEach((type) => map.off(type, stop));
      map.off("moveend", spin);
    };
  }, [mapRef, enabled]);
}

/**
 * Animate the pulse ring: it grows and fades in a 2.4 s loop.
 * Runs at about 30 fps, pauses in background tabs, and stays still
 * for users who prefer reduced motion.
 */
function usePulse(mapRef: React.RefObject<MapRef | null>, enabled: boolean) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!enabled || !map) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const PERIOD_MS = 2400;
    const FRAME_MS = 33;
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < FRAME_MS || !map.getLayer(PULSE_LAYER_ID)) return;
      last = now;
      const t = (now % PERIOD_MS) / PERIOD_MS;
      const eased = 1 - (1 - t) ** 3;
      map.setPaintProperty(PULSE_LAYER_ID, "circle-radius", 6 + eased * 22);
      map.setPaintProperty(PULSE_LAYER_ID, "circle-stroke-opacity", 0.7 * (1 - t));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mapRef, enabled]);
}
