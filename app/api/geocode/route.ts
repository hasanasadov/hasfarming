import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
  }

  const coordsAddress = `${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E`

  try {
    // Use Open-Meteo geocoding API - free, no API key, server-side compatible
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lng}&count=1&language=en&format=json`,
      { cache: 'no-store' }
    )

    // Try Nominatim as primary - it's more reliable for reverse geocoding
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=az`,
      {
        headers: {
          'User-Agent': 'AgriSense/1.0 (Smart Farming Application)',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    )

    if (nominatimResponse.ok) {
      const data = await nominatimResponse.json()
      
      if (data && data.address) {
        const address = data.address
        const displayName = [
          address.village || address.town || address.city || address.municipality,
          address.county || address.state || address.region,
          address.country
        ].filter(Boolean).join(', ')

        return NextResponse.json({
          address: displayName || data.display_name || coordsAddress,
          details: {
            locality: address.village || address.town || address.city,
            region: address.county || address.state,
            country: address.country,
            countryCode: address.country_code?.toUpperCase()
          }
        })
      }
    }

    // Fallback to coordinates
    return NextResponse.json({
      address: coordsAddress,
      details: { lat, lng }
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({
      address: coordsAddress,
      details: { lat, lng }
    })
  }
}
