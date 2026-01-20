'use client'

import React from "react"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ZoomIn, ZoomOut, Crosshair, Loader2 } from 'lucide-react'
import { Location } from '@/lib/types'

interface MapPickerProps {
  onLocationSelect: (location: Location) => void
  selectedLocation: Location | null
  initialCenter?: { lat: number; lng: number }
}

export function MapPicker({ onLocationSelect, selectedLocation, initialCenter }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapCenter, setMapCenter] = useState(initialCenter || { lat: 40.4093, lng: 49.8671 }) // Baku default
  const [zoom, setZoom] = useState(10)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null
  )

  // Convert lat/lng to tile coordinates
  const latLngToTile = useCallback((lat: number, lng: number, z: number) => {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, z))
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z))
    return { x, y }
  }, [])

  // Convert tile coordinates to lat/lng
  const tileToLatLng = useCallback((x: number, y: number, z: number) => {
    const n = Math.pow(2, z)
    const lng = x / n * 360 - 180
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI
    return { lat, lng }
  }, [])

  // Calculate pixel offset within tile
  const getPixelOffset = useCallback((lat: number, lng: number, z: number, tileX: number, tileY: number) => {
    const n = Math.pow(2, z)
    const x = ((lng + 180) / 360 * n - tileX) * 256
    const y = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - tileY) * 256
    return { x, y }
  }, [])

  // Get visible tiles
  const getVisibleTiles = useCallback(() => {
    if (!mapRef.current) return []
    
    const width = mapRef.current.offsetWidth
    const height = mapRef.current.offsetHeight
    const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom)
    const tilesX = Math.ceil(width / 256) + 2
    const tilesY = Math.ceil(height / 256) + 2
    
    const tiles: { x: number; y: number; z: number }[] = []
    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
        const x = centerTile.x + dx
        const y = centerTile.y + dy
        const maxTile = Math.pow(2, zoom)
        if (y >= 0 && y < maxTile) {
          tiles.push({ x: ((x % maxTile) + maxTile) % maxTile, y, z: zoom })
        }
      }
    }
    return tiles
  }, [mapCenter, zoom, latLngToTile])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    
    const scale = 256 * Math.pow(2, zoom)
    const dLng = -dx / scale * 360
    const dLat = dy / scale * 180
    
    setMapCenter(prev => ({
      lat: Math.max(-85, Math.min(85, prev.lat + dLat)),
      lng: ((prev.lng + dLng + 540) % 360) - 180
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = async (e: React.MouseEvent) => {
    if (!mapRef.current || isDragging) return
    
    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    const scale = 256 * Math.pow(2, zoom) / 360
    const lng = mapCenter.lng + x / scale
    const lat = mapCenter.lat - y / scale * 0.7 // Approximate correction for Mercator

    const newLat = Math.max(-85, Math.min(85, lat))
    const newLng = ((lng + 540) % 360) - 180

    setMarkerPosition({ lat: newLat, lng: newLng })
    setIsLoading(true)

    try {
      const response = await fetch(`/api/geocode?lat=${newLat}&lng=${newLng}`)
      const data = await response.json()
      onLocationSelect({
        lat: newLat,
        lng: newLng,
        address: data.address || `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`
      })
    } catch {
      onLocationSelect({
        lat: newLat,
        lng: newLng,
        address: `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(18, prev + 1))
  const handleZoomOut = () => setZoom(prev => Math.max(1, prev - 1))
  
  const centerOnLocation = () => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng })
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }

  // Update marker when selectedLocation changes externally
  useEffect(() => {
    if (selectedLocation) {
      setMarkerPosition({ lat: selectedLocation.lat, lng: selectedLocation.lng })
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng })
    }
  }, [selectedLocation])

  const tiles = getVisibleTiles()
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom)

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MapPin className="h-5 w-5 text-primary" />
          Xəritədən Seçin
        </CardTitle>
        <CardDescription>
          Xəritəni sürüşdürün və istədiyiniz nöqtəyə klikləyin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef}
          className="relative w-full h-80 md:h-96 rounded-lg overflow-hidden border border-border bg-muted cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        >
          {/* Map Tiles */}
          <div className="absolute inset-0 overflow-hidden">
            {tiles.map((tile) => {
              const offset = getPixelOffset(mapCenter.lat, mapCenter.lng, zoom, centerTile.x, centerTile.y)
              const tileX = (tile.x - centerTile.x) * 256 - offset.x + (mapRef.current?.offsetWidth || 0) / 2
              const tileY = (tile.y - centerTile.y) * 256 - offset.y + (mapRef.current?.offsetHeight || 0) / 2
              
              return (
                <img
                  key={`${tile.z}-${tile.x}-${tile.y}`}
                  src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
                  alt=""
                  className="absolute w-64 h-64 pointer-events-none"
                  style={{
                    left: tileX,
                    top: tileY,
                    width: 256,
                    height: 256,
                  }}
                  draggable={false}
                />
              )
            })}
          </div>

          {/* Marker */}
          {markerPosition && (
            <div 
              className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(
                  ${((markerPosition.lng - mapCenter.lng) * 256 * Math.pow(2, zoom) / 360)}px,
                  ${(-(markerPosition.lat - mapCenter.lat) * 256 * Math.pow(2, zoom) / 180 * 0.7 - 32)}px
                )`
              }}
            >
              <div className="flex flex-col items-center">
                <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="currentColor" />
                <div className="w-2 h-2 rounded-full bg-primary/50 mt-1 animate-ping" />
              </div>
            </div>
          )}

          {/* Center Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/50 rounded-full" />
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
            <Button type="button" size="icon" variant="secondary" onClick={handleZoomIn} className="h-8 w-8 shadow-md">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="secondary" onClick={handleZoomOut} className="h-8 w-8 shadow-md">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="secondary" onClick={centerOnLocation} className="h-8 w-8 shadow-md mt-2">
              <Crosshair className="h-4 w-4" />
            </Button>
          </div>

          {/* Attribution */}
          <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground bg-background/80 px-1 rounded">
            OpenStreetMap
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{selectedLocation.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
