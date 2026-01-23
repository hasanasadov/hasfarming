"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  // -180..180
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

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    selectedLocation
      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
      : null,
  );

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

  const tiles = getVisibleTiles();

  const tileToScreen = useCallback(
    (tileX: number, tileY: number) => {
      // tile top-left world px
      const tileWorldX = tileX * TILE_SIZE;
      const tileWorldY = tileY * TILE_SIZE;

      const w = mapRef.current?.clientWidth ?? 0;
      const h = mapRef.current?.clientHeight ?? 0;

      // screen origin is center
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

  // ---------- interactions ----------
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    dragDistance.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mapRef.current) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    dragDistance.current += Math.abs(dx) + Math.abs(dy);

    // pixel drag -> world pixel shift
    const newCenterWorldX = centerWorld.x - dx;
    const newCenterWorldY = centerWorld.y - dy;

    const ll = worldPxToLatLng(newCenterWorldX, newCenterWorldY, zoom);
    setMapCenter(ll);

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (!mapRef.current) return;

    // drag edibsə click sayma
    if (dragDistance.current > 6) {
      dragDistance.current = 0;
      return;
    }
    dragDistance.current = 0;

    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const w = rect.width;
    const h = rect.height;

    // screen -> world px
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
  };

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
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <MapPin className="h-5 w-5 text-primary" />
          </span>
          Xəritədən seçin
        </CardTitle>
        <CardDescription>
          Kliklədiyiniz nöqtə dəqiq seçiləcək (Mercator hesabı).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          ref={mapRef}
          className={`relative w-full h-80 md:h-96 rounded-xl overflow-hidden border border-border bg-muted select-none
          ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        >
          {/* Tiles */}
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

          {/* Marker */}
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

          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/45 backdrop-blur-[1px] flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Controls (STOP map click) */}
          <div
            className="absolute top-3 right-3 z-20 pointer-events-auto"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur shadow-lg p-1 flex flex-col gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-9 w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleZoomIn();
                }}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-9 w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleZoomOut();
                }}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-9 w-9 mt-1"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  centerOnLocation();
                }}
              >
                <Crosshair className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            OpenStreetMap
          </div> */}
        </div>

        {/* Selected Location */}
        {selectedLocation && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/60 ring-1 ring-primary/20">
                <MapPin className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {selectedLocation.address || "Seçilmiş məkan"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLocation.lat.toFixed(6)},{" "}
                  {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
