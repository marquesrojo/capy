// Vercel Cron — runs daily at 23:00 ART (02:00 UTC)
// Calls the Supabase Edge Function that queries all stats and sends the email.
export default async function handler(req, res) {
  // Vercel avisa que la llamada es del cron de dos formas, y cuál llega depende
  // de si CRON_SECRET está definido en el proyecto. Si ninguna coincide esto
  // devolvía 401 sin decir nada, y el reporte dejaba de salir sin que nadie se
  // entere: el log tiene que poder explicar por qué.
  const secret = process.env.CRON_SECRET
  const porHeader = req.headers['x-vercel-cron'] === '1'
  const porSecreto = !!secret && req.headers.authorization === `Bearer ${secret}`

  if (!porHeader && !porSecreto) {
    const motivo = {
      error: 'Unauthorized',
      recibio_header_cron: !!req.headers['x-vercel-cron'],
      recibio_authorization: !!req.headers.authorization,
      cron_secret_configurado: !!secret,
    }
    console.error('[cron-daily-report] rechazado', motivo)
    return res.status(401).json(motivo)
  }
  console.log('[cron-daily-report] disparando', { porHeader, porSecreto })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Las VITE_ existen para el build; si el proyecto no las expone también a
    // las funciones, esto falla todos los días a la misma hora
    const motivo = { error: 'Missing Supabase env vars', tiene_url: !!supabaseUrl, tiene_key: !!supabaseKey }
    console.error('[cron-daily-report]', motivo)
    return res.status(500).json(motivo)
  }

  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/daily-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({}),
    })
    const data = await r.json().catch(() => null)
    console.log('[cron-daily-report] respuesta', r.status, JSON.stringify(data))
    return res.status(r.ok ? 200 : 502).json(data ?? { status: r.status })
  } catch (err) {
    console.error('[cron-daily-report] error llamando a la función', err.message)
    return res.status(500).json({ error: err.message })
  }
}
