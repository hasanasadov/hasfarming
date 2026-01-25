// app/api/chat/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "user" | "assistant";
type IncomingMessage = { role: Role; content: string };

function buildSystemPrompt(context: any) {
  // Context JSON-u AI üçün oxunaqlı veririk
  const ctx = context ? JSON.stringify(context, null, 2) : "{}";

  return `
Sən Bərəkət platformasının peşəkar aqronom köməkçisisən.
Dil: Azərbaycan dili.

Sənə "context" verilir. Sən MÜTLƏQ bu context-ə əsaslanmalısan.
Context JSON:
${ctx}

QAYDALAR:
1) Əsas cavab həmişə "selectedDay" (seçilmiş gün) üzərindən verilsin.
   - Əgər selectedDay yoxdursa: current.weather + forecast7[0] ilə işlət.
2) Sensor prioritet:
   - context.meta.sensorPriority === true olduqda (firebase və dayIndex=0) torpaq nəmliyi/temperatur üçün sensor dəyərlərini üstün tut.
3) Müqayisə bacarığı:
   - İstifadəçi "sabah", "3 gün", "bu həftə" deyirsə forecast7 içindən uyğun günləri müqayisə et.
4) Əgər data çatmırsa:
   - Maks 2 qısa sual ver
   - Yenə də 1 praktik tövsiyə yaz (məlum olan dəyərlərlə)
5) Format:
   - 1 cümlə nəticə
   - 3–6 maddə tövsiyə (bullets)
   - Sonda "✅ Tamamlandı"
6) Qətiyyən uydurma rəqəm yazma. Dəyər yoxdursa "N/A" de.

TONE:
- Qısa, konkret, aqronom üslubu.
- Təhlükə varsa (kəskin susuzluq, çox yağış, ekstremal temperatur) birinci bənddə xəbərdar et.
`.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages = [],
      context = null,
      check = false,
    } = body as {
      messages?: IncomingMessage[];
      context?: any;
      check?: boolean;
    };

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "API Key tapılmadı (GOOGLE_API_KEY)." },
        { status: 500 },
      );
    }

    // health-check quota yeməsin
    if (check) return Response.json({ status: "ok" });

    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

    const sys = buildSystemPrompt(context);

    // ✅ 1) system prompt ayrıca birinci mesajdır
    const contents: any[] = [
      { role: "user", parts: [{ text: `SİSTEM:\n${sys}` }] },
    ];

    // ✅ 2) sonra chat tarixçəsi gəlir
    for (const m of messages) {
      if (!m?.content?.trim()) continue;
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      });
    }

    if (contents.length === 1) {
      return Response.json({ text: "Sualınızı yazın 🙂" });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.25,
          topP: 0.8,
          maxOutputTokens: 3000,
        },
      }),
    });

    const raw = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {}

    if (!res.ok) {
      // 429-u düzgün qaytar
      if (res.status === 429) {
        const retryDelay =
          data?.error?.details?.find((d: any) =>
            String(d["@type"] || "").includes("RetryInfo"),
          )?.retryDelay || "10s";

        return Response.json(
          { error: "Rate limit doldu", status: 429, retryDelay },
          { status: 429 },
        );
      }

      console.error("Gemini API Error:", res.status, raw);
      return Response.json(
        { error: `API Xətası: ${res.status}` },
        { status: 500 },
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join("") || "";

    return Response.json({
      text: text || "Cavab boş gəldi. Başqa sual ver 🙂",
    });
  } catch (e: any) {
    console.error("Server Xətası:", e);
    return Response.json(
      { error: "Xəta baş verdi: " + (e?.message || "Unknown error") },
      { status: 500 },
    );
  }
}
