// Modelo freemium del camarero: lectura de cupos de IA e inicio del pago
// del Pack Pro / recarga de cartas por Mercado Pago.
// Ver docs/modelo-economico-camarero.md
import { supabaseStaff } from './supabase'

// Snapshot de cupos del camarero logueado
// → { pro, voice_used, voice_limit, voice_remaining, carta_quota, cartas_used, carta_remaining }
export async function getCamareroQuota() {
  const { data: { user } } = await supabaseStaff.auth.getUser()
  if (!user) return null
  const { data, error } = await supabaseStaff.rpc('get_camarero_quota', { p_staff: user.id })
  if (error) return null
  return data
}

// Inicia el checkout de Mercado Pago para el Pack Pro (o recarga de cartas).
// Devuelve la URL de pago (init_point) para redirigir.
export async function startCamareroProCheckout(kind = 'pro') {
  const { data: { session } } = await supabaseStaff.auth.getSession()
  if (!session) return { error: 'Sesión expirada, volvé a iniciar sesión' }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-camarero-pro-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ kind }),
  })
  const data = await res.json()
  if (data.error) return { error: data.error }
  return { url: data.init_point || data.sandbox_init_point }
}
