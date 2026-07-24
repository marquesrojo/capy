// Modelo freemium del camarero: cupo de imágenes con IA.
// Voz: gratis, sin límite. Imágenes de carta: 10 gratis; al superarlas se
// compra un pack (10 por $8.000) con el mismo Mercado Pago que las imágenes
// IA del venue. Ver docs/modelo-economico-camarero.md
import { supabaseStaff } from './supabase'

// Snapshot del cupo de imágenes del camarero logueado → { quota, used, remaining }
export async function getImageQuota() {
  const { data: { user } } = await supabaseStaff.auth.getUser()
  if (!user) return null
  const { data, error } = await supabaseStaff.rpc('get_camarero_image_quota', { p_staff: user.id })
  if (error) return null
  return data
}

// Precio vigente del pack (capy_settings) para mostrarlo en el cartel.
export async function getImagePackPrice() {
  const { data } = await supabaseStaff
    .from('capy_settings')
    .select('camarero_image_pack_price')
    .eq('id', 1)
    .maybeSingle()
  return Number(data?.camarero_image_pack_price || 8000)
}

// Procesa una imagen de menú con IA gateando el cupo server-side.
// Devuelve { items } | { quota_exceeded, quota } | { error }.
export async function parseMenuImage(file) {
  const { data: { session } } = await supabaseStaff.auth.getSession()
  if (!session) return { error: 'Sesión expirada, volvé a iniciar sesión' }
  const imageBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => resolve(String(ev.target.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-menu-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ imageBase64, mimeType: file.type }),
  })
  return res.json()
}

// Inicia el checkout de Mercado Pago para comprar un pack de imágenes.
// Devuelve { url } para redirigir, o { error }.
export async function startImagePackCheckout() {
  const { data: { session } } = await supabaseStaff.auth.getSession()
  if (!session) return { error: 'Sesión expirada, volvé a iniciar sesión' }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-camarero-image-payment`, {
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
