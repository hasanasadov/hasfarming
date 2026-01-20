import { generateText } from 'ai'

export async function POST(request: Request) {
  const { message, context } = await request.json()

  const systemPrompt = `Sən AgriSense - Smart Farming platformasının AI köməkçisisən. 
Sən kənd təsərrüfatı, əkinçilik, torpaq, hava şəraiti və bitki yetişdirmə sahəsində mütəxəssissən.

İstifadəçinin hazırki məlumatları:
${context ? `
- Məkan: ${context.location?.address || 'Təyin edilməyib'}
- Cari temperatur: ${context.weather?.temp || 'N/A'}°C
- Rütubət: ${context.weather?.humidity || 'N/A'}%
- Torpağın nəmliyi: ${context.soilMoisture || 'N/A'}%
- Seçilmiş bitki: ${context.crop?.nameAz || 'Təyin edilməyib'}
- pH səviyyəsi: ${context.ph || 'N/A'}
` : 'Məlumat yoxdur'}

Qaydalar:
1. Həmişə Azərbaycan dilində cavab ver
2. Kənd təsərrüfatı ilə bağlı konkret, praktik məsləhətlər ver
3. İstifadəçinin verilən məlumatlarına əsaslanaraq fərdi tövsiyələr ver
4. Cavabları qısa və aydın saxla
5. Lazım gələrsə, suvarma, gübrələmə, xəstəliklərdən qorunma barədə məsləhətlər ver`

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    prompt: message,
    maxOutputTokens: 1000,
  })

  return Response.json({ text })
}
