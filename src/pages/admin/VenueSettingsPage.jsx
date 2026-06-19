import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'

export default function VenueSettingsPage() {
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('whatsapp_number')
        .eq('id', ACTIVE_VENUE_ID)
        .single()
      setWhatsapp(data?.whatsapp_number || '')
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await supabaseStaff
      .from('venues')
      .update({ whatsapp_number: whatsapp.trim() || null })
      .eq('id', ACTIVE_VENUE_ID)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">DATOS DEL LOCAL</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">WhatsApp del local</p>
          <p className="text-smoke-500 text-xs mb-4">
            Los clientes sin cuenta validan sus pedidos mandando un mensaje a este número. Usá el formato internacional sin signos: ej. 5491123456789
          </p>
          <input
            type="text"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="5491123456789"
            className="input w-full"
          />
          {saved && <p className="text-emerald-700 text-xs mt-3">Guardado.</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </main>
    </div>
  )
}
