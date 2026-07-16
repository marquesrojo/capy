import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import CamautAppShell from './CamautAppShell'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function setupPushNotifications(staffId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!VAPID_KEY) return

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })
    }

    const { endpoint, keys } = subscription.toJSON()
    await supabaseCamaut.from('push_subscriptions').upsert({
      staff_id: staffId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'staff_id,endpoint' })
  } catch {
    // push setup is best-effort
  }
}

export default function CamautAppPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [venueId, setVenueId] = useState(null)
  const [staffName, setStaffName] = useState(null)
  const [staffXP, setStaffXP] = useState(0)
  const [linkedVenues, setLinkedVenues] = useState([])
  const [staffId, setStaffId] = useState(null)

  useEffect(() => {
    // Ensure the browser URL reflects the canonical path so that iOS
    // "Add to Home Screen" saves /camareroa/app instead of the root after any
    // www/non-www redirect that may have stripped the path.
    if (window.location.pathname !== '/camareroa/app') {
      window.history.replaceState(null, '', '/camareroa/app')
    }
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      let { data: { session } } = await supabaseCamaut.auth.getSession()

      if (!session) {
        // Fallback: unified auth flow uses supabaseStaff — copy session to camaut client
        const { data: staffData } = await supabaseStaff.auth.getSession()
        if (staffData.session) {
          await supabaseCamaut.auth.setSession({
            access_token: staffData.session.access_token,
            refresh_token: staffData.session.refresh_token
          })
          session = staffData.session
        }
      } else {
        await supabaseStaff.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      }

      if (!session) { navigate('/camareroa/login'); return }

      // Use supabaseStaff for the profile query — it's guaranteed to have the
      // session explicitly set in both auth paths above, avoiding edge cases
      // where supabaseCamaut's internal session state lags behind.
      const { data: profile } = await supabaseStaff
        .from('profiles')
        .select('venue_id, is_autonomous, full_name')
        .eq('id', session.user.id)
        .maybeSingle()

      const vId = profile?.venue_id || null
      setVenueId(vId)

      const fullNameFromMeta = session.user?.user_metadata?.full_name || profile?.full_name || null

      if (vId) {
        // Try by profile_id first (most reliable), fall back to name for legacy records
        let { data: staffData } = await supabaseStaff
          .from('staff_names')
          .select('id, full_name')
          .eq('venue_id', vId)
          .eq('profile_id', session.user.id)
          .maybeSingle()

        if (!staffData && fullNameFromMeta) {
          const res = await supabaseStaff
            .from('staff_names')
            .select('id, full_name')
            .eq('venue_id', vId)
            .ilike('full_name', fullNameFromMeta.trim())
            .maybeSingle()
          staffData = res.data
        }

        setStaffName(staffData?.full_name || fullNameFromMeta || null)
        const sid = staffData?.id || null
        setStaffId(sid)
        if (sid) setupPushNotifications(sid)
      } else {
        setStaffName(fullNameFromMeta)
      }

      const { data: linked } = await supabaseStaff
        .from('venue_staff')
        .select('venue:venues(id, name, slug, cash_discount_enabled, cash_discount_percent)')
        .eq('staff_profile_id', session.user.id)
        .eq('status', 'active')
      setLinkedVenues(linked?.map(l => l.venue).filter(Boolean).filter(v => v.id !== vId) || [])

      setAuthorized(true)
    } catch (err) {
      console.error('checkAuth error:', err)
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-[#8896A5] text-sm">Cargando...</p>
      </div>
    )
  }

  if (!authorized) return null

  const isSuperAdminView = !!localStorage.getItem('capy-superadmin-camaut')
  const BANNER_H = 36

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {isSuperAdminView && (
        <div
          className="bg-ember-500 text-white text-xs font-semibold flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: BANNER_H }}
        >
          <span>👁 Vista superadmin: {staffName}</span>
          <button
            onClick={async () => {
              const saved = sessionStorage.getItem('capy-superadmin-session')
              if (saved) {
                const { access_token, refresh_token } = JSON.parse(saved)
                await supabaseStaff.auth.setSession({ access_token, refresh_token })
                sessionStorage.removeItem('capy-superadmin-session')
              }
              localStorage.removeItem('capy-superadmin-camaut')
              window.location.href = '/admin/super'
            }}
            className="underline"
          >
            Salir
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <CamautAppShell
          venueId={venueId}
          staffName={staffName}
          staffXP={staffXP}
          linkedVenues={linkedVenues}
          staffId={staffId}
          heightOffset={isSuperAdminView ? BANNER_H : 0}
        />
      </div>
    </div>
  )
}
