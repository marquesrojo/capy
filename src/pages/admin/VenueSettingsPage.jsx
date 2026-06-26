import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import ColorPicker from '../../components/ColorPicker'

const MAX_LOGO_SIZE_MB = 4

export default function VenueSettingsPage() {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [headerBgColor, setHeaderBgColor] = useState('#1A1A1A')
  const [headerTextColor, setHeaderTextColor] = useState('#E8772A')
  const [mpEnabled, setMpEnabled] = useState(false)
  const [kitchenAlias, setKitchenAlias] = useState('')
  const [activePicker, setActivePicker] = useState(null) // 'bg' | 'text' | null
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('name, whatsapp_number, logo_url, header_bg_color, header_text_color, mp_enabled, kitchen_alias')
        .eq('id', ACTIVE_VENUE_ID)
        .single()
      setName(data?.name || '')
      setWhatsapp(data?.whatsapp_number || '')
      setLogoUrl(data?.logo_url || '')
      if (data?.header_bg_color) setHeaderBgColor(data.header_bg_color)
      if (data?.header_text_color) setHeaderTextColor(data.header_text_color)
      if (data?.mp_enabled !== undefined) setMpEnabled(data.mp_enabled)
      if (data?.kitchen_alias) setKitchenAlias(data.kitchen_alias)
      setLoading(false)
    }
    load()
  }, [])

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser una imagen.')
      return
    }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setError(`La imagen no puede pesar más de ${MAX_LOGO_SIZE_MB}MB.`)
      return
    }

    setError('')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('El nombre del local no puede estar vacío.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError('')

    try {
      let finalLogoUrl = logoUrl

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${ACTIVE_VENUE_ID}/logo.${ext}`
        const { error: uploadError } = await supabaseStaff.storage
          .from('venue-assets')
          .upload(path, logoFile, { upsert: true })
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabaseStaff.storage
          .from('venue-assets')
          .getPublicUrl(path)
        // Le agregamos un parametro de cache-busting para que el navegador
        // no siga mostrando el logo viejo cacheado tras actualizarlo
        finalLogoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      }

      const { error: updateError } = await supabaseStaff
        .from('venues')
        .update({
          name: name.trim(),
          whatsapp_number: whatsapp.trim() || null,
          logo_url: finalLogoUrl || null,
          header_bg_color: headerBgColor,
          header_text_color: headerTextColor,
          mp_enabled: mpEnabled,
          kitchen_alias: kitchenAlias.trim() || null
        })
        .eq('id', ACTIVE_VENUE_ID)

      if (updateError) throw updateError

      setLogoUrl(finalLogoUrl)
      setLogoFile(null)
      setLogoPreview(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
      setError(`No pudimos guardar: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const displayLogo = logoPreview || logoUrl

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
          <p className="text-smoke-300 font-medium text-sm mb-1">Nombre del local</p>
          <p className="text-smoke-500 text-xs mb-4">
            Aparece en el encabezado de la carta para tus clientes, junto al logo.
          </p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Pucará Resto Bar"
            className="input w-full"
          />
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Logo</p>
          <p className="text-smoke-500 text-xs mb-4">
            Se muestra al lado del nombre en la carta. Recomendado: imagen cuadrada.
          </p>

          {displayLogo ? (
            <div className="flex items-center gap-4 mb-3">
              <img
                src={displayLogo}
                alt="Logo del local"
                className="w-16 h-16 rounded-xl object-cover border border-carbon-700"
              />
              <label className="text-smoke-400 text-xs underline cursor-pointer">
                Cambiar logo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed border-carbon-600 rounded-xl py-6 text-smoke-400 text-sm cursor-pointer">
              <span>📎 Subir logo</span>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          )}
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Colores del encabezado</p>
          <p className="text-smoke-500 text-xs mb-4">
            Fondo y texto del encabezado que aparece en la carta de tus clientes y en todas las pantallas del panel.
          </p>

          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'bg' ? null : 'bg')}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
                activePicker === 'bg' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'
              }`}
            >
              <div className="w-8 h-8 rounded border border-carbon-600 flex-shrink-0" style={{ backgroundColor: headerBgColor }} />
              <div className="text-left">
                <p className="text-smoke-400 text-[10px]">Fondo</p>
                <p className="text-smoke-300 text-xs font-mono">{headerBgColor}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'text' ? null : 'text')}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
                activePicker === 'text' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'
              }`}
            >
              <div className="w-8 h-8 rounded border border-carbon-600 flex-shrink-0" style={{ backgroundColor: headerTextColor }} />
              <div className="text-left">
                <p className="text-smoke-400 text-[10px]">Texto</p>
                <p className="text-smoke-300 text-xs font-mono">{headerTextColor}</p>
              </div>
            </button>
          </div>

          {activePicker === 'bg' && (
            <div className="mb-4 bg-carbon-800 rounded-xl p-3">
              <ColorPicker value={headerBgColor} onChange={setHeaderBgColor} />
            </div>
          )}
          {activePicker === 'text' && (
            <div className="mb-4 bg-carbon-800 rounded-xl p-3">
              <ColorPicker value={headerTextColor} onChange={setHeaderTextColor} />
            </div>
          )}

          <p className="text-smoke-500 text-xs mb-1.5">Vista previa</p>
          <div
            className="rounded-lg px-4 py-3 flex items-center gap-2.5 border border-carbon-700"
            style={{ backgroundColor: headerBgColor }}
          >
            {displayLogo && (
              <img src={displayLogo} alt="" className="w-6 h-6 rounded object-cover" />
            )}
            <span className="text-xs font-bold tracking-wide" style={{ color: headerTextColor }}>
              {name ? name.toUpperCase() : 'NOMBRE DEL LOCAL'}
            </span>
          </div>
        </div>

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
        </div>

        {error && <p className="text-red-700 text-xs px-1">{error}</p>}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Mercado Pago</p>
              <p className="text-smoke-500 text-xs mt-0.5">Los clientes pueden pagar directamente desde Capy</p>
            </div>
            <button
              type="button"
              onClick={() => setMpEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mpEnabled ? 'bg-blue-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mpEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Alias de propina — Cocina</p>
          <p className="text-smoke-500 text-xs mb-3">Aparece en la encuesta cuando el cliente califica 4 o 5 estrellas</p>
          <input
            type="text"
            value={kitchenAlias}
            onChange={e => setKitchenAlias(e.target.value)}
            placeholder="Ej: cocina.pucara"
            className="input text-sm"
          />
        </div>

        {saved && <p className="text-emerald-700 text-xs px-1">Guardado.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </main>
    </div>
  )
}
