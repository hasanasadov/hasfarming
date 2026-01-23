import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatCoords(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lng).toFixed(5)}°${ew}`;
}

function pickFirst(...vals: Array<any>) {
  return vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== "",
  );
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = toNumber(sp.get("lat"));
  const lng = toNumber(sp.get("lng"));

  if (lat === null || lng === null) {
    return NextResponse.json(
      { error: "Latitude and longitude are required (valid numbers)." },
      { status: 400 },
    );
  }

  const coordsAddress = formatCoords(lat, lng);

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=1&namedetails=1&extratags=1` +
      `&accept-language=az`;

    const r = await fetch(url, {
      // 1 gün cache -> rate limit azalır
      next: { revalidate: 60 * 60 * 24 },
      headers: {
        "User-Agent": "AgriSense/1.0 (Smart Farming Application)",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      return NextResponse.json({
        address: coordsAddress,
        details: { lat, lng },
      });
    }

    const data = await r.json();
    const a = data?.address || {};

    // --- POI name (park, school, hospital, etc.) ---
    const poi =
      pickFirst(
        data?.name, // bəzən gəlir
        data?.namedetails?.name, // namedetails=1 ilə daha çox gəlir
        a.park,
        a.leisure,
        a.attraction,
        a.amenity,
        a.tourism,
        a.shop,
        a.building,
        a.industrial,
      ) || null;

    // locality: kənd/qəsəbə/şəhər
    const locality =
      pickFirst(
        a.village,
        a.hamlet,
        a.town,
        a.city,
        a.municipality,
        a.suburb,
        a.neighbourhood,
      ) || null;

    // region: rayon/region
    const region =
      pickFirst(a.county, a.state_district, a.state, a.region) || null;

    const country = a.country || null;

    // ✅ Əsas qayda: POI varsa -> başa yaz
    const addressParts = [poi, locality, region, country].filter(Boolean);
    const pretty = addressParts.join(", ");

    // fallback: Nominatim-in uzun display_name-i
    const fallback = data?.display_name || coordsAddress;

    return NextResponse.json({
      address: pretty || fallback || coordsAddress,
      details: {
        poi,
        locality,
        region,
        country,
        countryCode: a.country_code
          ? String(a.country_code).toUpperCase()
          : null,
        raw: a,
      },
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ address: coordsAddress, details: { lat, lng } });
  }
}
