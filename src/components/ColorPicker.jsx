import { useEffect, useRef, useState } from 'react'

// Selector de color visual estilo "rueda" (en realidad cuadrado de
// saturacion/brillo + barra de matiz), sin dependencias externas.
// Recibe un color hex y devuelve otro hex via onChange.

function hexToHsv(hex) {
  let r = 0, g = 0, b = 0
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255
    g = parseInt(hex.slice(3, 5), 16) / 255
    b = parseInt(hex.slice(5, 7), 16) / 255
  }
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h, s, v }
}

function hsvToHex(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function ColorPicker({ value, onChange }) {
  const initial = hexToHsv(value || '#E8772A')
  const [hue, setHue] = useState(initial.h)
  const [sat, setSat] = useState(initial.s)
  const [val, setVal] = useState(initial.v)
  const squareRef = useRef(null)
  const draggingSquare = useRef(false)
  const draggingHue = useRef(false)

  useEffect(() => {
    const parsed = hexToHsv(value || '#E8772A')
    setHue(parsed.h)
    setSat(parsed.s)
    setVal(parsed.v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit(h, s, v) {
    onChange(hsvToHex(h, s, v))
  }

  function handleSquarePointer(e) {
    const rect = squareRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height)
    const s = x / rect.width
    const v = 1 - y / rect.height
    setSat(s)
    setVal(v)
    emit(hue, s, v)
  }

  function handleHuePointer(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const h = (x / rect.width) * 360
    setHue(h)
    emit(h, sat, val)
  }

  const currentHex = hsvToHex(hue, sat, val)
  const pureHueHex = hsvToHex(hue, 1, 1)

  return (
    <div className="space-y-3">
      <div
        ref={squareRef}
        className="relative w-full h-40 rounded-xl cursor-crosshair touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHueHex})`
        }}
        onMouseDown={e => { draggingSquare.current = true; handleSquarePointer(e) }}
        onMouseMove={e => { if (draggingSquare.current) handleSquarePointer(e) }}
        onMouseUp={() => { draggingSquare.current = false }}
        onMouseLeave={() => { draggingSquare.current = false }}
        onTouchStart={e => { draggingSquare.current = true; handleSquarePointer(e) }}
        onTouchMove={e => { if (draggingSquare.current) handleSquarePointer(e) }}
        onTouchEnd={() => { draggingSquare.current = false }}
      >
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%`, backgroundColor: currentHex }}
        />
      </div>

      <div
        className="relative w-full h-5 rounded-full cursor-pointer touch-none"
        style={{
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
        }}
        onMouseDown={e => { draggingHue.current = true; handleHuePointer(e) }}
        onMouseMove={e => { if (draggingHue.current) handleHuePointer(e) }}
        onMouseUp={() => { draggingHue.current = false }}
        onMouseLeave={() => { draggingHue.current = false }}
        onTouchStart={e => { draggingHue.current = true; handleHuePointer(e) }}
        onTouchMove={e => { if (draggingHue.current) handleHuePointer(e) }}
        onTouchEnd={() => { draggingHue.current = false }}
      >
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(hue / 360) * 100}%`, backgroundColor: pureHueHex }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-carbon-700 flex-shrink-0" style={{ backgroundColor: currentHex }} />
        <input
          type="text"
          value={currentHex}
          onChange={e => {
            const hex = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
              const parsed = hexToHsv(hex)
              setHue(parsed.h)
              setSat(parsed.s)
              setVal(parsed.v)
              onChange(hex)
            }
          }}
          className="input flex-1 text-xs font-mono py-1.5"
        />
      </div>
    </div>
  )
}
