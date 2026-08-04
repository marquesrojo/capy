import { supabaseStaff } from './supabase'

// Camareros asignables de un venue: los que usan CAPY Camarero y se vincularon
// con el código del local (venue_staff). Su staff_names vive en su venue
// personal y se resuelve por profile_id.
export async function fetchVenueWaiters(venueId) {
  const { data: linked } = await supabaseStaff
    .from('venue_staff')
    .select('staff_profile_id')
    .eq('venue_id', venueId)
    .eq('status', 'active')

  const linkedIds = (linked || []).map(l => l.staff_profile_id).filter(Boolean)
  let linkedStaff = []
  if (linkedIds.length) {
    const { data: byId } = await supabaseStaff
      .from('staff_names')
      .select('*')
      .in('profile_id', linkedIds)
    linkedStaff = byId || []
  }

  // La ficha del vinculado vive en su venue personal, así que una dada de baja
  // ahí no debe seguir ofreciéndose acá
  const linkedList = linkedStaff
    .filter(w => w.is_active !== false)
    .map(w => ({ ...w, _linked: true }))

  // Dar de baja al usuario deshabilita su cuenta, no su ficha de staff_names,
  // que es la que alimenta este selector: acá se cruzan las dos cosas, así la
  // baja vale también para asignar pedidos.
  const profileIds = [...new Set(
    linkedList.map(w => w.profile_id).filter(Boolean)
  )]
  let disabledProfiles = new Set()
  if (profileIds.length) {
    const { data: profs } = await supabaseStaff
      .from('profiles')
      .select('id, is_active')
      .in('id', profileIds)
    disabledProfiles = new Set(
      (profs || []).filter(p => p.is_active === false).map(p => p.id)
    )
  }

  // Los camareros de un local son los que usan CAPY Camarero y se vincularon
  // con el código del local. Las fichas sueltas de staff_names no se ofrecen:
  // eran nombres cargados a mano, de prueba o de gente que ya no está, y en un
  // local llegaron a ser 38 filas para cinco personas.
  const seenIds = new Set()
  const seenNames = new Set()
  return linkedList
    .filter(w => !(w.profile_id && disabledProfiles.has(w.profile_id)))
    .filter(w => {
      if (seenIds.has(w.id)) return false
      seenIds.add(w.id)
      const key = (w.full_name || '').toLowerCase().trim()
      if (seenNames.has(key)) return false
      seenNames.add(key)
      return true
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
}
