const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getPeriodStart(period) {
  const d = new Date()
  if (period === 'month') {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }
  if (period === 'year') {
    return new Date(d.getFullYear(), 0, 1)
  }
  // week: Monday of current week
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtShort(d) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function periodLabel(start, period) {
  if (period === 'year') return String(new Date().getFullYear())
  if (period === 'month') return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return `${fmtShort(start)} – ${fmtShort(new Date())}`
}

function calcArchetype(orders, feedback, period = 'week') {
  const count = orders.length
  const fiveStarPct = feedback.length
    ? (feedback.filter(f => f.rating === 5).length / feedback.length) * 100
    : 0
  const mult = period === 'year' ? 52 : period === 'month' ? 4 : 1

  if (count >= 40 * mult)
    return { name: 'Flash del Salón', emoji: '⚡', desc: 'Velocidad pura. Ningún pedido te para.' }
  if (fiveStarPct === 100 && feedback.length >= 5 * mult)
    return { name: 'Encantador de Dulces', emoji: '🍰', desc: 'Efectividad perfecta. Tus clientes te aman.' }
  if (count >= 20 * mult)
    return { name: 'Tanque de la Barra', emoji: '🛡️', desc: 'Sólido y confiable. El salón te necesita.' }
  if (fiveStarPct >= 80 && feedback.length >= 3 * mult)
    return { name: 'Imán de Estrellas', emoji: '⭐', desc: 'Tus clientes no paran de felicitarte.' }
  return { name: 'El Rookie', emoji: '🌟', desc: 'Cada semana suma. Seguí creciendo.' }
}

export async function getWeeklyWrappedData(supabase, staffId, period = 'week') {
  const periodStart = getPeriodStart(period)

  const [ordersRes, feedbackRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at, total, status')
      .eq('assigned_staff_id', staffId)
      .gte('created_at', periodStart.toISOString())
      .neq('status', 'cancelado'),
    supabase
      .from('order_feedback')
      .select('rating, notes, created_at')
      .eq('staff_id', staffId)
      .gte('created_at', periodStart.toISOString()),
  ])

  const orders = ordersRes.data || []
  const feedback = feedbackRes.data || []

  const countByDay = {}
  orders.forEach(o => {
    const day = new Date(o.created_at).getDay()
    countByDay[day] = (countByDay[day] || 0) + 1
  })
  const bestDayEntry = Object.entries(countByDay).sort(([, a], [, b]) => b - a)[0]
  const bestDay = bestDayEntry
    ? { name: DAY_NAMES[Number(bestDayEntry[0])], count: bestDayEntry[1] }
    : null

  const fiveStars = feedback.filter(f => f.rating === 5)
  const fiveStarPct = feedback.length
    ? Math.round((fiveStars.length / feedback.length) * 100)
    : 0
  const bestComment = fiveStars
    .filter(f => f.notes?.trim().length > 10)
    .sort((a, b) => b.notes.length - a.notes.length)[0]?.notes || null

  return {
    period: periodLabel(periodStart, period),
    orders: { total: orders.length, bestDay },
    ratings: { total: feedback.length, fiveStarPct, bestComment },
    archetype: calcArchetype(orders, feedback, period),
    empty: orders.length === 0 && feedback.length === 0,
  }
}
