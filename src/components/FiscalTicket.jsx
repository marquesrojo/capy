import { useState } from 'react'
import { emitFiscalInvoice, buildTicketWaUrl, shareTicket } from '../lib/fiscal'

// Facturación explícita: el cajero aprieta Facturar en un pedido ya cobrado.
// El comprobante es 100% digital (PDF 80mm de TusFacturas): se ve, se manda
// por WhatsApp o se comparte — sin impresora. Se usa en el kanban (Pagado hoy)
// y en el Historial.
export default function FiscalTicket({ order, invoice, onEmitted, venueName }) {
  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState('')
  const [shareState, setShareState] = useState('')

  async function handleEmit() {
    setEmitting(true)
    setError('')
    try {
      const result = await emitFiscalInvoice(order.id)
      if (result.invoice) onEmitted?.(order.id, result.invoice)
      if (!result.success) setError(result.error || 'No se pudo emitir la factura')
    } catch (e) {
      setError(e?.message || 'Error de red')
    }
    setEmitting(false)
  }

  async function handleShare() {
    const result = await shareTicket({ pdfUrl: invoice.pdf_url, venueName })
    if (result === 'copied') {
      setShareState('¡Link copiado!')
      setTimeout(() => setShareState(''), 2000)
    }
  }

  if (invoice?.status === 'approved') {
    return (
      <div className="mt-2 pt-2 border-t border-carbon-800">
        <p className="text-emerald-600 text-[11px] font-semibold mb-1.5">
          🧾 Factura B {invoice.invoice_number ? `#${invoice.invoice_number}` : ''} · CAE {invoice.cae?.slice(0, 8)}...
        </p>
        {invoice.pdf_url && (
          <div className="flex flex-wrap gap-1.5">
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-smoke-400 border border-carbon-700 text-[11px] px-2.5 py-1 rounded-full hover:text-smoke-200"
            >
              Ver ticket
            </a>
            <a
              href={buildTicketWaUrl({
                phone: order.customers?.whatsapp,
                venueName,
                pdfUrl: invoice.pdf_url,
                dailyNumber: order.daily_number,
              })}
              target="_blank"
              rel="noreferrer"
              className="text-white bg-emerald-600 hover:bg-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            >
              WhatsApp
            </a>
            <button
              onClick={handleShare}
              className="text-smoke-400 border border-carbon-700 text-[11px] px-2.5 py-1 rounded-full hover:text-smoke-200"
            >
              {shareState || 'Compartir'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-carbon-800">
      <button
        onClick={handleEmit}
        disabled={emitting}
        className="w-full text-[11px] font-semibold py-1.5 rounded-lg border border-ember-500/50 text-ember-500 hover:bg-ember-500/10 disabled:opacity-50 transition-colors"
      >
        {emitting ? 'Emitiendo...' : invoice?.status === 'error' ? '🧾 Reintentar factura' : '🧾 Facturar'}
      </button>
      {(error || invoice?.error_message) && (
        <p className="text-red-500 text-[10px] mt-1 leading-snug">{error || invoice.error_message}</p>
      )}
    </div>
  )
}
