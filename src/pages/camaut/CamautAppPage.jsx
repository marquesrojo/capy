import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import WaiterModePage from '../admin/WaiterModePage'

export default function CamautAppPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [venueId, setVenueId] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) { navigate('/camaut/login'); return }

    // Esperar a que la sesión esté lista
    await new Promise(r => setTimeout(r, 300))

    // Sincronizar sesión con supabaseStaff
    await supabaseStaff.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    // Leer venue_id con supabaseStaff que ya tiene la sesión sincronizada
    const { data: profile } = await supabaseStaff
      .from('profiles')
      .select('venue_id, is_autonomous')
      .eq('id', session.user.id)
      .single()

    setVenueId(profile?.venue_id || null)
    setAuthorized(true)
    setChecking(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-[#8896A5] text-sm">Cargando...</p>
      </div>
    )
  }

  if (!authorized) return null

  return <WaiterModePage venueId={venueId} />
}
