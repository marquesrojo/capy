import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y completa los valores de tu proyecto Supabase.'
  )
}

// Cliente de Supabase para el STAFF (camarero/admin). Usa Supabase Auth
// normal (email + contraseña), por eso Realtime funciona sin problemas:
// las policies de staff se basan en auth.uid(), no en headers custom.
export const supabaseStaff = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-staff-auth' // separado del storage del cliente
  }
})

// Cliente de Supabase para clientes SIN LOGIN. Se identifican por un
// device_token guardado en localStorage, mandado en cada request via
// el header 'x-device-token'. Las policies de RLS de orders/customers
// leen ese header con current_customer_id() (ver migracion 0004).
//
// IMPORTANTE: este cliente nunca debe usarse para Realtime/postgres_changes
// - hay un bug conocido de Supabase donde los headers custom no se mandan
// en la conexion WebSocket, asi que cualquier policy de RLS basada en
// headers fallaria silenciosamente ahi. Para "tiempo real" del lado del
// cliente se usa polling liviano (ver useOrderPolling).
function createCustomerClient() {
  const deviceToken = getOrCreateDeviceToken()
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: { 'x-device-token': deviceToken }
    }
  })
}

const DEVICE_TOKEN_KEY = 'device_token'

export function getOrCreateDeviceToken() {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(DEVICE_TOKEN_KEY, token)
  }
  return token
}

export const supabaseCustomer = createCustomerClient()

// ID del venue activo. En el MVP hay un solo local;
// si en el futuro hay multi-local, esto se resuelve por subdominio o selector.
export const ACTIVE_VENUE_ID = import.meta.env.VITE_VENUE_ID || '00000000-0000-0000-0000-000000000001'
