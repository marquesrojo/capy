// Link que el cliente le manda al local por WhatsApp junto con el detalle del
// pedido. WhatsApp arma una tarjeta con imagen para cualquier página que tenga
// metadatos —y si no encuentra og:image se queda con el apple-touch-icon—, así
// que el chat del local termina siendo una pila de logos repetidos.
//
// Al robot le devolvemos un documento sin nada que mostrar: sin título, sin
// og:*, sin íconos. Sin metadatos no hay tarjeta, y el mensaje queda como
// texto con un link. A la persona que toca el link la mandamos al tablero.
const CRAWLERS = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot/i

export default function handler(req, res) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const ua = req.headers['user-agent'] || ''

  if (CRAWLERS.test(ua)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Vary', 'User-Agent')
    res.send('<!DOCTYPE html><html lang="es"><head></head><body></body></html>')
    return
  }

  res.writeHead(302, {
    Location: id ? `/admin?order=${encodeURIComponent(id)}` : '/admin',
    'Cache-Control': 'no-store',
    Vary: 'User-Agent',
  })
  res.end()
}
