import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import ColorPicker from '../../components/ColorPicker'
import { PaperclipIcon, UtensilsIcon, BellIcon } from '../../components/Icons'

const MAX_LOGO_SIZE_MB = 4

export default function VenueSettingsPage() {
  const { venueId } = useAuth()
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [headerBgColor, setHeaderBgColor] = useState('#1A1A1A')
  const [headerTextColor, setHeaderTextColor] = useState('#E8772A')
  const [kitchenAlias, setKitchenAlias] = useState('')
  const [landingSelfColor, setLandingSelfColor] = useState('#008080')
  const [landingWaiterColor, setLandingWaiterColor] = useState('#FF8C69')
  const [instagram, setInstagram] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [retiroExternoEnabled, setRetiroExternoEnabled] = useState(false)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [activePicker, setActivePicker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!venueId) return
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('name, whatsapp_number, logo_url, header_bg_color, header_text_color, kitchen_alias')
        .eq('id', venueId)
        .single()
      setName(data?.name || '')
      setWhatsapp(data?.whatsapp_number || '')
      setLogoUrl(data?.logo_url || '')
      if (data?.header_bg_color) setHeaderBgColor(data.header_bg_color)
      if (data?.header_text_color) setHeaderTextColor(data.header_text_color)
      if (data?.kitchen_alias) setKitchenAlias(data.kitchen_alias)

      try {
        const { data: opt } = await supabaseStaff
          .from('venues')
          .select('landing_self_color, landing_waiter_color, instagram_handle, banner_url, retiro_externo_enabled, delivery_enabled')
          .eq('id', venueId)
          .single()
        if (opt?.landing_self_color) setLandingSelfColor(opt.landing_self_color)
        if (opt?.landing_waiter_color) setLandingWaiterColor(opt.landing_waiter_color)
        if (opt?.instagram_handle) setInstagram(opt.instagram_handle)
        if (opt?.banner_url) setBannerUrl(opt.banner_url)
        if (opt?.retiro_externo_enabled) setRetiroExternoEnabled(true)
        if (opt?.delivery_enabled) setDeliveryEnabled(true)
      } catch (_) {}

      setLoading(false)
    }
    load()
  }, [venueId])

  function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('El banner debe ser una imagen.'); return }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) { setError(`La imagen no puede pesar más de ${MAX_LOGO_SIZE_MB}MB.`); return }
    setError('')
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('El logo debe ser una imagen.'); return }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) { setError(`La imagen no puede pesar más de ${MAX_LOGO_SIZE_MB}MB.`); return }
    setError('')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim()) { setError('El nombre del local no puede estar vacío.'); return }
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      let finalLogoUrl = logoUrl
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${venueId}/logo.${ext}`
        const { error: uploadError } = await supabaseStaff.storage
          .from('venue-assets')
          .upload(path, logoFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabaseStaff.storage.from('venue-assets').getPublicUrl(path)
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
          kitchen_alias: kitchenAlias.trim() || null,
        })
        .eq('id', venueId)
      if (updateError) throw updateError

      let finalBannerUrl = bannerUrl
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        const path = `${venueId}/banner.${ext}`
        const { error: uploadError } = await supabaseStaff.storage
          .from('venue-assets')
          .upload(path, bannerFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabaseStaff.storage.from('venue-assets').getPublicUrl(path)
        finalBannerUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      }

      try {
        await supabaseStaff
          .from('venues')
          .update({
            landing_self_color: landingSelfColor,
            landing_waiter_color: landingWaiterColor,
            instagram_handle: instagram.trim() || null,
            banner_url: finalBannerUrl || null,
            retiro_externo_enabled: retiroExternoEnabled,
            delivery_enabled: deliveryEnabled,
          })
          .eq('id', venueId)
      } catch (_) {}

      setLogoUrl(finalLogoUrl)
      setLogoFile(null)
      setLogoPreview(null)
      setBannerUrl(finalBannerUrl)
      setBannerFile(null)
      setBannerPreview(null)
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
              <img src={displayLogo} alt="Logo del local" className="w-16 h-16 rounded-xl object-cover border border-carbon-700" />
              <label className="text-smoke-400 text-xs underline cursor-pointer">
                Cambiar logo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed border-carbon-600 rounded-xl py-6 text-smoke-400 text-sm cursor-pointer">
              <PaperclipIcon size={16} />
              <span>Subir logo</span>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          )}
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Foto de portada</p>
          <p className="text-smoke-500 text-xs mb-4">
            Imagen panorámica que aparece en la carta, debajo del nombre del local y sobre los productos. Recomendado: imagen apaisada (ej. 1200×400 px).
          </p>
          {(bannerPreview || bannerUrl) ? (
            <div className="mb-3 space-y-2">
              <img
                src={bannerPreview || bannerUrl}
                alt="Foto de portada"
                className="w-full h-32 rounded-xl object-cover border border-carbon-700"
              />
              <label className="text-smoke-400 text-xs underline cursor-pointer block">
                Cambiar foto de portada
                <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => { setBannerUrl(''); setBannerFile(null); setBannerPreview(null) }}
                className="text-red-500 text-xs underline"
              >
                Quitar foto de portada
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed border-carbon-600 rounded-xl py-6 text-smoke-400 text-sm cursor-pointer">
              <PaperclipIcon size={16} />
              <span>Subir foto de portada</span>
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
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
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${activePicker === 'bg' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'}`}
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
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${activePicker === 'text' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'}`}
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
            {displayLogo && <img src={displayLogo} alt="" className="w-6 h-6 rounded object-cover" />}
            <span className="text-xs font-bold tracking-wide" style={{ color: headerTextColor }}>
              {name ? name.toUpperCase() : 'NOMBRE DEL LOCAL'}
            </span>
          </div>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Colores de la página de bienvenida</p>
          <p className="text-smoke-500 text-xs mb-4">
            Botones que el cliente ve al escanear el QR del local.
          </p>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'self' ? null : 'self')}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${activePicker === 'self' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'}`}
            >
              <div className="w-8 h-8 rounded border border-carbon-600 flex-shrink-0" style={{ backgroundColor: landingSelfColor }} />
              <div className="text-left">
                <p className="text-smoke-400 text-[10px]">Pedir yo mismo</p>
                <p className="text-smoke-300 text-xs font-mono">{landingSelfColor}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'waiter' ? null : 'waiter')}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 border ${activePicker === 'waiter' ? 'border-ember-500 bg-carbon-800' : 'border-carbon-700 bg-carbon-800'}`}
            >
              <div className="w-8 h-8 rounded border border-carbon-600 flex-shrink-0" style={{ backgroundColor: landingWaiterColor }} />
              <div className="text-left">
                <p className="text-smoke-400 text-[10px]">Llamar mozo</p>
                <p className="text-smoke-300 text-xs font-mono">{landingWaiterColor}</p>
              </div>
            </button>
          </div>
          {activePicker === 'self' && (
            <div className="mb-4 bg-carbon-800 rounded-xl p-3">
              <ColorPicker value={landingSelfColor} onChange={setLandingSelfColor} />
            </div>
          )}
          {activePicker === 'waiter' && (
            <div className="mb-4 bg-carbon-800 rounded-xl p-3">
              <ColorPicker value={landingWaiterColor} onChange={setLandingWaiterColor} />
            </div>
          )}
          <p className="text-smoke-500 text-xs mb-2">Vista previa</p>
          <div className="space-y-2">
            <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ backgroundColor: landingSelfColor }}>
              <UtensilsIcon size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">Quiero pedir yo mismo</span>
            </div>
            <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ backgroundColor: landingWaiterColor }}>
              <BellIcon size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">Quiero que me atienda un mozo</span>
            </div>
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

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Instagram</p>
          <p className="text-smoke-500 text-xs mb-4">
            Solo el usuario, sin @. Ej: <span className="font-mono">pucararesto</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-smoke-500 text-sm">@</span>
            <input
              type="text"
              value={instagram}
              onChange={e => setInstagram(e.target.value.replace(/^@/, ''))}
              placeholder="pucararesto"
              className="input flex-1"
            />
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

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Pedidos desde afuera</p>
          <p className="text-smoke-500 text-xs mb-4">
            Permitís que tus clientes pidan sin estar en el local. Aparece como opción en la página del local.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRetiroExternoEnabled(v => !v)}
              className="w-full flex items-center justify-between bg-carbon-800 rounded-xl px-4 py-3"
            >
              <div className="text-left">
                <p className="text-smoke-200 font-semibold text-sm">Retiro en local</p>
                <p className="text-smoke-500 text-xs mt-0.5">El cliente pide online y pasa a buscar</p>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${retiroExternoEnabled ? 'bg-ember-500' : 'bg-carbon-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${retiroExternoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryEnabled(v => !v)}
              className="w-full flex items-center justify-between bg-carbon-800 rounded-xl px-4 py-3"
            >
              <div className="text-left">
                <p className="text-smoke-200 font-semibold text-sm">Delivery</p>
                <p className="text-smoke-500 text-xs mt-0.5">El cliente pide online y recibe en su domicilio</p>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${deliveryEnabled ? 'bg-ember-500' : 'bg-carbon-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${deliveryEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
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
