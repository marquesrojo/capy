import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

const ALERTS = [
  {
    key: 'wa_notify_new_order',
    label: 'Nuevo pedido',
    desc: 'Operador recibe el detalle del pedido al instante',
    badge: 'Operador',
  },
  {
    key: 'wa_notify_listo',
    label: 'Pedido listo',
    desc: 'Cliente recibe aviso cuando puede pasar a retirar',
    badge: 'Cliente',
  },
  {
    key: 'wa_notify_entregado',
    label: 'Pedido entregado',
    desc: 'Cliente recibe confirmación de entrega',
    badge: 'Cliente',
  },
  {
    key: 'wa_notify_rechazado',
    label: 'Pedido rechazado',
    desc: 'Cliente es notificado si el pedido no pudo procesarse',
    badge: 'Cliente',
  },
  {
    key: 'wa_notify_reservation',
    label: 'Reserva confirmada',
    desc: 'Operador y cliente reciben confirmación de reserva',
    badge: 'Ambos',
  },
]

export default function WhatsAppPage() {
  const { venueId } = useAuth()
  const [tab, setTab] = useState('alertas')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [notifyWhatsapp, setNotifyWhatsapp] = useState('')
  const [toggles, setToggles] = useState({
    wa_notify_new_order: true,
    wa_notify_listo: true,
    wa_notify_entregado: true,
    wa_notify_rechazado: true,
    wa_notify_reservation: true,
  })

  const [customerCount, setCustomerCount] = useState(null)
  const [campaignMsg, setCampaignMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [campaignResult, setCampaignResult] = useState(null)

  useEffect(() => {
    if (!venueId) return
    supabaseStaff
      .from('venues')
      .select('notify_whatsapp, wa_notify_new_order, wa_notify_listo, wa_notify_entregado, wa_notify_rechazado, wa_notify_reservation')
      .eq('id', venueId)
      .single()
      .then(({ data }) => {
        if (data) {
          setNotifyWhatsapp(data.notify_whatsapp || '')
          setToggles({
            wa_notify_new_order: data.wa_notify_new_order ?? true,
            wa_notify_listo: data.wa_notify_listo ?? true,
            wa_notify_entregado: data.wa_notify_entregado ?? true,
            wa_notify_rechazado: data.wa_notify_rechazado ?? true,
            wa_notify_reservation: data.wa_notify_reservation ?? true,
          })
        }
        setLoading(false)
      })
  }, [venueId])

  useEffect(() => {
    if (!venueId || tab !== 'campanas') return
    setCustomerCount(null)
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-wa-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ venue_id: venueId, message: 'test', dry_run: true }),
    })
      .then(r => r.json())
      .then(d => setCustomerCount(d.total ?? 0))
      .catch(() => setCustomerCount(0))
  }, [venueId, tab])

  async function saveAlerts() {
    setSaving(true)
    await supabaseStaff
      .from('venues')
      .update({ notify_whatsapp: notifyWhatsapp.trim() || null, ...toggles })
      .eq('id', venueId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function sendCampaign() {
    if (!campaignMsg.trim()) return
    setSending(true)
    setCampaignResult(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-wa-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ venue_id: venueId, message: campaignMsg.trim() }),
      })
      const data = await res.json()
      setCampaignResult(data)
    } catch (e) {
      setCampaignResult({ error: e.message })
    }
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-500 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-carbon-950 pb-12">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-emerald-400 tracking-wide">WHATSAPP</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Mi Local</Link>
        </div>
      </header>

      <div className="flex border-b border-carbon-700">
        {[
          { id: 'alertas', label: 'Alertas' },
          { id: 'campanas', label: 'Campañas' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t.id ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-smoke-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="px-4 pt-5 space-y-4">
        {tab === 'alertas' && (
          <>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-amber-400 text-xs leading-relaxed">
                Esta sección requiere conexión con <span className="font-semibold">WhatsApp Business API</span>. Los mensajes automáticos solo se envían si la integración está activa. Contactá a Capy para habilitarla.
              </p>
            </div>

            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-smoke-300 font-semibold text-sm">Número del operador</p>
                <p className="text-smoke-500 text-xs mt-0.5">Recibe notificaciones de nuevos pedidos y reservas</p>
              </div>
              <input
                type="tel"
                value={notifyWhatsapp}
                onChange={e => setNotifyWhatsapp(e.target.value)}
                placeholder="5491122497772"
                className="input w-full font-mono text-sm"
              />
              <p className="text-smoke-600 text-[11px]">Formato internacional sin signos: ej. 5491123456789</p>
            </div>

            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 space-y-1">
              <p className="text-smoke-300 font-semibold text-sm mb-3">Notificaciones activas</p>
              {ALERTS.map((a, i) => (
                <div key={a.key}>
                  {i > 0 && <div className="border-t border-carbon-800 my-2" />}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-smoke-200 text-sm font-medium">{a.label}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.badge === 'Operador' ? 'bg-blue-500/20 text-blue-400' : a.badge === 'Cliente' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {a.badge}
                        </span>
                      </div>
                      <p className="text-smoke-500 text-[11px] mt-0.5">{a.desc}</p>
                    </div>
                    <button
                      onClick={() => setToggles(t => ({ ...t, [a.key]: !t[a.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${toggles[a.key] ? 'bg-emerald-500' : 'bg-carbon-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${toggles[a.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={saveAlerts}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-3 rounded-2xl text-sm"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar configuración'}
            </button>
          </>
        )}

        {tab === 'campanas' && (
          <>
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <p className="text-smoke-200 font-semibold text-sm">
                    {customerCount === null ? 'Calculando...' : `${customerCount} clientes con WhatsApp`}
                  </p>
                  <p className="text-smoke-500 text-xs">Clientes que pidieron en este local y tienen WA cargado</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-smoke-400 text-xs mb-1">Mensaje</p>
                  <textarea
                    value={campaignMsg}
                    onChange={e => { setCampaignMsg(e.target.value); setCampaignResult(null) }}
                    placeholder="Escribí el mensaje que van a recibir tus clientes..."
                    rows={5}
                    className="input w-full text-sm resize-none"
                  />
                  <p className="text-smoke-600 text-[11px] mt-1 text-right">{campaignMsg.length} caracteres</p>
                </div>

                <button
                  onClick={sendCampaign}
                  disabled={sending || !campaignMsg.trim() || customerCount === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
                >
                  {sending ? 'Enviando...' : `Enviar a ${customerCount ?? '...'} clientes`}
                </button>

                {campaignResult && (
                  <div className={`rounded-xl p-3 text-sm ${campaignResult.error || campaignResult.failed > 0 ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
                    {campaignResult.error
                      ? `Error: ${campaignResult.error}`
                      : campaignResult.skipped
                        ? 'WA desactivado en SuperAdmin'
                        : `✓ Enviado a ${campaignResult.sent} de ${campaignResult.total} clientes${campaignResult.failed > 0 ? ` (${campaignResult.failed} fallidos)` : ''}`
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
              <p className="text-amber-400 font-semibold text-xs">Importante — WhatsApp Business</p>
              <p className="text-amber-200/70 text-[11px] leading-relaxed">
                Meta solo permite enviar mensajes de texto libre a clientes que hayan iniciado una conversación en las últimas 24hs. Para campañas de marketing a audiencias frías se requieren <strong>plantillas aprobadas</strong> por Meta.
              </p>
              <p className="text-amber-200/70 text-[11px]">
                Los mensajes de alertas automáticas (pedido confirmado, listo, etc.) siempre funcionan sin restricciones.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
