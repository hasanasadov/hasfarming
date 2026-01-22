// app/api/chat/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "user" | "assistant";
type IncomingMessage = { role: Role; content: string };

function buildSystemPrompt(context: any) {
  const cropName = context?.crop?.nameAz ?? "Seçilməyib";
  const temp = context?.weather?.temp ?? "N/A";
  const humidity = context?.weather?.humidity ?? "N/A";
  const soilMoisture = context?.soilMoisture ?? "N/A";

  return (
    `SİSTEM TƏLİMATI:\n` +
    `Sən AgriSense platformasının peşəkar aqronom köməkçisisən.\n` +
    `Sən istənilən suala (suvarma, gübrələmə, xəstəlik riski, torpaq, hava, sensor oxunuşları, məhsuldarlıq və s.) düzgün cavab verməlisən.\n` +
    `Dil: Azərbaycan dili.\n` +
    `HƏDƏF: Həmişə konkret və TAMAMLANMIŞ cavab ver.\n` +
    `Qaydalar:\n` +
    `- Heç vaxt “aşağıdakıları nəzərə alın:” kimi yarımçıq cümlə ilə dayanma.\n` +
    `- Hər cavabda mütləq ən az 1 konkret tövsiyə / addım yaz.\n` +
    `- Məlumat çatmırsa: 2 qısa dəqiqləşdirici sual ver, amma yenə də ilkin praktik tövsiyə ver.\n` +
    `- Format:\n` +
    `  1) Qısa cavab (1-2 cümlə)\n` +
    `  2) Addımlar / Tövsiyələr (3-7 bənd)\n` +
    `  3) Risk/Qeyd + 1-2 sual (lazımdırsa)\n` +
    `Kontekst:\n` +
    `- Bitki: ${cropName}\n` +
    `- Hava: ${temp}°C, rütubət: ${humidity}\n` +
    `- Torpaq rütubəti (sensor): ${soilMoisture}\n` +
    `---\n`
  );
}

function looksIncomplete(text: string) {
  const t = (text || "").trim();
  return (
    t.length < 60 ||
    /aşağıdakıları nəzərə alın[:.]?\s*$/i.test(t) ||
    /nəzərə alın[:.]?\s*$/i.test(t) ||
    t.endsWith(":")
  );
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

    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

    // ---- HEALTH CHECK ----
    if (check) {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        console.error("Health Check Error:", r.status, errText);
        return Response.json(
          { error: `Google API qoşulmadı: ${r.status}` },
          { status: 500 },
        );
      }

      return Response.json({ status: "ok" });
    }

    // ---- SYSTEM PROMPT ----
    const systemPrompt = buildSystemPrompt(context);

    // ---- messages -> contents ----
    const cleaned = (messages as IncomingMessage[])
      .filter((m) => m?.content?.trim())
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    if (cleaned.length === 0) {
      return Response.json({ text: "Sualınızı yazın 🙂" });
    }

    // system prompt-u son user mesajına əlavə et
    for (let i = cleaned.length - 1; i >= 0; i--) {
      if (cleaned[i].role === "user") {
        cleaned[i].parts[0].text =
          systemPrompt + `İSTİFADƏÇİ SUALI:\n` + cleaned[i].parts[0].text;
        break;
      }
    }

    // ---- 1) Main call ----
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: cleaned,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 900,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API Error:", res.status, errText);
      return Response.json(
        { error: `API Xətası: ${res.status}` },
        { status: 500 },
      );
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];

    let text =
      candidate?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join("") || "";

    // ---- 2) Repair retry (əgər natamamdırsa 1 dəfə təkrar) ----
    if (looksIncomplete(text)) {
      const repairedContents = structuredClone(cleaned);

      // son user mesajına “tamamla” göstərişi əlavə et
      for (let i = repairedContents.length - 1; i >= 0; i--) {
        if (repairedContents[i].role === "user") {
          repairedContents[i].parts[0].text =
            repairedContents[i].parts[0].text +
            "\n\nZƏHMƏT OLMASA: Cavabı tamamlayaq. Mütləq konkret addımlar və nümunə ver. Yarımçıq cümlə ilə dayanma.";
          break;
        }
      }

      const retryRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: repairedContents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 900,
          },
        }),
      });

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryText =
          retryData?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text)
            .filter(Boolean)
            .join("") || "";

        // daha dolu cavab gəlibsə onu götür
        if (retryText.trim().length > (text || "").trim().length) {
          text = retryText;
        }
      }
    }

    return Response.json({
      text: text || "Cavab boş gəldi. Başqa sual ver 🙂",
    });
  } catch (error: any) {
    console.error("Server Xətası:", error);
    return Response.json(
      { error: "Xəta baş verdi: " + (error?.message || "Unknown error") },
      { status: 500 },
    );
  }
}
