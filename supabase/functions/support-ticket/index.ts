import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { staff_id, staff_name, message } = await req.json()
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Extraer email del usuario desde el token JWT
  let staffEmail: string | null = null
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    staffEmail = user?.email || null
  }

  await supabase.from('support_tickets').insert({
    staff_id: staff_id || null,
    staff_name: staff_name || null,
    staff_email: staffEmail,
    message: message.trim(),
  })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'soporte@capyapp.co',
        to: 'matias@bravosm.com',
        subject: `[Soporte Capy] Mensaje de ${staff_name || 'Camarero'}`,
        html: `
          <h2>Nuevo ticket de soporte</h2>
          <p><b>De:</b> ${staff_name || 'Sin nombre'}</p>
          ${staffEmail ? `<p><b>Email:</b> ${staffEmail}</p>` : ''}
          <p><b>Mensaje:</b></p>
          <p>${message.trim().replace(/\n/g, '<br>')}</p>
        `,
      }),
    }).catch(() => {})
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
