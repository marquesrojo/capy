import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { staff_id, venue_id, title, body } = await req.json()
  if (!staff_id && !venue_id) {
    return new Response(JSON.stringify({ error: 'staff_id or venue_id required' }), { status: 400, headers: corsHeaders })
  }

  webpush.setVapidDetails(
    `mailto:${Deno.env.get('VAPID_EMAIL')}`,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let subs: { endpoint: string; p256dh: string; auth: string }[] = []

  if (staff_id) {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('staff_id', staff_id)
    subs = data || []
  } else {
    // Notify all active staff at the venue
    const { data: venueStaff } = await supabase
      .from('venue_staff')
      .select('staff_profile_id')
      .eq('venue_id', venue_id)
      .eq('status', 'active')
    const staffIds = (venueStaff || []).map((s: { staff_profile_id: string }) => s.staff_profile_id)
    if (staffIds.length > 0) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .in('staff_id', staffIds)
      subs = data || []
    }
  }

  if (!subs.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payload = JSON.stringify({ title, body })
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
