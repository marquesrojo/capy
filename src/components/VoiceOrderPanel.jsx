import { useEffect, useRef, useState } from 'react'
import { XIcon } from './Icons'

// Pedido por voz para el cliente. Usa el mismo motor que la comanda del
// camarero: SpeechRecognition del navegador para el dictado y parse-voice-order
// para cruzarlo contra la carta del local.
//
// Nunca agrega nada solo: el cliente no conoce los nombres exactos de la carta
// —dice "napo" y en el menú figura "MILANESA NAPOLITANA CON PAPAS"—, así que la
// pantalla de confirmación es la función, no un trámite.
export default function VoiceOrderPanel({ venueId, accent = '#1A3A6B', accentText = '#FFFFFF', onAddItems, onRecommend, onWaiter, onClose }) {
  const [state, setState] = useState('idle') // idle | recording | processing | result | error
  const [transcript, setTranscript] = useState('')
  const [items, setItems] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef(null)

  // Cortar el micrófono si el panel se cierra en medio del dictado
  useEffect(() => () => { try { recognitionRef.current?.abort() } catch { /* ya terminó */ } }, [])

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setErrorMsg('Tu teléfono no permite dictar. Podés pedir tocando los platos de la carta.')
      setState('error')
      return
    }
    const recognition = new SR()
    recognition.lang = 'es-AR'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition
    setTranscript('')
    setItems([])
    setErrorMsg('')
    setState('recording')

    let gotResult = false
    recognition.onresult = async (e) => {
      gotResult = true
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(text)
      setState('processing')
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-voice-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ transcript: text, venue_id: venueId }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setItems((data.items || []).map(i => ({ ...i, quantity: i.quantity || 1 })))
        setState('result')
      } catch (err) {
        setErrorMsg(err.message || 'No pudimos entender el pedido. Probá de nuevo.')
        setState('error')
      }
    }
    recognition.onerror = (e) => {
      if (gotResult) return // errores de cierre después de capturar: no son fallas
      setErrorMsg(e.error === 'no-speech'
        ? 'No te escuchamos. Acercá el teléfono y probá de nuevo.'
        : 'No pudimos usar el micrófono. Revisá los permisos del navegador.')
      setState('error')
    }
    recognition.onend = () => { recognitionRef.current = null }
    recognition.start()
  }

  function changeQty(idx, delta) {
    setItems(prev => prev
      .map((it, i) => i === idx ? { ...it, quantity: it.quantity + delta } : it)
      .filter(it => it.quantity > 0))
  }

  function confirm() {
    onAddItems(items)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto pb-8">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06]">
          <p className="font-black text-[#1A2332] text-base">Pedí hablando</p>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#9DAAB8] p-1">
            <XIcon size={20} />
          </button>
        </div>

        <div className="px-5 pt-5">
          {state === 'idle' && (
            <>
              <button
                onClick={startRecording}
                className="w-full rounded-2xl py-7 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <MicIcon size={38} />
                <span className="font-bold text-base">Tocá y decí tu pedido</span>
              </button>
              <p className="text-[#9DAAB8] text-xs text-center mt-3 leading-snug">
                Por ejemplo: "dos milanesas con papas y una coca sin hielo"
              </p>

              {/* El recomendador vive acá adentro: es la otra forma de resolver
                  lo mismo —qué pido— y tener dos botones flotantes para eso
                  partía la decisión en dos lugares de la pantalla */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-black/[0.08]" />
                <span className="text-[#C0CBDA] text-[11px] font-semibold uppercase tracking-wider">o</span>
                <div className="h-px flex-1 bg-black/[0.08]" />
              </div>
              <button
                onClick={onRecommend}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.98] transition-transform"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <span>✨</span> No sé qué pedir, recomendame
              </button>

              {onWaiter && (
                <button
                  onClick={onWaiter}
                  className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-sm border-2 border-[#E8EEF4] text-[#4A5568] active:scale-[0.98] transition-transform"
                >
                  Prefiero llamar a un camarero/a
                </button>
              )}
            </>
          )}

          {state === 'recording' && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="relative">
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: `${accent}33` }}
                />
                <div
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  <MicIcon size={40} />
                </div>
              </div>
              <p className="text-[#1A2332] font-semibold">Te estamos escuchando...</p>
              <button
                onClick={() => recognitionRef.current?.stop()}
                className="text-sm font-semibold underline"
                style={{ color: accent }}
              >
                Listo, ya dije todo
              </button>
            </div>
          )}

          {state === 'processing' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div
                className="w-10 h-10 rounded-full border-[3px] border-black/10 animate-spin"
                style={{ borderTopColor: accent }}
              />
              <p className="text-[#8896A5] text-sm">Buscando en la carta...</p>
              {transcript && <p className="text-[#C0CBDA] text-xs text-center px-4 italic">"{transcript}"</p>}
            </div>
          )}

          {state === 'result' && (
            <>
              {/* El transcript queda a la vista: la carta puede no tener algo de
                  lo que pidió, y así se nota que falta en vez de desaparecer */}
              {transcript && (
                <div className="bg-[#F0F4F8] rounded-xl px-3 py-2 mb-4">
                  <p className="text-[#9DAAB8] text-[10px] font-semibold uppercase tracking-wide">Escuchamos</p>
                  <p className="text-[#4A5568] text-sm italic mt-0.5">"{transcript}"</p>
                </div>
              )}

              {items.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[#1A2332] font-semibold text-sm">No encontramos eso en la carta</p>
                  <p className="text-[#8896A5] text-xs mt-1.5 leading-snug">
                    Probá con el nombre del plato como figura en el menú, o pedile a un camarero/a.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={`${item.product_id}-${i}`} className="bg-white border border-black/[0.08] rounded-xl px-3 py-2.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#1A2332] text-sm font-semibold leading-tight">{item.product_name}</p>
                        {item.note && <p className="text-[#8896A5] text-xs mt-0.5">{item.note}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => changeQty(i, -1)}
                          aria-label={`Quitar ${item.product_name}`}
                          className="w-8 h-8 rounded-lg bg-[#F0F4F8] text-[#4A5568] font-bold"
                        >−</button>
                        <span className="w-5 text-center text-sm font-semibold text-[#1A2332]">{item.quantity}</span>
                        <button
                          onClick={() => changeQty(i, 1)}
                          aria-label={`Agregar ${item.product_name}`}
                          className="w-8 h-8 rounded-lg font-bold"
                          style={{ backgroundColor: accent, color: accentText }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <p className="text-[#8896A5] text-xs text-center mt-4 leading-snug">
                  Podés seguir cambiando cantidades o sacar cosas en tu pedido antes de confirmar.
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={startRecording}
                  className="flex-1 border-2 border-[#D1D9E0] text-[#4A5568] font-semibold py-3 rounded-xl text-sm"
                >
                  Repetir
                </button>
                {items.length > 0 && (
                  <button
                    onClick={confirm}
                    className="flex-1 font-bold py-3 rounded-xl text-sm"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    Agregar al pedido
                  </button>
                )}
              </div>
            </>
          )}

          {state === 'error' && (
            <div className="py-8 text-center">
              <p className="text-[#1A2332] font-semibold text-sm">{errorMsg}</p>
              <button
                onClick={startRecording}
                className="mt-5 font-bold py-3 px-6 rounded-xl text-sm"
                style={{ backgroundColor: accent, color: accentText }}
              >
                Probar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MicIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" />
    </svg>
  )
}
