// app/api/firebase/validate/route.ts
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

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("url") || "";
  const base = normalizeFirebaseBaseUrl(u);

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

  // shallow=true => böyük payload gətirmir, sadəcə mövcudluq yoxlayır
  const testUrl = `${base}/.json?shallow=true&t=${Date.now()}`;

  try {
    const r = await fetch(testUrl, {
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

    if (!r.ok) {
      let msg = `Firebase yoxlanıla bilmədi. Status: ${r.status}`;
      if (r.status === 401 || r.status === 403) {
        msg =
          "Firebase icazəsi yoxdur (401/403). Realtime Database Rules (read) yoxlayın.";
      } else if (r.status === 404) {
        msg = "Firebase URL tapılmadı (404). URL-i düz yazın.";
      } else if (r.status === 429) {
        msg = "Çox sorğu göndərildi (429). Bir az sonra yenidən yoxlayın.";
      }

      return NextResponse.json(
        {
          ok: false,
          error: msg,
          status: r.status,
          normalizedUrl: base,
          testUrl,
          bodyPreview: text?.slice(0, 200) || "",
        },
        { status: 200 }, // UI rahat parse etsin deyə
      );
    }

    // ok olsa da payload null ola bilər (tam boş DB)
    return NextResponse.json({
      ok: true,
      status: r.status,
      normalizedUrl: base,
      testUrl,
      shallow: json,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server Firebase-ə qoşula bilmədi (network/URL/timeout).",
        normalizedUrl: base,
        testUrl,
        name: e?.name || "Error",
        message: e?.message || "fetch failed",
      },
      { status: 200 },
    );
  }
}
