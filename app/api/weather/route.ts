// app/api/weather/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(id) };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 },
    );
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json(
      { error: "Latitude/longitude must be valid numbers" },
      { status: 400 },
    );
  }

  try {
    const weatherUrl =
      `${OPEN_METEO_BASE}/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lng)}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,relative_humidity_2m_mean,wind_speed_10m_max,uv_index_max` +
      `&timezone=auto&forecast_days=7`;

    const t = withTimeout(10000);

    const weatherResponse = await fetch(weatherUrl, {
      signal: t.controller.signal,
      cache: "no-store",
    }).finally(t.clear);

    if (!weatherResponse.ok) {
      const txt = await weatherResponse.text().catch(() => "");
      console.error("Open-Meteo error:", weatherResponse.status, txt);
      return NextResponse.json(
        { error: "Failed to fetch weather data" },
        { status: 502 },
      );
    }

    const weatherData = await weatherResponse.json();

    const current = {
      temp: weatherData?.current?.temperature_2m ?? null,
      humidity: weatherData?.current?.relative_humidity_2m ?? null,
      precipitation: weatherData?.current?.precipitation ?? null,
      windSpeed: weatherData?.current?.wind_speed_10m ?? null,
      uvIndex: weatherData?.current?.uv_index ?? null,
      description: getWeatherDescription(weatherData?.current?.weather_code),
      icon: getWeatherIcon(weatherData?.current?.weather_code),
    };

    const times: string[] = weatherData?.daily?.time ?? [];
    const tMax: number[] = weatherData?.daily?.temperature_2m_max ?? [];
    const tMin: number[] = weatherData?.daily?.temperature_2m_min ?? [];
    const pSum: number[] = weatherData?.daily?.precipitation_sum ?? [];
    const codes: number[] = weatherData?.daily?.weather_code ?? [];
    const humMean: number[] =
      weatherData?.daily?.relative_humidity_2m_mean ?? [];
    const windMax: number[] = weatherData?.daily?.wind_speed_10m_max ?? [];
    const uvMax: number[] = weatherData?.daily?.uv_index_max ?? [];

    const forecast = times.map((date, index) => {
      const max = tMax[index] ?? null;
      const min = tMin[index] ?? null;

      const precipitation = pSum[index] ?? null;
      const humidity = humMean[index] ?? null;

      return {
        date,
        tempMax: max,
        tempMin: min,
        temp:
          typeof max === "number" && typeof min === "number"
            ? (max + min) / 2
            : null,
        precipitation,
        humidity,
        windSpeed: windMax[index] ?? null,
        uvIndex: uvMax[index] ?? null,
        description: getWeatherDescription(codes[index]),
        icon: getWeatherIcon(codes[index]),
        soilMoisture:
          typeof precipitation === "number" && typeof humidity === "number"
            ? estimateSoilMoisture(precipitation, humidity)
            : null,
      };
    });

    return NextResponse.json({
      current,
      forecast,
      location: {
        lat: latNum,
        lng: lngNum,
        timezone: weatherData?.timezone ?? "auto",
      },
    });
  } catch (error: any) {
    console.error("Weather API error:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 },
    );
  }
}

function getWeatherDescription(code: number): string {
  const c = Number(code);
  const descriptions: Record<number, string> = {
    0: "Açıq hava",
    1: "Əsasən açıq",
    2: "Qismən buludlu",
    3: "Buludlu",
    45: "Dumanlı",
    48: "Qırövlu duman",
    51: "Yüngül çiskin",
    53: "Orta çiskin",
    55: "Güclü çiskin",
    61: "Yüngül yağış",
    63: "Orta yağış",
    65: "Güclü yağış",
    71: "Yüngül qar",
    73: "Orta qar",
    75: "Güclü qar",
    80: "Yüngül leysan",
    81: "Orta leysan",
    82: "Güclü leysan",
    95: "Tufan",
    96: "Dolu ilə tufan",
    99: "Güclü dolu ilə tufan",
  };
  return descriptions[c] || "Bilinmir";
}

function getWeatherIcon(code: number): string {
  const c = Number(code);
  if (c === 0) return "☀️";
  if (c <= 3) return "⛅";
  if (c <= 48) return "🌫️";
  if (c <= 55) return "🌧️";
  if (c <= 65) return "🌧️";
  if (c <= 75) return "❄️";
  if (c <= 82) return "🌧️";
  return "⛈️";
}

function estimateSoilMoisture(precipitation: number, humidity: number): number {
  const base = 30;
  const precEffect = Math.min(precipitation * 5, 40);
  const humEffect = (humidity - 50) * 0.3;
  return Math.max(10, Math.min(95, base + precEffect + humEffect));
}
