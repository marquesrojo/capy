import { supabaseStaff } from './supabase'

// Alta de un camarero: su venue personal, su perfil y su ficha en staff_names.
// Sin la ficha no tiene perfil que guardar, ni alias donde cobrar propinas, ni XP.
//
// Lo usa el alta manual (CamautOnboardingPage) y también el arranque de la app
// para el camarero que llega vinculado a un local: ese ya dio su nombre al
// registrarse, así que preguntárselo de nuevo no aporta nada.
export async function ensureWaiterRecord(userId, fullName) {
  const name = (fullName || '').trim() || 'Camarero/a'
  const slug = `camaut-${userId.replace(/-/g, '').slice(0, 12)}`

  // Si un intento anterior ya le dejó venue, se reutiliza: crear otro le
  // partiría la carta y el historial entre dos locales personales
  const { data: existingProfile } = await supabaseStaff
    .from('profiles')
    .select('venue_id')
    .eq('id', userId)
    .maybeSingle()

  let venue = existingProfile?.venue_id ? { id: existingProfile.venue_id } : null

  if (!venue) {
    const { data: created, error } = await supabaseStaff
      .from('venues')
      .insert({ name: `${name} — Capy`, slug, owner_id: userId, is_active: true })
      .select('id')
      .single()
    venue = created
    if (error) {
      // 23505: el venue ya existía pero el perfil no lo tenía apuntado
      if (error.code === '23505') {
        const res = await supabaseStaff.from('venues').select('id').eq('slug', slug).maybeSingle()
        venue = res.data
      } else {
        throw new Error(error.message)
      }
    }
  }
  if (!venue?.id) throw new Error('No se pudo crear la cuenta del camarero')

  const { error: profileError } = await supabaseStaff
    .from('profiles')
    .upsert(
      { id: userId, venue_id: venue.id, role: 'camarero', full_name: name, is_autonomous: true },
      { onConflict: 'id' }
    )
  if (profileError) throw new Error(profileError.message)

  // Sin upsert: el onConflict de (venue_id, profile_id) depende de una
  // restricción única que no existe, y falla entera antes de crear nada
  const { data: existingStaff } = await supabaseStaff
    .from('staff_names')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()

  // Quién lo invitó, si llegó por el link de otro camarero. Solo al crear la
  // ficha: cambiarlo después sería reescribir de dónde salió.
  let referidoPor = null
  try {
    const ref = localStorage.getItem('camaut-ref')
    if (ref) {
      const { data } = await supabaseStaff.from('staff_names').select('id').eq('id', ref).maybeSingle()
      if (data && data.id !== userId) referidoPor = data.id
    }
  } catch { /* sin storage o id inválido: queda sin referente */ }

  if (existingStaff) {
    await supabaseStaff
      .from('staff_names')
      .update({ full_name: name })
      .eq('id', existingStaff.id)
  } else {
    const { error: staffError } = await supabaseStaff
      .from('staff_names')
      .insert({ venue_id: venue.id, full_name: name, profile_id: userId, xp: 0, referred_by: referidoPor })
    if (staffError) throw new Error(staffError.message)
  }

  return venue.id
}
