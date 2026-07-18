import { useState } from 'react'
import { supabaseStaff } from '../lib/supabase'
import { emitFiscalInvoice, buildTicketWaUrl, shareTicket } from '../lib/fiscal'

// Facturación explícita: el cajero aprieta Facturar en un pedido ya cobrado.
// El comprobante es 100% digital (PDF 80mm de TusFacturas): se ve, se manda
// por WhatsApp o se comparte — sin impresora. Se usa en el kanban (Pagado hoy)
// y en el Historial.
export default function FiscalTicket({ order, invoice, onEmitted, venueName }) {
  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState('')
  const [shareState, setShareState] = useState('')
  const [localPhone, setLocalPhone] = useState('')
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')

  // WhatsApp del cliente: el del perfil, o el cargado por el cajero en el pedido
  const phone = localPhone || order.contact_whatsapp || order.customers?.whatsapp || ''

  async function savePhone() {
    const digits = phoneInput.replace(/\D/g, '')
    if (!digits) { setEditingPhone(false); return }
    await supabaseStaff.from('orders').update({ contact_whatsapp: digits }).eq('id', order.id)
    setLocalPhone(digits)
    setEditingPhone(false)
  }

  const [showAForm, setShowAForm] = useState(false)
  const [cuit, setCuit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')

  async function handleEmit(options = {}) {
    setEmitting(true)
    setError('')
    try {
      const result = await emitFiscalInvoice(order.id, options)
      if (result.invoice) onEmitted?.(order.id, result.invoice)
      if (!result.success) setError(result.error || 'No se pudo emitir la factura')
      else setShowAForm(false)
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
          🧾 Factura {invoice.invoice_type === '1' ? 'A' : 'B'} {invoice.invoice_number ? `#${invoice.invoice_number}` : ''} · CAE {invoice.cae?.slice(0, 8)}...
        </p>
        {invoice.pdf_url && (
          editingPhone ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') savePhone() }}
                placeholder="WhatsApp del cliente (ej: 5491122334455)"
                className="flex-1 min-w-0 bg-carbon-800 border border-carbon-600 rounded-full px-3 py-1 text-[11px] text-smoke-200 outline-none focus:border-emerald-500"
              />
              <button
                onClick={savePhone}
                className="text-white bg-emerald-600 hover:bg-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingPhone(false)}
                className="text-smoke-500 text-[11px] px-1 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
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
                  phone,
                  venueName,
                  pdfUrl: invoice.pdf_url,
                  dailyNumber: order.daily_number,
                })}
                target="_blank"
                rel="noreferrer"
                className="text-white bg-emerald-600 hover:bg-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                title={phone ? `Enviar a ${phone}` : 'Sin número: abre WhatsApp para elegir contacto'}
              >
                WhatsApp{phone ? '' : ' (elegir contacto)'}
              </a>
              <button
                onClick={() => { setPhoneInput(phone); setEditingPhone(true) }}
                className="text-smoke-400 border border-carbon-700 text-[11px] px-2.5 py-1 rounded-full hover:text-smoke-200"
                title="Cargar o cambiar el WhatsApp del cliente"
              >
                {phone ? '✎ N°' : '+ N°'}
              </button>
              <button
                onClick={handleShare}
                className="text-smoke-400 border border-carbon-700 text-[11px] px-2.5 py-1 rounded-full hover:text-smoke-200"
              >
                {shareState || 'Compartir'}
              </button>
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-carbon-800">
      {showAForm ? (
        <div className="space-y-1.5">
          <p className="text-smoke-400 text-[11px] font-semibold">Factura A — cliente Responsable Inscripto</p>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={cuit}
            onChange={e => setCuit(e.target.value)}
            placeholder="CUIT (11 dígitos, sin guiones)"
            className="w-full bg-carbon-800 border border-carbon-600 rounded-lg px-3 py-1.5 text-[11px] text-smoke-200 outline-none focus:border-ember-500"
          />
          <input
            type="text"
            value={razonSocial}
            onChange={e => setRazonSocial(e.target.value)}
            placeholder="Razón social"
            className="w-full bg-carbon-800 border border-carbon-600 rounded-lg px-3 py-1.5 text-[11px] text-smoke-200 outline-none focus:border-ember-500"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => handleEmit({ invoiceType: 'A', client: { cuit, razonSocial } })}
              disabled={emitting || cuit.replace(/\D/g, '').length !== 11 || !razonSocial.trim()}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-ember-500 hover:bg-ember-600 text-white disabled:opacity-40 transition-colors"
            >
              {emitting ? 'Emitiendo...' : 'Emitir Factura A'}
            </button>
            <button
              onClick={() => setShowAForm(false)}
              disabled={emitting}
              className="text-smoke-500 text-[11px] px-2.5 rounded-lg border border-carbon-700"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleEmit()}
            disabled={emitting}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-ember-500/50 text-ember-500 hover:bg-ember-500/10 disabled:opacity-50 transition-colors"
          >
            {emitting ? 'Emitiendo...' : invoice?.status === 'error' ? '🧾 Reintentar factura' : '🧾 Facturar'}
          </button>
          <button
            onClick={() => setShowAForm(true)}
            disabled={emitting}
            className="text-[11px] font-semibold py-1.5 px-2.5 rounded-lg border border-carbon-600 text-smoke-400 hover:text-smoke-200 hover:border-carbon-500 disabled:opacity-50 transition-colors"
            title="Factura A: cliente Responsable Inscripto con CUIT"
          >
            A
          </button>
        </div>
      )}
      {(error || invoice?.error_message) && (
        <p className="text-red-500 text-[10px] mt-1 leading-snug">{error || invoice.error_message}</p>
      )}
    </div>
  )
}
