'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Navigation, Search, Loader2, LocateFixed } from 'lucide-react'
import { Location } from '@/lib/types'

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void
  selectedLocation: Location | null
}

export function LocationPicker({ onLocationSelect, selectedLocation }: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const data = await response.json()
        return data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }
    } catch (e) {
      console.error('Reverse geocoding error:', e)
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }, [])

  const getLiveLocation = useCallback(async () => {
    setIsGettingLocation(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Brauzeriniz geolokasiya dəstəkləmir')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const address = await reverseGeocode(latitude, longitude)
        onLocationSelect({ lat: latitude, lng: longitude, address })
        setIsGettingLocation(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Məkan əldə edilə bilmədi. Zəhmət olmasa icazə verin.')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [onLocationSelect, reverseGeocode])

  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: { 'User-Agent': 'AgriSense Smart Farming App' }
        }
      )
      
      if (!response.ok) throw new Error('Axtarış uğursuz oldu')
      
      const data = await response.json()
      setSearchResults(data.map((item: { lat: string; lon: string; display_name: string }) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        display_name: item.display_name
      })))
    } catch (e) {
      console.error('Search error:', e)
      setError('Axtarış zamanı xəta baş verdi')
    } finally {
      setIsLoading(false)
    }
  }

  const selectSearchResult = (result: { lat: number; lng: number; display_name: string }) => {
    onLocationSelect({ lat: result.lat, lng: result.lng, address: result.display_name })
    setSearchResults([])
    setSearchQuery('')
  }

  const handleManualInput = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)

    if (isNaN(lat) || isNaN(lng)) {
      setError('Düzgün koordinatlar daxil edin')
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Koordinatlar sərhəddən kənardır')
      return
    }

    setIsLoading(true)
    const address = await reverseGeocode(lat, lng)
    onLocationSelect({ lat, lng, address })
    setIsLoading(false)
    setManualLat('')
    setManualLng('')
  }

  // Watch for live location updates
  useEffect(() => {
    let watchId: number | null = null

    if (selectedLocation && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          // Only update if significantly different (> 100m)
          if (selectedLocation) {
            const distance = Math.sqrt(
              Math.pow(latitude - selectedLocation.lat, 2) +
              Math.pow(longitude - selectedLocation.lng, 2)
            )
            if (distance > 0.001) { // ~100m
              const address = await reverseGeocode(latitude, longitude)
              onLocationSelect({ lat: latitude, lng: longitude, address })
            }
          }
        },
        (error) => console.log('Watch position error:', error),
        { enableHighAccuracy: true }
      )
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [selectedLocation, onLocationSelect, reverseGeocode])

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MapPin className="h-5 w-5 text-primary" />
          Məkan Seçimi
        </CardTitle>
        <CardDescription>
          Canlı məkanınızı paylaşın və ya xəritədən əl ilə seçin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Location Button */}
        <div className="space-y-2">
          <Button
            onClick={getLiveLocation}
            disabled={isGettingLocation}
            className="w-full gap-2"
            size="lg"
          >
            {isGettingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5" />
            )}
            Canlı Məkanımı İstifadə Et
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            GPS ilə dəqiq məkanınız avtomatik yenilənəcək
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">və ya</span>
          </div>
        </div>

        {/* Search Location */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Şəhər, kənd və ya ünvan axtarın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
              className="flex-1"
            />
            <Button onClick={searchLocation} disabled={isLoading} variant="secondary">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-48 overflow-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                >
                  <span className="text-foreground">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">və ya</span>
          </div>
        </div>

        {/* Manual Coordinates */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Koordinatları əl ilə daxil edin</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enlik (lat)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              type="number"
              step="any"
            />
            <Input
              placeholder="Uzunluq (lng)"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              type="number"
              step="any"
            />
            <Button onClick={handleManualInput} disabled={isLoading} variant="secondary">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {selectedLocation && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{selectedLocation.address}</p>
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
