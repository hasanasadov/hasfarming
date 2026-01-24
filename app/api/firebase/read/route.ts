// app/api/firebase/read/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeFirebaseBaseUrl(raw: string) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json(\?.*)?$/i, "");
  url = url.replace(/\/+$/g, "");
  return url;
}

function isFirebaseDbUrl(url: string) {
  return url.includes("firebaseio.com") || url.includes("firebasedatabase.app");
}

async function tryFetchJson(fullUrl: string) {
  const r = await fetch(fullUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "AgriSense/1.0",
    },
  });

  const text = await r.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: r.ok,
    status: r.status,
    url: fullUrl,
    bodyPreview: (text || "").slice(0, 200),
    json,
  };
}

export async function GET(req: NextRequest) {
  const baseParam = req.nextUrl.searchParams.get("url") || "";
  const base = normalizeFirebaseBaseUrl(baseParam);

  if (!base) {
    return NextResponse.json(
      { ok: false, error: "Firebase URL boşdur" },
      { status: 400 },
    );
  }
  if (!isFirebaseDbUrl(base)) {
    return NextResponse.json(
      { ok: false, error: "Düzgün Firebase Realtime Database URL deyil" },
      { status: 400 },
    );
  }

  // Sən əvvəldə bu cür oxuyurdun: `${BASE_URL}/.json`
  // Burada da eyni məntiqlə bir neçə path yoxlayırıq:
  const tried: any[] = [];
  const candidates = [
    `${base}/.json?t=${Date.now()}`,
    `${base}/soil.json?t=${Date.now()}`,
    `${base}/sensors.json?t=${Date.now()}`,
    `${base}/sensors/soil.json?t=${Date.now()}`,
    `${base}/latest.json?t=${Date.now()}`,
  ];

  for (const u of candidates) {
    try {
      const r = await tryFetchJson(u);
      tried.push({
        url: r.url,
        status: r.status,
        bodyPreview: r.bodyPreview,
      });

      if (!r.ok) continue;
      if (r.json === null || r.json === undefined) continue;

      return NextResponse.json({
        ok: true,
        normalizedUrl: base,
        payload: r.json,
        sourceUrl: u,
        tried,
      });
    } catch (e: any) {
      tried.push({
        url: u,
        status: 0,
        bodyPreview: "",
        error: e?.message || "fetch failed",
      });
    }
  }

  // heç nə tapılmadı
  return NextResponse.json({
    ok: false,
    error: "Firebase-dən oxuma alınmadı (Rules/path/empty payload).",
    normalizedUrl: base,
    tried,
  });
}
