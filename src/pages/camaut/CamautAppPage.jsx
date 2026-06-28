import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import CamautAppShell from './CamautAppShell'

export default function CamautAppPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [venueId, setVenueId] = useState(null)
  const [staffName, setStaffName] = useState(null)
  const [staffXP, setStaffXP] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) { navigate('/camaut/login'); return }

    await new Promise(r => setTimeout(r, 300))

    await supabaseStaff.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    const { data: profile } = await supabaseStaff
      .from('profiles')
      .select('venue_id, is_autonomous')
      .eq('id', session.user.id)
      .single()

    const vId = profile?.venue_id || null
    setVenueId(vId)

    if (vId) {
      const { data: staffData } = await supabaseStaff
        .from('staff_names')
        .select('full_name, xp')
        .eq('venue_id', vId)
        .single()
      setStaffName(staffData?.full_name || null)
      setStaffXP(staffData?.xp || 0)
    }

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

  return <CamautAppShell venueId={venueId} staffName={staffName} staffXP={staffXP} />
}
