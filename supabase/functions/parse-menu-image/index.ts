import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Procesa una imagen de menú con IA (Gemini) para el camarero, consumiendo su
// cupo de imágenes de forma atómica y server-side. Devuelve los productos
// detectados. Si superó el cupo (10 gratis + packs comprados), responde
// quota_exceeded para que el front muestre el cartel de pago.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function gemini(geminiKey: string, contents: unknown) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents }) },
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'gemini_error')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mimeType } = await req.json() as { imageBase64?: string; mimeType?: string }
    if (!imageBase64 || !mimeType) return json({ error: 'imageBase64 y mimeType requeridos' }, 400)

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) return json({ error: 'GEMINI_API_KEY no configurada' }, 500)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Identificar al camarero
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } = { user: null } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ error: 'No autorizado' }, 401)

    // Consumir 1 imagen del cupo (atómico). Si no hay cupo → cartel de pago.
    const { data: quota } = await supabase.rpc('consume_ia_image', { p_staff: user.id })
    if (!quota || quota.allowed === false) {
      return json({ quota_exceeded: true, quota })
    }

    try {
      // PASO 1: transcribir el texto de la imagen
      const transcript = await gemini(geminiKey, [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: 'Transcribí exactamente todo el texto que ves en esta imagen. Incluí nombres, precios y categorías tal como aparecen. No agregues nada extra.' },
        ],
      }])
      if (!transcript) throw new Error('sin_texto')

      // PASO 2: convertir a JSON de productos
      const parsed = await gemini(geminiKey, [{
        parts: [{
          text: `Este es el texto de un menú de restaurante:\n\n${transcript}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"Milanesa","price":2500,"category":"Platos principales"}]`,
        }],
      }])
      const match = parsed.match(/\[[\s\S]*\]/)
      const items = JSON.parse(match ? match[0] : '[]')
      return json({ items, quota })
    } catch (e) {
      // Devolver la imagen consumida: la IA falló, no corresponde cobrarla
      await supabase.rpc('refund_ia_image', { p_staff: user.id })
      const msg = (e as Error).message || ''
      const overloaded = /high demand|overload|capacity|try again later/i.test(msg)
      return json({
        error: overloaded
          ? 'La IA tiene mucha demanda en este momento. Esperá unos minutos e intentá de nuevo.'
          : 'No se pudo analizar la imagen. Intentá de nuevo.',
      })
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
