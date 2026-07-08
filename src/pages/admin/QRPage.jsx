import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function QRPage() {
  const { venueId } = useAuth()
  const [inviteCode, setInviteCode] = useState(null)
  const [slug, setSlug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])

  useEffect(() => {
    if (!venueId) return
    loadVenueData()
  }, [venueId])

  async function loadVenueData() {
    const [venueRes, zonesRes] = await Promise.all([
      supabaseStaff.from('venues').select('invite_code, slug').eq('id', venueId).single(),
      supabaseStaff.from('venue_zones').select('id, name, type').eq('venue_id', venueId).eq('is_active', true).order('type').order('sort_order').order('name'),
    ])
    setInviteCode(venueRes.data?.invite_code || null)
    setSlug(venueRes.data?.slug || null)
    setZones(zonesRes.data || [])
    setLoading(false)
  }

  async function regenerateCode() {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    await supabaseStaff
      .from('venues')
      .update({ invite_code: newCode })
      .eq('id', venueId)
    setInviteCode(newCode)
  }

  const clientUrl = slug ? `https://capyapp.co/r/${slug}` : 'https://capyapp.co'

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/configuracion" className="text-smoke-500 text-sm">← Volver</Link>
      </div>
      <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-6">CÓDIGOS QR</h1>

      <div className="space-y-6">
        {/* QR Camarero — primero */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-200 font-semibold mb-1">Invitar Camareros</p>
          <p className="text-smoke-500 text-xs mb-4">
            El camarero escanea este QR o ingresa el código en Capy Camarero para vincularse a este local
          </p>

          {loading ? (
            <p className="text-smoke-500 text-sm text-center py-4">Cargando...</p>
          ) : (
            <>
              <div className="bg-carbon-800 border border-carbon-700 rounded-2xl p-6 text-center mb-4">
                <p className="text-smoke-500 text-xs mb-2 uppercase tracking-wide">Código de invitación</p>
                <p className="font-mono text-ember-500 text-4xl font-bold tracking-widest">{inviteCode}</p>
              </div>

              {inviteCode && <InviteQRCode code={inviteCode} />}

              <ShareInviteButton code={inviteCode} />

              <button
                onClick={regenerateCode}
                className="w-full mt-3 border border-carbon-700 text-smoke-400 text-sm py-3 rounded-xl"
              >
                Regenerar código
              </button>
            </>
          )}
        </div>

        {/* QR Clientes — segundo */}
        {!loading && (
          <QRCard
            label="QR Clientes — General"
            description="QR único del local. El cliente elige su mesa al escanear (o no la indica y el camarero la asigna)."
            url={clientUrl}
            showTemplate
          />
        )}

        {/* QR por mesa */}
        {!loading && zones.length > 0 && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
            <p className="text-smoke-200 font-semibold mb-1">QR por Mesa / Ubicación</p>
            <p className="text-smoke-500 text-xs mb-5">
              Cada QR lleva al cliente directamente a su mesa. Descargalos e imprimílos para cada ubicación.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {zones.map(zone => (
                <ZoneQRCard key={zone.id} zone={zone} slug={slug} />
              ))}
            </div>
          </div>
        )}

        {!loading && zones.length === 0 && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
            <p className="text-smoke-200 font-semibold mb-1">QR por Mesa / Ubicación</p>
            <p className="text-smoke-500 text-xs">
              Todavía no hay mesas configuradas.{' '}
              <a href="/admin/ubicaciones" className="text-ember-500 underline">Agregalas en Ubicaciones</a> y van a aparecer acá automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ShareInviteButton({ code }) {
  const [copied, setCopied] = useState(false)
  const url = `https://capyapp.co/camaut/vincular?code=${code}`
  const text = `Sumate al equipo con Capy Camarero 🤙\nInstalá la app y usá el código ${code}:`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Capy Camarero', text, url })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(`${text}\n${url}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={handleShare}
      className="w-full mt-3 bg-ember-500 text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
      </svg>
      {copied ? '¡Enlace copiado!' : 'Compartir invitación'}
    </button>
  )
}

function InviteQRCode({ code }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const url = `https://capyapp.co/camaut/vincular?code=${code}`

  useEffect(() => {
    if (!canvasRef.current) return
    setReady(false)
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#F5F0EB' }
    }, (err) => { if (!err) setReady(true) })
  }, [code])

  return (
    <div className="flex justify-center">
      <div className="bg-[#F5F0EB] p-4 rounded-2xl">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
        {!ready && <div className="w-[240px] h-[240px] bg-carbon-800 rounded-xl" />}
      </div>
    </div>
  )
}

const TYPE_LABEL = { mesa: 'Mesa', zona: 'Zona', retiro: 'Retiro' }

function ZoneQRCard({ zone, slug }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const url = `https://capyapp.co/r/${slug}?zone_id=${zone.id}&location_label=${encodeURIComponent(zone.name)}&location_type=${zone.type}`

  useEffect(() => {
    if (!canvasRef.current || !slug) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 160,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#F5F0EB' }
    }, (err) => { if (!err) setReady(true) })
  }, [url])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `capy-qr-${zone.name.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="bg-carbon-800 border border-carbon-700 rounded-2xl p-3 flex flex-col items-center gap-2">
      <p className="text-smoke-400 text-[10px] uppercase tracking-wide">{TYPE_LABEL[zone.type] || zone.type}</p>
      <p className="text-smoke-200 font-semibold text-sm text-center">{zone.name}</p>
      <div className="bg-[#F5F0EB] p-2 rounded-xl">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none', width: 120, height: 120 }} />
        {!ready && <div className="w-[120px] h-[120px] bg-carbon-700 rounded-lg animate-pulse" />}
      </div>
      {ready && (
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-1.5 border border-carbon-600 text-smoke-400 hover:text-smoke-200 text-xs font-medium py-2 rounded-xl transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar
        </button>
      )}
    </div>
  )
}

function QRCard({ label, description, url, showTemplate }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#F5F0EB' }
    }, (err) => { if (!err) setReady(true) })
  }, [url])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `capy-qr-cliente.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
      <p className="text-smoke-200 font-semibold mb-1">{label}</p>
      <p className="text-smoke-500 text-xs mb-4">{description}</p>
      <p className="text-smoke-600 text-xs font-mono mb-4">{url}</p>
      <div className="flex justify-center mb-4">
        <div className="bg-[#F5F0EB] p-4 rounded-2xl">
          <canvas ref={canvasRef} />
        </div>
      </div>
      {ready && (
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 border border-ember-500 text-ember-500 font-semibold py-3 rounded-xl mb-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar PNG
        </button>
      )}
      {showTemplate && (
        <a
          href="/qr-template.html"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 border border-carbon-700 text-smoke-400 text-sm py-3 rounded-xl"
        >
          Template para imprimir
        </a>
      )}
    </div>
  )
}
