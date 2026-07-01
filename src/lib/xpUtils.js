import { supabaseStaff } from './supabase'

// Niveles y umbrales
export const LEVELS = [
  { name: 'Camarero Activo', minXP: 0, icon: '🎽' },
  { name: 'Mozo Veloz', minXP: 1000, icon: '⚡' },
  { name: 'Mozo Experto', minXP: 5000, icon: '⭐' },
  { name: 'Leyenda del Salón', minXP: 15000, icon: '👑' },
]

// Acciones y XP
export const XP_ACTIONS = {
  send_order: { label: 'Comanda enviada', xp: 10 },
  daily_streak: { label: 'Racha diaria', xp: 50 },
  first_order_of_day: { label: 'Primer pedido del día', xp: 15 },
  five_star_rating: { label: 'Calificación 5 estrellas', xp: 30 },
  ten_orders_in_shift: { label: '10 comandas en un turno', xp: 100 },
  tip_registered: { label: 'Propina registrada', xp: 5 },
  invite_waiter: { label: 'Mozo invitado', xp: 200 },
  order_cancelled: { label: 'Comanda cancelada', xp: -15 },
}

// Badges
export const BADGES = [
  { key: 'first_order', label: 'Primera comanda', icon: '🍽️', description: 'Enviaste tu primera comanda', xpBonus: 50 },
  { key: 'streak_7', label: 'Racha de 7 días', icon: '🔥', description: '7 días consecutivos usando Capy', xpBonus: 200 },
  { key: 'orders_100', label: '100 comandas', icon: '💯', description: 'Acumulaste 100 comandas totales', xpBonus: 300 },
  { key: 'gold_star', label: 'Estrella de Oro', icon: '⭐', description: '10 calificaciones de 5 estrellas', xpBonus: 250 },
  { key: 'first_invite', label: 'El que invita', icon: '🤝', description: 'Invitaste a tu primer mozo', xpBonus: 200 },
]

export function getLevel(xp) {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.minXP) current = level
  }
  return current
}

export function getNextLevel(xp) {
  return LEVELS.find(l => l.minXP > xp) || null
}

export function getXPProgress(xp) {
  const current = getLevel(xp)
  const next = getNextLevel(xp)
  if (!next) return { percent: 100, current: xp, needed: xp }
  const range = next.minXP - current.minXP
  const progress = xp - current.minXP
  return {
    percent: Math.round((progress / range) * 100),
    current: xp,
    needed: next.minXP
  }
}

// Función principal: otorgar XP
export async function awardXP(staffId, actionKey, venueId) {
  const action = XP_ACTIONS[actionKey]
  if (!action) return

  // Registrar transacción
  await supabaseStaff
    .from('xp_transactions')
    .insert({
      staff_id: staffId,
      venue_id: venueId,
      action: actionKey,
      xp_delta: action.xp
    })

  // Obtener XP actual
  const { data: staff } = await supabaseStaff
    .from('staff_names')
    .select('xp, total_orders, streak_days, last_login_date')
    .eq('id', staffId)
    .single()

  if (!staff) return

  const newXP = Math.max(0, (staff.xp || 0) + action.xp)
  const newLevel = getLevel(newXP).name

  // Actualizar XP y nivel
  const updates = { xp: newXP, level: newLevel }

  // Si es send_order, incrementar total_orders
  if (actionKey === 'send_order') {
    updates.total_orders = (staff.total_orders || 0) + 1
  }

  // Racha diaria
  if (actionKey === 'daily_streak' || actionKey === 'first_order_of_day') {
    const today = new Date().toISOString().split('T')[0]
    updates.last_login_date = today
  }

  await supabaseStaff
    .from('staff_names')
    .update(updates)
    .eq('id', staffId)

  // Chequear badges
  await checkBadges(staffId, { ...staff, xp: newXP, total_orders: updates.total_orders || staff.total_orders }, venueId)

  return { newXP, newLevel }
}

async function checkBadges(staffId, staff, venueId) {
  // Badges ya desbloqueados
  const { data: existing } = await supabaseStaff
    .from('staff_badges')
    .select('badge_key')
    .eq('staff_id', staffId)

  const unlocked = new Set((existing || []).map(b => b.badge_key))
  const toUnlock = []

  if (!unlocked.has('first_order') && staff.total_orders >= 1) toUnlock.push('first_order')
  if (!unlocked.has('orders_100') && staff.total_orders >= 100) toUnlock.push('orders_100')
  if (!unlocked.has('streak_7') && staff.streak_days >= 7) toUnlock.push('streak_7')

  for (const badgeKey of toUnlock) {
    const badge = BADGES.find(b => b.key === badgeKey)
    if (!badge) continue

    await supabaseStaff.from('staff_badges').insert({ staff_id: staffId, badge_key: badgeKey })

    // XP bonus por badge
    if (badge.xpBonus) {
      await supabaseStaff.from('xp_transactions').insert({
        staff_id: staffId,
        venue_id: ACTIVE_VENUE_ID,
        action: `badge_${badgeKey}`,
        xp_delta: badge.xpBonus
      })
      await supabaseStaff
        .from('staff_names')
        .update({ xp: staff.xp + badge.xpBonus })
        .eq('id', staffId)
    }
  }

  return toUnlock
}
