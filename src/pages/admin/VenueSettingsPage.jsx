import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import ColorPicker from '../../components/ColorPicker'
import { PaperclipIcon, UtensilsIcon, BellIcon } from '../../components/Icons'

const MAX_LOGO_SIZE_MB = 4

const DAYS = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
]

const DEFAULT_SCHEDULE = {
  lunes:     { active: true,  from: '09:00', to: '23:00' },
  martes:    { active: true,  from: '09:00', to: '23:00' },
  miercoles: { active: true,  from: '09:00', to: '23:00' },
  jueves:    { active: true,  from: '09:00', to: '23:00' },
  viernes:   { active: true,  from: '09:00', to: '01:00' },
  sabado:    { active: true,  from: '10:00', to: '01:00' },
  domingo:   { active: false, from: '10:00', to: '22:00' },
}

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
  const [description, setDescription] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [address, setAddress] = useState('')
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState(false)
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
        .select('name, whatsapp_number, logo_url, header_bg_color, header_text_color, kitchen_alias, slug')
        .eq('id', venueId)
        .single()
      setName(data?.name || '')
      setWhatsapp(data?.whatsapp_number || '')
      setLogoUrl(data?.logo_url || '')
      if (data?.header_bg_color) setHeaderBgColor(data.header_bg_color)
      if (data?.header_text_color) setHeaderTextColor(data.header_text_color)
      if (data?.kitchen_alias) setKitchenAlias(data.kitchen_alias)
      if (data?.slug) setSlug(data.slug)

      try {
        const { data: opt } = await supabaseStaff
          .from('venues')
          .select('landing_self_color, landing_waiter_color, instagram_handle, banner_url, retiro_externo_enabled, delivery_enabled, description, announcement, schedule')
          .eq('id', venueId)
          .single()
        if (opt?.landing_self_color) setLandingSelfColor(opt.landing_self_color)
        if (opt?.landing_waiter_color) setLandingWaiterColor(opt.landing_waiter_color)
        if (opt?.instagram_handle) setInstagram(opt.instagram_handle)
        if (opt?.banner_url) setBannerUrl(opt.banner_url)
        if (opt?.retiro_externo_enabled) setRetiroExternoEnabled(true)
        if (opt?.delivery_enabled) setDeliveryEnabled(true)
        if (opt?.description) setDescription(opt.description)
        if (opt?.announcement) setAnnouncement(opt.announcement)
        if (opt?.schedule) setSchedule(opt.schedule)
      } catch (_) {}

      try {
        const { data: addr } = await supabaseStaff
          .from('venues')
          .select('address')
          .eq('id', venueId)
          .single()
        if (addr?.address) setAddress(addr.address)
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
            description: description.trim() || null,
            announcement: announcement.trim() || null,
            schedule,
          })
          .eq('id', venueId)
      } catch (_) {}

      try {
        await supabaseStaff
          .from('venues')
          .update({
            address: address.trim() || null,
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

  function setScheduleDay(key, field, value) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
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
          <p className="text-smoke-300 font-medium text-sm mb-1">Vista previa de bienvenida</p>
          <p className="text-smoke-500 text-xs mb-4">
            Los botones de la página de bienvenida usan los colores del encabezado.
          </p>
          <div className="space-y-2">
            <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ backgroundColor: headerBgColor }}>
              <UtensilsIcon size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">Quiero pedir yo mismo</span>
            </div>
            <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ backgroundColor: headerTextColor }}>
              <BellIcon size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">Quiero que me atienda un camarero/a</span>
            </div>
          </div>
        </div>

        {slug && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
            <p className="text-smoke-300 font-medium text-sm mb-1">URL de bienvenida</p>
            <p className="text-smoke-500 text-xs mb-3">
              Compartí este link con tus clientes para que accedan a la carta.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`https://capyapp.co/r/${slug}`}
                className="input flex-1 text-sm text-smoke-400 bg-carbon-800 cursor-default select-all"
              />
              <a
                href={`https://capyapp.co/r/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-carbon-600 text-smoke-400 text-xs whitespace-nowrap flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Ir al sitio
              </a>
            </div>
          </div>
        )}

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">WhatsApp del local</p>
          <p className="text-smoke-500 text-xs mb-4">
            Los clientes pueden contactar al local desde la app para confirmar pedidos, consultas o cualquier comunicación directa. Usá el formato internacional sin signos: ej. 5491123456789
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

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Descripción del local</p>
          <p className="text-smoke-500 text-xs mb-3">Aparece bajo el nombre en la página de bienvenida para clientes.</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ej: Café de especialidad y brunch en Palermo"
            rows={2}
            maxLength={120}
            className="input w-full resize-none text-sm"
          />
          <p className="text-smoke-600 text-[10px] mt-1 text-right">{description.length}/120</p>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Link de Google Maps</p>
          <p className="text-smoke-500 text-xs mb-3">Pegá el link de tu local en Google Maps. Aparece en la página de bienvenida.</p>
          <input
            type="url"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="input w-full text-sm"
          />
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Anuncio del día</p>
          <p className="text-smoke-500 text-xs mb-3">Mensaje que aparece como banner en la página de bienvenida. Dejalo vacío para ocultarlo.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="Ej: Hoy: especial de milanesas $3500"
              maxLength={100}
              className="input flex-1 text-sm"
            />
            {announcement && (
              <button type="button" onClick={() => setAnnouncement('')} className="text-smoke-500 text-xs px-3 rounded-xl border border-carbon-600">
                Borrar
              </button>
            )}
          </div>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-1">Horarios</p>
          <p className="text-smoke-500 text-xs mb-4">Aparecen en la página de bienvenida con indicador de abierto/cerrado.</p>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = schedule[key] || { active: false, from: '09:00', to: '23:00' }
              return (
                <div key={key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleDay(key, 'active', !day.active)}
                    className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${day.active ? 'bg-ember-500' : 'bg-carbon-600'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${day.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-sm w-20 flex-shrink-0 ${day.active ? 'text-smoke-200' : 'text-smoke-600'}`}>{label}</span>
                  {day.active ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={day.from}
                        onChange={e => setScheduleDay(key, 'from', e.target.value)}
                        className="input text-xs py-1 px-2 flex-1 min-w-0"
                      />
                      <span className="text-smoke-600 text-xs">–</span>
                      <input
                        type="time"
                        value={day.to}
                        onChange={e => setScheduleDay(key, 'to', e.target.value)}
                        className="input text-xs py-1 px-2 flex-1 min-w-0"
                      />
                    </div>
                  ) : (
                    <span className="text-smoke-600 text-xs">Cerrado</span>
                  )}
                </div>
              )
            })}
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
