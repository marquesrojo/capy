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

  let { data: venue, error } = await supabaseStaff
    .from('venues')
    .insert({ name: `${name} — Capy`, slug, owner_id: userId, is_active: true })
    .select('id')
    .single()

  if (error) {
    // 23505: el venue ya existía de un intento anterior
    if (error.code === '23505') {
      const res = await supabaseStaff.from('venues').select('id').eq('slug', slug).maybeSingle()
      venue = res.data
    } else {
      throw new Error(error.message)
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

  await supabaseStaff
    .from('staff_names')
    .upsert(
      { venue_id: venue.id, full_name: name, profile_id: userId, xp: 0 },
      { onConflict: 'venue_id,profile_id' }
    )

  return venue.id
}
