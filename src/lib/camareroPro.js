// Modelo freemium del camarero: cupo de cartas con IA.
// Voz: gratis, sin límite. Cartas: 10 gratis; al superarlas se compra un pack
// con el mismo Mercado Pago que las imágenes IA del venue.
// Ver docs/modelo-economico-camarero.md
import { supabaseStaff } from './supabase'

// Snapshot del cupo de cartas del camarero logueado
// → { quota, used, remaining }
export async function getCartaQuota() {
  const { data: { user } } = await supabaseStaff.auth.getUser()
  if (!user) return null
  const { data, error } = await supabaseStaff.rpc('get_camarero_carta_quota', { p_staff: user.id })
  if (error) return null
  return data
}

// Inicia el checkout de Mercado Pago para comprar un pack de cartas.
// Devuelve { url } para redirigir, o { error }.
export async function startCartaPackCheckout() {
  const { data: { session } } = await supabaseStaff.auth.getSession()
  if (!session) return { error: 'Sesión expirada, volvé a iniciar sesión' }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-camarero-carta-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  })
  const data = await res.json()
  if (data.error) return { error: data.error }
  return { url: data.init_point || data.sandbox_init_point }
}
