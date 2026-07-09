import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { venue_id, hunger, budget, mood, dietary_restrictions } = await req.json()

    if (!venue_id) {
      return new Response(JSON.stringify({ error: 'venue_id required' }), {
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

    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase.from('categories').select('id, name').eq('venue_id', venue_id).eq('is_active', true).order('sort_order'),
      supabase.from('products').select('id, name, price, description, category_id, dietary_tags, is_featured, is_daily_special').eq('venue_id', venue_id).eq('is_available', true).order('sort_order'),
    ])

    console.log('[recommend-dish] products count:', products?.length ?? 'null')

    if (!products?.length) {
      return new Response(JSON.stringify({ error: 'No hay productos disponibles' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const catMap = Object.fromEntries((categories || []).map((c: { id: string; name: string }) => [c.id, c.name]))

    const menuLines = (products as Array<{
      id: string; name: string; price: number; description?: string;
      category_id: string; dietary_tags?: string[]; is_featured?: boolean
    }>).map(p => {
      const cat = catMap[p.category_id] || 'General'
      const tags = (p.dietary_tags || []).join(', ')
      const desc = p.description ? ` — "${p.description}"` : ''
      const featured = p.is_featured ? ' ⭐' : ''
      return `[${cat}] ${p.name}${featured} — $${p.price}${desc}${tags ? ` (${tags})` : ''}`
    }).join('\n')

    const hungerMap: Record<string, string> = {
      poco: 'poco hambre (quiere algo liviano, entrada o snack)',
      normal: 'hambre normal (plato principal estándar)',
      mucho: 'mucho hambre (quiere algo abundante, plato completo o combo)',
    }
    const moodMap: Record<string, string> = {
      liviano: 'algo liviano y fresco',
      contundente: 'algo contundente y satisfactorio',
      dulce: 'algo dulce o de pastelería',
      sorprendeme: 'lo que el restaurante tenga para destacar',
    }

    const restrictionsText = dietary_restrictions?.length
      ? `Restricciones dietarias del cliente: ${dietary_restrictions.join(', ')}. Solo recomendá platos compatibles.`
      : 'Sin restricciones dietarias.'

    const budgetText = budget
      ? `Presupuesto máximo del cliente: $${budget}. Solo recomendá platos dentro de ese precio.`
      : 'Sin límite de presupuesto.'

    const prompt = `Sos un asistente gastronómico para un restaurante. Tenés que recomendar platos de la carta según el perfil del cliente.

PERFIL DEL CLIENTE:
- Hambre: ${hungerMap[hunger] || 'normal'}
- ${budgetText}
- Le provoca: ${moodMap[mood] || 'sorprendeme'}
- ${restrictionsText}

CARTA DISPONIBLE (los ⭐ son destacados por el chef):
${menuLines}

INSTRUCCIONES:
- Recomendá EXACTAMENTE 2 platos de la carta (o 1 si la carta tiene menos de 2 opciones relevantes).
- SIEMPRE recomendá. Aunque ninguno sea perfecto, elegí los más cercanos al perfil del cliente.
- Los nombres deben coincidir exactamente con los de la carta.
- Para cada plato escribí una frase corta (máximo 20 palabras) en español argentino explicando por qué es ideal para este cliente ahora.
- Si hay platos ⭐, priorizalos si encajan con el perfil.
- Respondé ÚNICAMENTE con JSON válido. Sin markdown, sin texto antes ni después, sin explicaciones.

FORMATO DE RESPUESTA (respetá este esquema exacto):
{"recommendations":[{"name":"nombre exacto del plato","price":1234,"reason":"frase corta en español argentino"},{"name":"nombre exacto del plato","price":1234,"reason":"frase corta en español argentino"}]}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()
    if (geminiData.error) {
      const code = geminiData.error.code
      if (code === 503 || code === 429) throw new Error('El servicio de IA está muy ocupado ahora. Intentá de nuevo en un momento.')
      throw new Error('No pudimos conectarnos al servicio de recomendaciones. Intentá de nuevo.')
    }

    const parts: Array<{ text?: string; thought?: boolean }> = geminiData.candidates?.[0]?.content?.parts || []
    console.log('[recommend-dish] parts count:', parts.length, '| thought parts:', parts.filter(p => p.thought).length)

    const raw: string = parts.filter(p => !p.thought).map(p => p.text || '').join('') || '{}'
    console.log('[recommend-dish] raw (first 500):', raw.substring(0, 500))

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let parsed: { recommendations?: Array<{ name: string; price: number; reason: string }>; restaurant_pick?: { name: string; price: number } } = {}
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* use fallback */ }
    }
    console.log('[recommend-dish] parsed recs:', parsed.recommendations?.length ?? 'none')

    // Fallback: if Gemini returns no recommendations, pick the top featured product
    if (!parsed.recommendations?.length) {
      console.log('[recommend-dish] fallback triggered, products[0]:', products[0]?.name)
      const fallback = (products as Array<{ name: string; price: number; is_featured?: boolean }>)
        .find(p => p.is_featured) || (products as Array<{ name: string; price: number }>)[0]
      if (fallback) {
        parsed.recommendations = [{ name: fallback.name, price: fallback.price, reason: 'Una buena opción de nuestra carta para vos.' }]
      }
    }

    // Always include today's daily special, unless Gemini already recommended it
    const aiNames = new Set((parsed.recommendations || []).map((r: { name: string }) => r.name.toLowerCase()))
    const dailySpecial = (products as Array<{ name: string; price: number; is_daily_special?: boolean }>)
      .find(p => p.is_daily_special && !aiNames.has(p.name.toLowerCase()))
    if (dailySpecial) {
      parsed.restaurant_pick = { name: dailySpecial.name, price: dailySpecial.price }
    }

    console.log('[recommend-dish] final response recs:', parsed.recommendations?.length)
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('recommend-dish error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
