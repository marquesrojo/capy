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
// normal (email + contraseña).
export const supabaseStaff = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-staff-auth' // separado del storage del cliente
  }
})

export const supabaseCamaut = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-camaut-auth'
  }
})

// Cliente de Supabase para clientes SIN LOGIN visible.
// crea una sesion real con su propio auth.uid(), sin pedir email ni
// contraseña, y sin depender de headers custom (que el navegador bloquea
// por una limitacion de CORS de PostgREST que no se puede configurar).
// La sesion queda guardada en este dispositivo via localStorage, gestionada
// automaticamente por el SDK de Supabase.
export const supabaseCustomer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-customer-auth' // separado del storage del staff
  }
})

// ID del venue activo. Se inicializa con la variable de entorno (para el
// venue por defecto de Pucará) y se sobreescribe dinámicamente al cargar
// el perfil del admin (useAuth) o al resolver el slug de la URL del cliente
// (useVenue). Todos los archivos que importan ACTIVE_VENUE_ID obtienen el
// valor actual en tiempo de ejecución gracias a las live bindings de ESM.
export let ACTIVE_VENUE_ID = import.meta.env.VITE_VENUE_ID || '00000000-0000-0000-0000-000000000001'

export function setActiveVenueId(id) {
  if (id) ACTIVE_VENUE_ID = id
}
