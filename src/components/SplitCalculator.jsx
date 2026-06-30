import { useState } from 'react'
import { formatPrice } from '../lib/utils'

const TIP_OPTIONS = [
  { label: 'Sin propina', value: 0 },
  { label: '10%', value: 0.10 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.20 },
]

export default function SplitCalculator({ total, assignedStaff }) {
  const [splitCount, setSplitCount] = useState(1)
  const [tipPct, setTipPct] = useState(0)
  const [copied, setCopied] = useState(false)

  const tipAmount = Math.round(total * tipPct)
  const totalWithTip = total + tipAmount
  const perPerson = totalWithTip / Math.max(1, splitCount)

  async function handleCopyAlias() {
    try {
      await navigator.clipboard.writeText(assignedStaff.alias_bancario)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback para browsers que no soportan clipboard API
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Dividir entre */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
        <span className="text-smoke-400 text-xs mb-2 block">¿Dividir la cuenta entre cuántos?</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSplitCount(n => Math.max(1, n - 1))}
            className="w-11 h-11 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center text-lg font-bold"
          >
            −
          </button>
          <span className="text-smoke-300 w-6 text-center font-semibold">{splitCount}</span>
          <button
            type="button"
            onClick={() => setSplitCount(n => n + 1)}
            className="w-11 h-11 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center text-lg font-bold"
          >
            +
          </button>
          {splitCount > 1 && (
            <span className="text-pucara-blue-400 font-mono text-sm ml-2">{formatPrice(perPerson)} c/u</span>
          )}
          {splitCount === 1 && tipAmount === 0 && (
            <span className="text-pucara-blue-400 font-mono text-sm ml-2">{formatPrice(total)}</span>
          )}
        </div>
      </div>

      {/* Propina */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
        <span className="text-smoke-400 text-xs mb-2 block">¿Querés agregar propina?</span>
        <div className="flex gap-2 flex-wrap">
          {TIP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipPct(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                tipPct === opt.value
                  ? 'bg-pucara-blue-500 text-white border-pucara-blue-500'
                  : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {tipAmount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-smoke-400">
              <span>Consumo</span>
              <span className="font-mono">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-smoke-400">
              <span>Propina ({Math.round(tipPct * 100)}%)</span>
              <span className="font-mono">{formatPrice(tipAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-smoke-200 pt-1 border-t border-carbon-700">
              <span>Total</span>
              <span className="font-mono text-pucara-blue-400">{formatPrice(totalWithTip)}</span>
            </div>
            {splitCount > 1 && (
              <div className="flex justify-between text-xs text-smoke-400">
                <span>Por persona</span>
                <span className="font-mono text-pucara-blue-400">{formatPrice(perPerson)}</span>
              </div>
            )}
            {assignedStaff?.alias_bancario && (
              <div className="mt-3 pt-3 border-t border-carbon-700">
                <p className="text-smoke-400 text-xs mb-2">
                  Transferile la propina a {assignedStaff.full_name}:
                </p>
                <div className="flex items-center justify-between gap-3 bg-carbon-800 rounded-xl px-3 py-2.5 mb-2">
                  <span className="font-mono text-smoke-200 text-sm">{assignedStaff.alias_bancario}</span>
                  <button
                    type="button"
                    onClick={handleCopyAlias}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
                      copied ? 'bg-emerald-600 text-white' : 'bg-pucara-blue-500 text-white'
                    }`}
                  >
                    {copied ? '¡Copiado! ✓' : 'Copiar alias'}
                  </button>
                </div>
                <a
                  href="https://www.mercadopago.com.ar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#009EE3] hover:bg-[#0088C7] text-white font-semibold py-3 rounded-xl text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.97-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.566 2.186z"/>
                  </svg>
                  Pagar {formatPrice(tipAmount)} con Mercado Pago
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
