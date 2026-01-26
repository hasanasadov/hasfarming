import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStr(v: string | null) {
  const s = (v || "").trim();
  return s.length ? s : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = toStr(sp.get("q"));
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  // Nominatim search
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2&q=${encodeURIComponent(q)}` +
    `&addressdetails=1&namedetails=1&limit=1` +
    `&accept-language=az`;

  try {
    const r = await fetch(url, {
      // cache: 1 gün (rate limit azalsın)
      next: { revalidate: 60 * 60 * 24 },
      headers: {
        "User-Agent": "BEREKET/1.0 (Smart Farming Application)",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "geocode search failed", details: txt },
        { status: 502 },
      );
    }

    const arr = (await r.json()) as any[];
    const first = arr?.[0];
    if (!first) {
      return NextResponse.json({ found: false, q });
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    const address = first.display_name || q;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ found: false, q });
    }

    return NextResponse.json({
      found: true,
      q,
      location: { lat, lng, address },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "geocode search error", message: e?.message },
      { status: 500 },
    );
  }
}
