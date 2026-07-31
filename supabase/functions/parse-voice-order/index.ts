import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { transcript, venue_id, zones } = await req.json()

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

    // Los platos que solo existen dentro de una carta —el postre del menú
    // ejecutivo— no tienen precio propio: dictarlos sueltos armaría un pedido
    // que el local no puede cobrar
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('venue_id', venue_id)
      .eq('is_available', true)
      .neq('in_main_menu', false)

    if (!products?.length) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const menuLines = products.map((p, i) => `${i}: ${p.name} — $${p.price}`).join('\n')

    type Zone = { id: string; name: string }
    const zonesArr = zones as Zone[] | undefined
    const zonesSection = zonesArr?.length
      ? `\n\nMESAS/UBICACIONES DISPONIBLES (índice: nombre):\n${zonesArr.map((z, i) => `${i}: ${z.name}`).join('\n')}\n- Si el mozo mencionó una mesa o ubicación, incluí su índice numérico en "zone_index".\n- Si no mencionó ninguna, omití "zone_index".`
      : ''

    const prompt = `Sos un asistente de toma de pedidos para un restaurante en Argentina. El mozo dictó por voz lo que pidió una mesa.

DICTADO DEL MOZO:
"${transcript}"

CARTA DISPONIBLE (formato índice: nombre — precio):
${menuLines}${zonesSection}

INSTRUCCIONES:
- Identificá qué productos mencionó el mozo, en qué cantidad, y si hay notas para cada ítem (ej: "sin sal", "bien cocido", "sin hielo", "a punto").
- Si dice "una", "un", "uno" sin cantidad explícita, asumí 1.
- Si menciona un apodo o variante coloquial (ej: "Quilmes" por cerveza, "napolitana" por milanesa napolitana), usá el más parecido de la carta.
- Si menciona algo genérico que abarca varios productos de la carta (ej: dice "cerveza" y hay cinco cervezas distintas, o "empanada" y hay de varios gustos), poné en "index" el más común y listá TODOS los índices que podrían corresponder en "options", del más probable al menos. Si la mención es inequívoca, omití "options".
- Si menciona algo que no existe en la carta, ignoralo.
- Para "note": solo aclaraciones específicas del ítem. Si no hay nota, usá "".
- Respondé ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.

FORMATO:
{"zone_index":2,"items":[{"index":0,"quantity":2,"note":"sin sal"},{"index":3,"quantity":1,"note":"","options":[3,8,11]}]}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
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
    console.log('[parse-voice-order] raw:', raw.substring(0, 400))

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let parsed: { zone_index?: number; items?: Array<{ index: number; quantity: number; note?: string; options?: number[] }> } = {}
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    const toProduct = (i: number) => ({
      product_id: products[i].id,
      product_name: products[i].name,
      product_price: products[i].price,
    })

    const result = (parsed.items || [])
      .filter(item => typeof item.index === 'number' && item.index >= 0 && item.index < products.length)
      .map(item => {
        // Alternativas para una mención genérica: "cerveza" cuando hay cinco.
        // Elegir por el cliente es adivinar; que decida él.
        const opts = (item.options || [])
          .filter(i => typeof i === 'number' && i >= 0 && i < products.length)
        const uniqueOpts = [...new Set([item.index, ...opts])]
        return {
          ...toProduct(item.index),
          quantity: Math.max(1, Math.round(item.quantity || 1)),
          note: item.note || '',
          options: uniqueOpts.length > 1 ? uniqueOpts.map(toProduct) : undefined,
        }
      })

    const zone_id = typeof parsed.zone_index === 'number' &&
      parsed.zone_index >= 0 &&
      zonesArr && parsed.zone_index < zonesArr.length
      ? zonesArr[parsed.zone_index].id
      : undefined

    console.log('[parse-voice-order] items:', result.length, '| zone_id:', zone_id)

    return new Response(JSON.stringify({ items: result, zone_id }), {
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
