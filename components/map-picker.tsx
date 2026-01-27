"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ZoomIn, ZoomOut, Crosshair, Loader2 } from "lucide-react";
import type { Location } from "@/lib/types";

interface MapPickerProps {
  onLocationSelect: (location: Location) => void;
  selectedLocation: Location | null;
  initialCenter?: { lat: number; lng: number };
}

const TILE_SIZE = 256;

// ---------- Web Mercator helpers ----------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function wrapLng(lng: number) {
  return ((lng + 540) % 360) - 180;
}

function latLngToWorldPx(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const siny = clamp(Math.sin((lat * Math.PI) / 180), -0.9999, 0.9999);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale;
  return { x, y, scale };
}

function worldPxToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat: clamp(lat, -85.0511, 85.0511), lng: wrapLng(lng) };
}

// UI region check: if event originated from a UI overlay, ignore map click
function isFromMapUI(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest('[data-map-ui="1"]');
}

export function MapPicker({
  onLocationSelect,
  selectedLocation,
  initialCenter,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(10);
  const [mapCenter, setMapCenter] = useState(
    initialCenter || { lat: 40.4093, lng: 49.8671 }, // Bakı
  );

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    selectedLocation
      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
      : null,
  );

  useEffect(() => {
    if (!mapRef.current) return;
    const checkSize = () => {
      if (
        mapRef.current &&
        mapRef.current.clientWidth > 0 &&
        mapRef.current.clientHeight > 0
      ) {
        setMapReady(true);
      }
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // drag click fərqləndirmə
  const dragDistance = useRef(0);
  const isInternalChange = useRef(false);

  // center world px
  const centerWorld = useMemo(
    () => latLngToWorldPx(mapCenter.lat, mapCenter.lng, zoom),
    [mapCenter, zoom],
  );

  const getVisibleTiles = useCallback(() => {
    if (!mapRef.current) return [];
    const w = mapRef.current.clientWidth;
    const h = mapRef.current.clientHeight;
    const halfW = w / 2;
    const halfH = h / 2;

    const topLeftWorld = { x: centerWorld.x - halfW, y: centerWorld.y - halfH };
    const bottomRightWorld = {
      x: centerWorld.x + halfW,
      y: centerWorld.y + halfH,
    };

    const minTileX = Math.floor(topLeftWorld.x / TILE_SIZE);
    const maxTileX = Math.floor(bottomRightWorld.x / TILE_SIZE);
    const minTileY = Math.floor(topLeftWorld.y / TILE_SIZE);
    const maxTileY = Math.floor(bottomRightWorld.y / TILE_SIZE);

    const max = Math.pow(2, zoom);

    const tiles: { x: number; y: number; z: number }[] = [];
    for (let ty = minTileY - 1; ty <= maxTileY + 1; ty++) {
      if (ty < 0 || ty >= max) continue;
      for (let tx = minTileX - 1; tx <= maxTileX + 1; tx++) {
        const wrappedX = ((tx % max) + max) % max;
        tiles.push({ x: wrappedX, y: ty, z: zoom });
      }
    }
    return tiles;
  }, [centerWorld, zoom]);

  const tiles = mapReady ? getVisibleTiles() : [];

  const tileToScreen = useCallback(
    (tileX: number, tileY: number) => {
      const tileWorldX = tileX * TILE_SIZE;
      const tileWorldY = tileY * TILE_SIZE;
      const w = mapRef.current?.clientWidth ?? 0;
      const h = mapRef.current?.clientHeight ?? 0;
      const left = w / 2 + (tileWorldX - centerWorld.x);
      const top = h / 2 + (tileWorldY - centerWorld.y);
      return { left, top };
    },
    [centerWorld],
  );

  const markerToScreen = useCallback(() => {
    if (!marker || !mapRef.current) return null;
    const w = mapRef.current.clientWidth;
    const h = mapRef.current.clientHeight;
    const mWorld = latLngToWorldPx(marker.lat, marker.lng, zoom);
    const x = w / 2 + (mWorld.x - centerWorld.x);
    const y = h / 2 + (mWorld.y - centerWorld.y);
    return { x, y };
  }, [marker, zoom, centerWorld]);

  // ✅ click-select only on pointer up (and only if not dragging, and not from UI overlay)
  const pickAtPointer = useCallback(
    async (clientX: number, clientY: number) => {
      if (!mapRef.current) return;

      const rect = mapRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const w = rect.width;
      const h = rect.height;

      const worldX = centerWorld.x + (x - w / 2);
      const worldY = centerWorld.y + (y - h / 2);

      const { lat, lng } = worldPxToLatLng(worldX, worldY, zoom);

      setMarker({ lat, lng });
      setIsLoading(true);
      isInternalChange.current = true;

      try {
        const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await r.json();
        onLocationSelect({
          lat,
          lng,
          address: data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
      } catch {
        onLocationSelect({
          lat,
          lng,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [centerWorld.x, centerWorld.y, zoom, onLocationSelect],
  );

  const handleZoomIn = () => setZoom((z) => Math.min(18, z + 1));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 1));

  const centerOnLocation = () => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setMarker({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  };

  // selectedLocation xaricdən dəyişəndə marker+center düz getsin
  useEffect(() => {
    if (selectedLocation && !isInternalChange.current) {
      setMarker({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
    isInternalChange.current = false;
  }, [selectedLocation]);

  const markerScreen = markerToScreen();

  return (
    <Card className="border-border/50 shadow-lg rounded-xl overflow-hidden !p-0">
      <div
        ref={mapRef}
        className={`
          relative w-full h-80 md:h-96 overflow-hidden
          border border-border bg-muted select-none
          ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}
        `}
        // ✅ Use pointer events only; NO onClick
        onPointerDown={(e) => {
          // if press starts on UI overlay -> do not drag map
          if (isFromMapUI(e.target)) return;

          mapRef.current?.setPointerCapture(e.pointerId);
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          dragDistance.current = 0;
        }}
        onPointerMove={(e) => {
          if (!isDragging) return;

          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          dragDistance.current += Math.abs(dx) + Math.abs(dy);

          const newCenterWorldX = centerWorld.x - dx;
          const newCenterWorldY = centerWorld.y - dy;

          const ll = worldPxToLatLng(newCenterWorldX, newCenterWorldY, zoom);
          setMapCenter(ll);

          setDragStart({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          // release drag
          const wasDragging = isDragging;
          setIsDragging(false);

          // If pointer up happened on UI overlay -> ignore
          if (isFromMapUI(e.target)) {
            dragDistance.current = 0;
            return;
          }

          // If it was a drag, don't treat as click
          if (wasDragging && dragDistance.current > 6) {
            dragDistance.current = 0;
            return;
          }

          // Otherwise, treat as click-select
          dragDistance.current = 0;
          pickAtPointer(e.clientX, e.clientY);
        }}
        onPointerCancel={() => setIsDragging(false)}
      >
        <div className="absolute inset-0">
          {tiles.map((t) => {
            const pos = tileToScreen(t.x, t.y);
            return (
              <img
                key={`${t.z}-${t.x}-${t.y}`}
                src={`https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`}
                alt=""
                draggable={false}
                className="absolute pointer-events-none"
                style={{
                  left: pos.left,
                  top: pos.top,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                }}
              />
            );
          })}
        </div>

        {markerScreen && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: markerScreen.x, top: markerScreen.y }}
          >
            <div className="flex flex-col items-center">
              <MapPin
                className="h-8 w-8 text-primary drop-shadow-lg"
                fill="currentColor"
              />
              <span className="mt-1 h-2 w-2 rounded-full bg-primary/50 animate-ping" />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-background/45 backdrop-blur-[1px] flex items-center justify-center z-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* ✅ UI overlay marked with data-map-ui */}
        <div
          data-map-ui="1"
          className="absolute top-3 right-3 z-30 pointer-events-auto"
        >
          <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur shadow-lg p-1 flex flex-col gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleZoomIn()}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleZoomOut()}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 mt-1"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => centerOnLocation()}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
