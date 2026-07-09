import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../lib/supabase'

// Feature → minimum plan required
const FEATURE_PLANS = {
  ai_import_rich: 'pro',   // AI import with photos + descriptions
  capy_chat: 'free',       // Capy AI support chat
  // add more features here as the product evolves
}

export function usePlan() {
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseStaff
      .from('venues')
      .select('plan, plan_expires_at')
      .eq('id', ACTIVE_VENUE_ID)
      .single()
      .then(({ data }) => {
        if (data) {
          const expired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
          setPlan(expired ? 'free' : (data.plan || 'free'))
        }
        setLoading(false)
      })
  }, [])

  const isPro = plan === 'pro'

  function canUse(feature) {
    const required = FEATURE_PLANS[feature] || 'free'
    if (required === 'free') return true
    if (required === 'pro') return isPro
    return false
  }

  return { plan, isPro, canUse, loading }
}
