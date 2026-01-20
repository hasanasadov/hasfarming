import { NextRequest, NextResponse } from 'next/server'

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
  }

  try {
    // Fetch current weather and 7-day forecast from Open-Meteo (free, no API key needed)
    const weatherUrl = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,relative_humidity_2m_mean,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7`
    
    const weatherResponse = await fetch(weatherUrl)
    
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data')
    }

    const weatherData = await weatherResponse.json()

    // Transform the data into our format
    const current = {
      temp: weatherData.current.temperature_2m,
      humidity: weatherData.current.relative_humidity_2m,
      precipitation: weatherData.current.precipitation,
      windSpeed: weatherData.current.wind_speed_10m,
      uvIndex: weatherData.current.uv_index,
      description: getWeatherDescription(weatherData.current.weather_code),
      icon: getWeatherIcon(weatherData.current.weather_code)
    }

    const forecast = weatherData.daily.time.map((date: string, index: number) => ({
      date,
      tempMax: weatherData.daily.temperature_2m_max[index],
      tempMin: weatherData.daily.temperature_2m_min[index],
      temp: (weatherData.daily.temperature_2m_max[index] + weatherData.daily.temperature_2m_min[index]) / 2,
      precipitation: weatherData.daily.precipitation_sum[index],
      humidity: weatherData.daily.relative_humidity_2m_mean[index],
      windSpeed: weatherData.daily.wind_speed_10m_max[index],
      uvIndex: weatherData.daily.uv_index_max[index],
      description: getWeatherDescription(weatherData.daily.weather_code[index]),
      icon: getWeatherIcon(weatherData.daily.weather_code[index]),
      // Estimate soil moisture based on precipitation and humidity
      soilMoisture: estimateSoilMoisture(
        weatherData.daily.precipitation_sum[index],
        weatherData.daily.relative_humidity_2m_mean[index]
      )
    }))

    return NextResponse.json({
      current,
      forecast,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timezone: weatherData.timezone
      }
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Açıq hava',
    1: 'Əsasən açıq',
    2: 'Qismən buludlu',
    3: 'Buludlu',
    45: 'Dumanlı',
    48: 'Qırövlu duman',
    51: 'Yüngül çiskin',
    53: 'Orta çiskin',
    55: 'Güclü çiskin',
    61: 'Yüngül yağış',
    63: 'Orta yağış',
    65: 'Güclü yağış',
    71: 'Yüngül qar',
    73: 'Orta qar',
    75: 'Güclü qar',
    80: 'Yüngül leysan',
    81: 'Orta leysan',
    82: 'Güclü leysan',
    95: 'Tufan',
    96: 'Dolu ilə tufan',
    99: 'Güclü dolu ilə tufan'
  }
  return descriptions[code] || 'Bilinmir'
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌧️'
  if (code <= 65) return '🌧️'
  if (code <= 75) return '❄️'
  if (code <= 82) return '🌧️'
  return '⛈️'
}

function estimateSoilMoisture(precipitation: number, humidity: number): number {
  // Simple estimation based on precipitation and humidity
  const base = 30 // base soil moisture
  const precEffect = Math.min(precipitation * 5, 40) // precipitation contribution
  const humEffect = (humidity - 50) * 0.3 // humidity contribution
  return Math.max(10, Math.min(95, base + precEffect + humEffect))
}
