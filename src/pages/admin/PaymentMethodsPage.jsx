import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function PaymentMethodsPage() {
  const { venueId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mpEnabled, setMpEnabled] = useState(false)
  const [mpSaving, setMpSaving] = useState(false)
  const [mpToken, setMpToken] = useState('')
  const [mpTokenSaving, setMpTokenSaving] = useState(false)
  const [mpTokenSaved, setMpTokenSaved] = useState(false)
  const [fiscalEnabled, setFiscalEnabled] = useState(false)
  const [fiscalSaving, setFiscalSaving] = useState(false)
  const [fiscalCondition, setFiscalCondition] = useState('responsable_inscripto')

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

  async function loadAll() {
    const [venueRes] = await Promise.all([
      supabaseStaff.from('venues').select('mp_enabled, mp_access_token, fiscal_enabled, fiscal_condition').eq('id', venueId).single()
    ])
    if (venueRes.data?.mp_enabled !== undefined) setMpEnabled(venueRes.data.mp_enabled)
    if (venueRes.data?.mp_access_token) setMpToken(venueRes.data.mp_access_token)
    if (venueRes.data?.fiscal_enabled !== undefined) setFiscalEnabled(venueRes.data.fiscal_enabled)
    if (venueRes.data?.fiscal_condition) setFiscalCondition(venueRes.data.fiscal_condition)
    setLoading(false)
  }

  async function toggleMp() {
    const newVal = !mpEnabled
    setMpEnabled(newVal)
    setMpSaving(true)
    await supabaseStaff.from('venues').update({ mp_enabled: newVal }).eq('id', venueId)
    setMpSaving(false)
  }

  async function saveMpToken() {
    setMpTokenSaving(true)
    await supabaseStaff.from('venues').update({ mp_access_token: mpToken.trim() }).eq('id', venueId)
    setMpTokenSaving(false)
    setMpTokenSaved(true)
    setTimeout(() => setMpTokenSaved(false), 2000)
  }

  async function toggleFiscal() {
    const newVal = !fiscalEnabled
    setFiscalEnabled(newVal)
    setFiscalSaving(true)
    await supabaseStaff.from('venues').update({ fiscal_enabled: newVal }).eq('id', venueId)
    setFiscalSaving(false)
  }

  async function saveFiscalCondition(value) {
    setFiscalCondition(value)
    await supabaseStaff.from('venues').update({ fiscal_condition: value }).eq('id', venueId)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">FACTURACIÓN</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Mercado Pago</p>
              <p className="text-smoke-500 text-xs mt-0.5">Los clientes pueden pagar directamente desde CAPY</p>
            </div>
            <button
              type="button"
              onClick={toggleMp}
              disabled={mpSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-70 ${
                mpEnabled ? 'bg-blue-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mpEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="space-y-2 pt-1 border-t border-carbon-700">
            <p className="text-smoke-400 text-xs">Access Token de Mercado Pago</p>
            <p className="text-smoke-500 text-[11px]">Encontralo en tu cuenta MP → Tu negocio → Credenciales</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={mpToken}
                onChange={e => { setMpToken(e.target.value); setMpTokenSaved(false) }}
                placeholder="APP_USR-..."
                className="input flex-1 font-mono text-xs"
              />
              <button
                onClick={saveMpToken}
                disabled={mpTokenSaving || !mpToken.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm flex-shrink-0"
              >
                {mpTokenSaving ? '...' : mpTokenSaved ? '✓' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

        {/* Fiscal: todo lo relacionado a facturación electrónica */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
          <p className="text-ember-500 font-display text-lg tracking-wide">FISCAL</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Facturación electrónica</p>
              <p className="text-smoke-500 text-xs mt-0.5">
                Emite facturas (ARCA/AFIP via TusFacturasAPP) con el botón Facturar en cada pedido cobrado. El ticket digital se comparte por WhatsApp — no requiere impresora.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFiscal}
              disabled={fiscalSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-70 flex-shrink-0 ml-3 ${
                fiscalEnabled ? 'bg-emerald-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                fiscalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {fiscalEnabled && (
            <div className="space-y-2 pt-3 border-t border-carbon-700">
              <p className="text-smoke-400 text-xs">Condición fiscal del local</p>
              <select
                value={fiscalCondition}
                onChange={e => saveFiscalCondition(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="responsable_inscripto">Responsable Inscripto — emite Factura A y B</option>
                <option value="monotributo">Monotributista — emite Factura C</option>
              </select>
              <p className="text-smoke-600 text-[11px]">
                Tiene que coincidir con la condición registrada en ARCA y en tu cuenta de TusFacturasAPP.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
