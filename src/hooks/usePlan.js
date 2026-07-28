import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../lib/supabase'

// Feature → minimum plan required
const FEATURE_PLANS = {
  ai_import_rich: 'pro',   // AI import with photos + descriptions
  capy_chat: 'free',       // CAPY AI support chat
  // add more features here as the product evolves
}

// venueId opcional: pasarlo cuando ya se tiene el del perfil (useAuth), porque
// ACTIVE_VENUE_ID puede todavía apuntar al local anterior mientras carga la sesión.
export function usePlan(venueId) {
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = venueId || ACTIVE_VENUE_ID
    if (!id) return
    setLoading(true)
    supabaseStaff
      .from('venues')
      .select('plan, plan_expires_at')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const expired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
          setPlan(expired ? 'free' : (data.plan || 'free'))
        }
        setLoading(false)
      })
  }, [venueId])

  const isPro = plan === 'pro'

  function canUse(feature) {
    const required = FEATURE_PLANS[feature] || 'free'
    if (required === 'free') return true
    if (required === 'pro') return isPro
    return false
  }

  return { plan, isPro, canUse, loading }
}
