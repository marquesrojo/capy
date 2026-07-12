import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { transcript, venue_id } = await req.json()

    if (!transcript || !venue_id) {
      return new Response(JSON.stringify({ error: 'transcript and venue_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: products } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('venue_id', venue_id)
      .eq('is_available', true)

    if (!products?.length) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const menuLines = products.map((p, i) => `${i}: ${p.name} — $${p.price}`).join('\n')

    const prompt = `Sos un asistente de toma de pedidos para un restaurante en Argentina. El mozo dictó por voz lo que pidió una mesa.

DICTADO DEL MOZO:
"${transcript}"

CARTA DISPONIBLE (formato índice: nombre — precio):
${menuLines}

INSTRUCCIONES:
- Identificá qué productos de la carta mencionó el mozo y en qué cantidad.
- Si dice "una", "un", "uno" sin cantidad explícita, asumí 1.
- Si menciona un apodo o variante coloquial de un producto (ej: "Quilmes" por una cerveza, "napolitana" por milanesa napolitana), buscá el más parecido en la carta.
- Si menciona algo que no existe en la carta, ignoralo.
- Respondé ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.

FORMATO (usá los índices de la carta):
{"items":[{"index":0,"quantity":2},{"index":3,"quantity":1}]}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()
    if (geminiData.error) {
      const code = geminiData.error.code
      if (code === 503 || code === 429) throw new Error('El servicio de IA está muy ocupado. Intentá de nuevo.')
      throw new Error('Error al conectar con el servicio de IA.')
    }

    const parts: Array<{ text?: string; thought?: boolean }> = geminiData.candidates?.[0]?.content?.parts || []
    const raw = parts.filter(p => !p.thought).map(p => p.text || '').join('')

    console.log('[parse-voice-order] transcript:', transcript)
    console.log('[parse-voice-order] raw response:', raw.substring(0, 300))

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let parsed: { items?: Array<{ index: number; quantity: number }> } = {}
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fallback to empty */ }
    }

    const result = (parsed.items || [])
      .filter(item => typeof item.index === 'number' && item.index >= 0 && item.index < products.length)
      .map(item => ({
        product_id: products[item.index].id,
        product_name: products[item.index].name,
        product_price: products[item.index].price,
        quantity: Math.max(1, Math.round(item.quantity || 1)),
      }))

    console.log('[parse-voice-order] result items:', result.length)

    return new Response(JSON.stringify({ items: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('parse-voice-order error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
