import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../lib/supabase'

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capy-chat`
const TICKET_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ticket`

const WELCOME = '¡Hola! Soy Capy 🦫\n\n¿En qué puedo ayudarte hoy? Puedo orientarte con la configuración de la app, tips de gestión de tu local o cualquier duda sobre Capy.'

export default function CapyChat({ venueName = '' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState(null)
  const [ticketSent, setTicketSent] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const location = useLocation()

  const isWaiter = location.pathname === '/admin/tomar'

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: WELCOME }])
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function getAuthHeaders() {
    const { data: { session } } = await supabaseStaff.auth.getSession()
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newMessages,
          venue_id: ACTIVE_VENUE_ID,
          venue_name: venueName,
          chat_id: chatId,
          source: isWaiter ? 'waiter' : 'venue_admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (data.chat_id && !chatId) setChatId(data.chat_id)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu consulta. Intentá de nuevo en un momento.',
      }])
    }
    setLoading(false)
  }

  async function openTicket() {
    if (ticketSent) return
    try {
      const headers = await getAuthHeaders()
      const context = messages.slice(-10)
      const summaryMsg = context
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Capy'}: ${m.content}`)
        .join('\n\n')
      await fetch(TICKET_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: summaryMsg,
          staff_name: venueName || 'Admin',
          venue_id: ACTIVE_VENUE_ID,
          chat_context: context,
          source: isWaiter ? 'waiter' : 'venue_admin',
        }),
      })
      setTicketSent(true)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✓ Ticket enviado. El equipo de Capy va a revisar tu consulta pronto.',
      }])
    } catch {
      // silently fail ticket creation
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleClose() {
    setOpen(false)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente Capy"
          className="fixed right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl select-none active:scale-95 transition-transform"
          style={{ bottom: isWaiter ? '5.5rem' : '1.5rem', backgroundColor: '#1A2332' }}
        >
          🦫
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={handleClose}
          />
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ height: '72vh', maxHeight: '620px' }}
          >
            {/* Header */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-5 py-4 rounded-t-3xl"
              style={{ backgroundColor: '#1A2332' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">🦫</span>
                <div>
                  <p className="text-white font-black text-sm leading-none">Capy</p>
                  <p className="text-white/50 text-[10px] leading-none mt-0.5">Asistente de Capy App</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={openTicket}
                    disabled={ticketSent}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/20 text-white/70 disabled:opacity-40 transition-opacity"
                  >
                    {ticketSent ? '✓ Ticket enviado' : 'Abrir ticket'}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={msg.role === 'user'
                      ? { backgroundColor: '#1A2332', color: 'white' }
                      : { backgroundColor: '#F0F4F8', color: '#1A2332' }
                    }
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#F0F4F8] rounded-2xl px-4 py-2.5 text-sm text-[#9DAAB8]">
                    Capy está escribiendo...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-black/[0.06] flex items-end gap-2 bg-white rounded-b-none">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Preguntale algo a Capy..."
                className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm bg-[#F0F4F8] text-[#1A2332] outline-none border-none placeholder:text-[#9DAAB8]"
                rows={1}
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0 active:scale-95 transition-transform"
                style={{ backgroundColor: '#1A2332' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
