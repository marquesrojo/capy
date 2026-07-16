// Vercel Cron — runs daily at 23:00 ART (02:00 UTC)
// Calls the Supabase Edge Function that queries all stats and sends the email.
export default async function handler(req, res) {
  // Vercel cron requests come with this header for verification
  if (req.headers['x-vercel-cron'] !== '1' && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase env vars' })
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
    const data = await r.json()
    return res.status(r.ok ? 200 : 502).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
