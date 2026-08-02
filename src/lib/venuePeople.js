import { supabaseStaff } from './supabase'

// Las listas de grupos y de categorías de descuento se arman sobre los clientes
// del local. Pero el personal también entra: la casa le hace precio a su gente,
// y el menú de empleados es una carta como cualquier otra.
//
// Un empleado no aparece entre los clientes hasta que pide desde la página con
// su cuenta. Estas dos funciones lo traen igual y le abren la ficha cuando hace
// falta.

const ROLE_LABELS = {
  propietario: 'Propietario',
  admin: 'Encargado',
  camarero: 'Camarero',
  cocina: 'Cocina',
}

// Personal propio y vinculado. Por RPC porque el email vive en auth.users.
// Devuelve filas con la misma forma que las de clientes, para que las pantallas
// no tengan que distinguir: lo único que agrega es de qué es cada uno.
export async function fetchVenueStaff(venueId) {
  const { data, error } = await supabaseStaff.rpc('venue_staff_candidates', { p_venue_id: venueId })
  if (error) return []
  return (data || []).map(s => ({
    id: s.profile_id,
    name: s.full_name || (s.email ? s.email.split('@')[0] : 'Sin nombre'),
    email: s.email || '',
    whatsapp: '',
    identified: true,
    orders: 0,
    spent: 0,
    staffRole: ROLE_LABELS[s.role] || 'Personal',
    linked: s.linked,
  }))
}

// Un miembro es un customer, así que sin ficha no hay grupo posible. Es
// idempotente: si el empleado ya pidió alguna vez con su cuenta, la ficha es la
// que ya tiene y no se toca.
export async function ensureStaffCustomer(venueId, profileId) {
  const { error } = await supabaseStaff.rpc('venue_staff_as_customer', {
    p_venue_id: venueId,
    p_profile_id: profileId,
  })
  return error
}

// Una sola lista de gente. El personal va primero porque son pocos y fijos: si
// fuera al final, en un local con cientos de clientes quedaría fuera del corte
// de la búsqueda. Quien ya es cliente aparece una vez sola, con su cargo.
export function mergePeople(customers, staff) {
  const staffById = new Map(staff.map(s => [s.id, s]))
  const known = new Set(customers.map(c => c.id))
  return [
    ...staff.filter(s => !known.has(s.id)),
    ...customers.map(c => {
      const s = staffById.get(c.id)
      return s ? { ...c, staffRole: s.staffRole, linked: s.linked } : c
    }),
  ]
}
