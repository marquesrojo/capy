import { supabaseStaff } from './supabase'

// Camareros asignables de un venue: los staff_names propios del venue más
// los camareros vinculados via Capy Camarero (venue_staff). Los vinculados
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
      const { data: byName } = await supabaseStaff
        .from('staff_names')
        .select('*')
        .in('full_name', missingNames)
      linkedStaff = [...linkedStaff, ...(byName || [])]
    }
  }

  const seenIds = new Set()
  const seenNames = new Set()
  return [...(local || []), ...linkedStaff]
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
