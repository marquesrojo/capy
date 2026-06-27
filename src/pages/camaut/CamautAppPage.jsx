import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut } from '../../lib/supabase'
import WaiterModePage from '../admin/WaiterModePage'

export default function CamautAppPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) { navigate('/camaut/login'); return }

    const { data: profile } = await supabaseCamaut
      .from('profiles')
      .select('role, is_autonomous, venue_id')
      .eq('id', session.user.id)
      .single()

    if (!profile || !profile.is_autonomous) {
      navigate('/camaut/login')
      return
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

  return <WaiterModePage />
}
