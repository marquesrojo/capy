import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const FLOWS = {
  welcome: {
    bot: '¡Hola! Soy el asistente de Capy. ¿En qué te puedo ayudar?',
    options: [
      { label: '¿Qué es Capy?',               next: 'que-es' },
      { label: '¿Cuánto cuesta?',              next: 'precio' },
      { label: '¿Cómo funciona el sistema?',   next: 'como-funciona' },
      { label: '¿Para qué tipo de local?',     next: 'tipo-local' },
      { label: 'Hablar con un asesor →',       next: 'asesor' },
    ],
  },
  'que-es': {
    bot: 'Capy es una plataforma digital para locales gastronómicos.\n\nEl cliente escanea el QR de su mesa, ve el menú, hace el pedido y paga — todo desde el celular, sin descargar nada.\n\nEl dueño y el equipo gestionan todo en tiempo real desde el panel: pedidos, mesas, cocina y pagos.',
    options: [
      { label: '¿Cuánto cuesta?',            next: 'precio' },
      { label: '¿Cómo funciona el sistema?', next: 'como-funciona' },
      { label: 'Hablar con un asesor →',     next: 'asesor' },
    ],
  },
  'precio': {
    bot: 'Capy tiene un plan gratuito para empezar: cargás tu menú y empezás a recibir pedidos sin pagar nada.\n\nLos planes pagos desbloquean pagos integrados (MercadoPago), múltiples usuarios, alertas por WhatsApp, programa de fidelidad y más.\n\nPodemos cotizarte según el tamaño y las necesidades de tu local.',
    options: [
      { label: '¿Qué incluye cada plan?',    next: 'planes' },
      { label: '¿Cómo empiezo gratis?',      next: 'como-funciona' },
      { label: 'Hablar con un asesor →',     next: 'asesor' },
    ],
  },
  'planes': {
    bot: 'El plan gratuito incluye menú digital con QR, pedidos en tiempo real, kanban de cocina y mapa del salón.\n\nLos planes pagos agregan: pagos con MercadoPago, alertas WhatsApp para el equipo, descuentos, inventario, reservas, programa de rangos para clientes y pantalla de display para cocina.\n\nTodo configurable desde Mi Local.',
    options: [
      { label: '¿Para qué tipo de local?', next: 'tipo-local' },
      { label: 'Hablar con un asesor →',   next: 'asesor' },
    ],
  },
  'como-funciona': {
    bot: 'Es muy simple:\n\n1. Registrás tu local y cargás el menú con fotos y precios.\n2. Capy genera un QR único por mesa — lo imprimís y lo pegás.\n3. Los clientes escanean, eligen y piden. El pedido llega directo a cocina.\n4. El equipo ve todo en el panel: kanban, mapa del salón y alertas en tiempo real.\n\nSetup completo en menos de un día, sin conocimientos técnicos.',
    options: [
      { label: '¿Cuánto cuesta?',          next: 'precio' },
      { label: '¿Para qué tipo de local?', next: 'tipo-local' },
      { label: 'Hablar con un asesor →',   next: 'asesor' },
    ],
  },
  'tipo-local': {
    bot: 'Capy funciona para restaurantes, cafeterías, bares, pizzerías, hamburgueserías, cervecerías y cualquier local gastronómico con mesas.\n\nTambién tiene modo retiro para mostrador o take away.\n\nSi cobrás pedidos, Capy te sirve.',
    options: [
      { label: '¿Cuánto cuesta?',        next: 'precio' },
      { label: '¿Cómo funciona?',        next: 'como-funciona' },
      { label: 'Hablar con un asesor →', next: 'asesor' },
    ],
  },
  'asesor': {
    bot: 'Genial. Dejanos tus datos y te contactamos a la brevedad para contarte todo y armar una demo de Capy para tu local.',
    form: true,
  },
}

function BotAvatar() {
  return (
    <span className="w-7 h-7 rounded-full bg-[#3C2A21] flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
      🦫
    </span>
  )
}

export default function LeadChat({ page = 'main' }) {
  const { isStaff } = useAuth()
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [step, setStep]       = useState('welcome')
  const [form, setForm]       = useState({ name: '', email: '', whatsapp: '' })
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const bottomRef             = useRef(null)

  // Init conversation when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: 'bot', text: FLOWS.welcome.bot }])
      setStep('welcome')
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Don't show for authenticated staff (after all hooks)
  if (isStaff) return null

  function selectOption(opt) {
    setMessages(prev => [...prev, { from: 'user', text: opt.label }])
    const flow = FLOWS[opt.next]
    setStep(opt.next)
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: flow.bot }])
    }, 250)
  }

  async function submitForm(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, page }),
      })
      if (!res.ok) throw new Error()
      setStep('done')
      setMessages(prev => [...prev,
        { from: 'user', text: `${form.name} — ${form.email}` },
        { from: 'bot',  text: '¡Perfecto! Te contactamos pronto. Si necesitás algo urgente podés escribirnos a hola@capyapp.co 🦫' },
      ])
    } catch {
      setError('No se pudo enviar. Intentá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const currentFlow = FLOWS[step]
  const lastIsBot   = messages.length > 0 && messages[messages.length - 1].from === 'bot'

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[5.5rem] right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px]">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-carbon-800 flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(72vh, 560px)' }}
          >
            {/* Header */}
            <div className="bg-[#3C2A21] px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">🦫</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Capy</p>
                  <p className="text-white/50 text-[10px]">Asistente comercial</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white/90 transition-colors p-1 rounded-lg"
                aria-label="Cerrar chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.from === 'bot' ? 'justify-start' : 'justify-end'}`}>
                  {msg.from === 'bot' && <BotAvatar />}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      msg.from === 'bot'
                        ? 'text-[#3C2A21] border border-carbon-800'
                        : 'bg-ember-500 text-white'
                    }`}
                    style={msg.from === 'bot' ? { background: '#F5F3F0' } : {}}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Options or form — only show after last bot message */}
              {lastIsBot && step !== 'done' && (
                <div className="pl-9 mt-1">
                  {currentFlow?.form ? (
                    <form onSubmit={submitForm} className="space-y-2">
                      <input
                        type="text"
                        placeholder="Tu nombre *"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                        className="w-full border border-carbon-800 rounded-xl px-3 py-2.5 text-sm text-[#3C2A21] placeholder-smoke-400 focus:outline-none focus:border-ember-400 bg-white"
                      />
                      <input
                        type="email"
                        placeholder="Tu email *"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        required
                        className="w-full border border-carbon-800 rounded-xl px-3 py-2.5 text-sm text-[#3C2A21] placeholder-smoke-400 focus:outline-none focus:border-ember-400 bg-white"
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp (opcional)"
                        value={form.whatsapp}
                        onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                        className="w-full border border-carbon-800 rounded-xl px-3 py-2.5 text-sm text-[#3C2A21] placeholder-smoke-400 focus:outline-none focus:border-ember-400 bg-white"
                      />
                      {error && (
        <p className="text-xs text-smoke-400 leading-snug">
          No se pudo enviar. Escribinos directamente a{' '}
          <a href="mailto:capy@bravosm.com" className="text-ember-500 underline">capy@bravosm.com</a>
        </p>
      )}
                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                      >
                        {sending ? 'Enviando…' : 'Quiero que me contacten →'}
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {currentFlow?.options?.map((opt) => (
                        <button
                          key={opt.next}
                          onClick={() => selectOption(opt)}
                          className="text-left border border-carbon-800 hover:border-ember-500/60 hover:bg-ember-500/5 rounded-xl px-3 py-2 text-sm text-[#3C2A21] font-medium transition-colors bg-white"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full shadow-ember flex items-center justify-center transition-all duration-200"
        style={{ background: open ? '#3C2A21' : '#E8772A' }}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </>
  )
}
