import { supabaseStaff } from './supabase'

// Camareros asignables de un venue: los staff_names propios del venue más
// los camareros vinculados via CAPY Camarero (venue_staff). Los vinculados
// tienen su staff_names en su venue personal y se resuelven por profile_id,
// con fallback por nombre para registros viejos sin profile_id.
export async function fetchVenueWaiters(venueId) {
  const [{ data: local }, { data: linked }] = await Promise.all([
    supabaseStaff
      .from('staff_names')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('full_name'),
    supabaseStaff
      .from('venue_staff')
      .select('staff_profile_id, profile:profiles(full_name)')
      .eq('venue_id', venueId)
      .eq('status', 'active'),
  ])

  const linkedIds = (linked || []).map(l => l.staff_profile_id).filter(Boolean)
  let linkedStaff = []
  if (linkedIds.length) {
    const { data: byId } = await supabaseStaff
      .from('staff_names')
      .select('*')
      .in('profile_id', linkedIds)
    linkedStaff = byId || []

    const foundProfileIds = new Set(linkedStaff.map(s => s.profile_id).filter(Boolean))
    const missingNames = (linked || [])
      .filter(l => !foundProfileIds.has(l.staff_profile_id))
      .map(l => l.profile?.full_name)
      .filter(Boolean)
    if (missingNames.length) {
      // Sin profile_id no queda más que el nombre. Es un match débil —dos
      // "Federico" en la plataforma son indistinguibles— así que se limita a
      // los que además tienen profile_id nulo: los registros viejos que este
      // fallback vino a cubrir. Si no, arrastraba homónimos de otros locales.
      const { data: byName } = await supabaseStaff
        .from('staff_names')
        .select('*')
        .in('full_name', missingNames)
        .is('profile_id', null)
      linkedStaff = [...linkedStaff, ...(byName || [])]
    }
  }

  // De dónde salió cada uno, porque se quitan de manera distinta: la ficha
  // local es del venue y se desactiva; la del vinculado vive en su venue
  // personal y lo que hay que cortar es la vinculación, no su ficha.
  const localList = (local || []).map(w => ({ ...w, _linked: false }))
  const linkedList = linkedStaff
    // Los vinculados no filtraban por is_active: una ficha dada de baja seguía
    // apareciendo en el selector del local
    .filter(w => w.is_active !== false)
    .map(w => ({ ...w, _linked: true }))

  // Dar de baja al usuario desde Usuarios deshabilita su cuenta, no su ficha de
  // staff_names, que es la que alimenta este selector. Por eso un camarero dado
  // de baja seguía apareciendo para asignarle pedidos: acá se cruzan las dos
  // cosas, así la baja del usuario vale también para el selector.
  const profileIds = [...new Set(
    [...localList, ...linkedList].map(w => w.profile_id).filter(Boolean)
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

  const seenIds = new Set()
  const seenNames = new Set()
  return [...localList, ...linkedList]
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
