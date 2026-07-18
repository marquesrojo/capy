import { formatPrice } from '../lib/utils'

// Resumen de cuenta NO fiscal: detalle de ítems y precios para que el
// cliente revise antes de cobrar/facturar (la "pre-cuenta"). Se imprime
// desde el navegador o se comparte por WhatsApp — sin impresora térmica.
export default function AccountSummary({ orders, venueName, locationLabel, onClose }) {
  const items = []
  orders.forEach(o => {
    ;(o.order_items || []).forEach(it => {
      items.push({
        qty: it.quantity,
        name: it.product_name,
        unit: Number(it.unit_price) || 0,
        total: Number(it.line_total ?? it.quantity * it.unit_price) || 0,
      })
    })
  })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const discount = Math.max(0, subtotal - total)
  const fecha = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

  function buildText() {
    const lines = [
      `🧾 Cuenta — ${venueName || 'nuestro local'}${locationLabel ? ` · ${locationLabel}` : ''}`,
      fecha,
      '──────────────',
      ...items.map(i => `${i.qty}× ${i.name} — ${formatPrice(i.total)}`),
      '──────────────',
    ]
    if (discount > 0) {
      lines.push(`Subtotal: ${formatPrice(subtotal)}`)
      lines.push(`Descuento: -${formatPrice(discount)}`)
    }
    lines.push(`*TOTAL: ${formatPrice(total)}*`)
    lines.push('(Resumen de cuenta — no válido como factura)')
    return lines.join('\n')
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildText())}`, '_blank')
  }

  function handlePrint() {
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows = items.map(i => `
      <tr>
        <td class="qty">${i.qty}×</td>
        <td>${esc(i.name)}<div class="unit">${i.qty > 1 ? `${formatPrice(i.unit)} c/u` : ''}</div></td>
        <td class="amt">${formatPrice(i.total)}</td>
      </tr>`).join('')
    const w = window.open('', '_blank', 'width=400,height=640')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>Cuenta</title><style>
      body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 12px; color: #111; }
      h2 { text-align: center; font-size: 16px; margin: 0 0 2px; }
      .sub { text-align: center; font-size: 11px; margin: 0 0 10px; color: #444; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      td { padding: 3px 0; vertical-align: top; }
      .qty { width: 28px; }
      .amt { text-align: right; white-space: nowrap; }
      .unit { font-size: 10px; color: #666; }
      .sep { border-top: 1px dashed #999; margin: 8px 0; }
      .tot { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
      .tot.grand { font-size: 15px; font-weight: bold; margin-top: 6px; }
      .foot { text-align: center; font-size: 10px; color: #666; margin-top: 14px; }
    </style></head><body>
      <h2>${esc(venueName || 'Cuenta')}</h2>
      <p class="sub">${esc(locationLabel || '')} · ${esc(fecha)}</p>
      <div class="sep"></div>
      <table>${rows}</table>
      <div class="sep"></div>
      ${discount > 0 ? `
        <div class="tot"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="tot"><span>Descuento</span><span>-${formatPrice(discount)}</span></div>` : ''}
      <div class="tot grand"><span>TOTAL</span><span>${formatPrice(total)}</span></div>
      <p class="foot">Resumen de cuenta — no válido como factura<br/>¡Gracias por tu visita! 🧉</p>
      <script>window.onload = () => { window.print() }</script>
    </body></html>`)
    w.document.close()
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(buildText()) } catch {}
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 text-center border-b border-dashed border-gray-300">
          <p className="font-bold text-gray-900 text-lg leading-tight">{venueName || 'Cuenta'}</p>
          <p className="text-gray-500 text-xs mt-0.5">{locationLabel ? `${locationLabel} · ` : ''}{fecha}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 font-mono text-[13px]">
          {items.map((i, idx) => (
            <div key={idx} className="flex items-start gap-2 py-1">
              <span className="text-gray-500 w-7 flex-shrink-0 text-right">{i.qty}×</span>
              <span className="flex-1 text-gray-800 leading-snug">
                {i.name}
                {i.qty > 1 && <span className="block text-[11px] text-gray-400">{formatPrice(i.unit)} c/u</span>}
              </span>
              <span className="text-gray-800 whitespace-nowrap">{formatPrice(i.total)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 mt-2 pt-2">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-gray-500 text-xs py-0.5">
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 text-xs py-0.5">
                  <span>Descuento</span><span>-{formatPrice(discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-gray-900 font-bold text-base pt-1">
              <span>TOTAL</span><span>{formatPrice(total)}</span>
            </div>
          </div>
          <p className="text-center text-gray-400 text-[10px] mt-3">Resumen de cuenta — no válido como factura</p>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            onClick={handlePrint}
            className="bg-gray-900 text-white text-xs font-semibold py-2.5 rounded-xl"
          >
            🖨 Imprimir
          </button>
          <button
            onClick={handleWhatsApp}
            className="bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl"
          >
            WhatsApp
          </button>
          <button
            onClick={handleCopy}
            className="border border-gray-300 text-gray-600 text-xs font-semibold py-2.5 rounded-xl"
          >
            Copiar texto
          </button>
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-600 text-xs font-semibold py-2.5 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
