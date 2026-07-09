import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Sos Capy, el asistente virtual de Capy App — la plataforma de pedidos digitales para restaurantes y bares. Respondés en español argentino, de manera amigable, directa y práctica.

Ayudás a los dueños de locales y a los camareros con:
- Configuración de Capy: zonas, mesas, categorías, productos, métodos de pago, QR
- Gestión de pedidos y kitchen display
- Programa de fidelización de clientes (rangos y puntos)
- Retiro en local y delivery
- Onboarding y primeros pasos con la plataforma
- Tips de atención al cliente en gastronomía
- Tips de diseño de carta, precios y descripción de platos
- Gestión de turnos, picos de demanda y equipos en venues gastronómicos

Si el usuario tiene un problema técnico que no podés resolver, sugerí que abra un ticket de soporte con el botón que aparece en el chat.

Respondé de manera concisa (máximo 3-4 párrafos). Usá listas cuando ayude a la claridad. Evitá respuestas genéricas — sé específico para el contexto de un restaurante o bar.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, venue_id, venue_name, staff_id, chat_id, source } = await req.json()

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
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

    let systemPrompt = SYSTEM_PROMPT
    if (venue_name) systemPrompt += `\n\nEl usuario trabaja en el local: "${venue_name}".`

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )

    const geminiData = await geminiRes.json()
    if (geminiData.error) throw new Error(geminiData.error.message || 'Gemini error')

    const reply: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const fullMessages = [...messages, { role: 'assistant', content: reply }]

    let activeChatId = chat_id
    if (chat_id) {
      await supabase.from('support_chats')
        .update({ messages: fullMessages, updated_at: new Date().toISOString() })
        .eq('id', chat_id)
    } else {
      const { data: newChat } = await supabase.from('support_chats').insert({
        venue_id: venue_id || null,
        staff_id: staff_id || null,
        messages: fullMessages,
        source: source || 'venue_admin',
      }).select('id').single()
      activeChatId = newChat?.id
    }

    return new Response(JSON.stringify({ reply, chat_id: activeChatId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('capy-chat error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
