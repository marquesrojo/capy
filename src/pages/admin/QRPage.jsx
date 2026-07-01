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

  useEffect(() => {
    if (!venueId) return
    loadVenueData()
  }, [venueId])

  async function loadVenueData() {
    const { data } = await supabaseStaff
      .from('venues')
      .select('invite_code, slug')
      .eq('id', venueId)
      .single()
    setInviteCode(data?.invite_code || null)
    setSlug(data?.slug || null)
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
            label="QR Clientes"
            description="El cliente escanea este QR para ver la carta y hacer su pedido"
            url={clientUrl}
            showTemplate
          />
        )}
      </div>
    </div>
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
