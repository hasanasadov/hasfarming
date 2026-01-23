// app/api/firebase/validate/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeFirebaseUrl(raw: string) {
  let url = raw.trim();

  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json$/i, "");
  url = url.replace(/\/+$/g, "");

  return url;
}

function isFirebaseDbUrl(url: string) {
  return url.includes("firebaseio.com") || url.includes("firebasedatabase.app");
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("url") || "";
  const url = normalizeFirebaseUrl(u);

  if (!url) {
    return NextResponse.json(
      { ok: false, error: "Firebase URL boşdur" },
      { status: 400 },
    );
  }

  if (!isFirebaseDbUrl(url)) {
    return NextResponse.json(
      { ok: false, error: "Düzgün Firebase Realtime Database URL deyil" },
      { status: 400 },
    );
  }

  try {
    const testUrl = `${url}.json?print=silent`;

    const r = await fetch(testUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        // User-Agent brauzerdə yox, serverdə olar
        "User-Agent": "AgriSense/1.0",
        Accept: "application/json",
      },
    });

    if (r.ok) {
      return NextResponse.json({
        ok: true,
        status: r.status,
        normalizedUrl: url,
      });
    }

    // Status-a görə mesaj
    let msg = `Firebase yoxlanıla bilmədi. Status: ${r.status}`;
    if (r.status === 401 || r.status === 403) {
      msg =
        "Firebase icazəsi yoxdur (401/403). Realtime Database Rules (read) yoxlayın.";
    } else if (r.status === 404) {
      msg = "Firebase URL tapılmadı (404). URL-i düz yazın.";
    } else if (r.status === 429) {
      msg = "Çox sorğu göndərildi (429). Bir az sonra yenidən yoxlayın.";
    }

    return NextResponse.json({
      ok: false,
      status: r.status,
      error: msg,
      normalizedUrl: url,
    });
  } catch (e: any) {
    console.error("Firebase validate error:", e?.message || e);
    return NextResponse.json(
      {
        ok: false,
        error: "Server Firebase-ə qoşula bilmədi (network/URL problem).",
      },
      { status: 500 },
    );
  }
}
