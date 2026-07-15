import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const passParams = new URLSearchParams()
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'slug') passParams.set(k, v)
  }

  const appBase = Deno.env.get('APP_URL') || 'https://www.capyapp.co'
  const paramsStr = passParams.toString()
  const redirectUrl = `${appBase}/r/${slug}/${paramsStr ? `?${paramsStr}` : ''}`

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: venue } = await supabase
    .from('venues')
    .select('name, logo_url')
    .eq('slug', slug)
    .single()

  const venueName = venue?.name || 'Capy'
  const logoUrl = venue?.logo_url || `${appBase}/icon-512.png`
  const locationLabel = url.searchParams.get('location_label') || ''

  const ogTitle = venueName
  const ogDescription = locationLabel
    ? `Unite a ${locationLabel} en ${venueName}`
    : `Pedí desde tu mesa en ${venueName}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(ogTitle)}</title>
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${escapeHtml(logoUrl)}">
  <meta property="og:url" content="${escapeHtml(redirectUrl)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(logoUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
  <script>window.location.replace(${JSON.stringify(redirectUrl)})</script>
</head>
<body>
  <p>Redirigiendo a ${escapeHtml(venueName)}…</p>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})
