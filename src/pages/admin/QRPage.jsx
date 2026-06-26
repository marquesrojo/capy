import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'

const QR_ITEMS = [
  {
    id: 'cliente',
    label: 'QR Clientes',
    description: 'El cliente escanea este QR para ver la carta y hacer su pedido',
    url: 'https://capyapp.co',
    color: '#E8772A'
  },
  {
    id: 'admin',
    label: 'QR Camareros / Admin',
    description: 'El camarero escanea este QR para acceder al panel de pedidos',
    url: 'https://capyapp.co/admin',
    color: '#4A90D9'
  }
]

export default function QRPage() {
  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/configuracion" className="text-smoke-500 text-sm">← Volver</Link>
      </div>
      <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-6">CÓDIGOS QR</h1>
      <div className="space-y-6">
        {QR_ITEMS.map(item => (
          <QRCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function QRCard({ item }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, item.url, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1A1A1A',
        light: '#F5F0EB'
      }
    }, (err) => {
      if (!err) setReady(true)
    })
  }, [item.url])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `capy-qr-${item.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
      <p className="text-smoke-200 font-semibold mb-1">{item.label}</p>
      <p className="text-smoke-500 text-xs mb-4">{item.description}</p>
      <p className="text-smoke-600 text-xs font-mono mb-4">{item.url}</p>

      <div className="flex justify-center mb-4">
        <div className="bg-[#F5F0EB] p-4 rounded-2xl">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {ready && (
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 border border-ember-500 text-ember-500 font-semibold py-3 rounded-xl"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar PNG
        </button>
      )}
      {item.id === 'cliente' && (
        <a
          href="/qr-template.html"
          target="_blank"
          rel="noreferrer"
          className="w-full mt-2 flex items-center justify-center gap-2 border border-carbon-700 text-smoke-400 text-sm py-3 rounded-xl"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
          Template para imprimir
        </a>
      )}
    </div>
  )
}
