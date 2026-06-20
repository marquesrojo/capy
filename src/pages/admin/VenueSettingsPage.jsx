import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'

const MAX_LOGO_SIZE_MB = 4

export default function VenueSettingsPage() {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('name, whatsapp_number, logo_url')
        .eq('id', ACTIVE_VENUE_ID)
        .single()
      setName(data?.name || '')
      setWhatsapp(data?.whatsapp_number || '')
      setLogoUrl(data?.logo_url || '')
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
          logo_url: finalLogoUrl || null
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
      setError('No pudimos guardar los cambios. Intentá de nuevo.')
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
