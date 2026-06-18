import { useState } from 'react'
import { formatPrice } from '../lib/utils'

export default function SplitCalculator({ total }) {
  const [splitCount, setSplitCount] = useState(1)
  const perPerson = total / Math.max(1, splitCount)

  return (
    <div className="mt-4 bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
      <span className="text-smoke-400 text-xs mb-2 block">¿Dividir la cuenta entre cuántos?</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSplitCount(n => Math.max(1, n - 1))}
          className="w-8 h-8 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
        >
          −
        </button>
        <span className="text-smoke-300 w-6 text-center">{splitCount}</span>
        <button
          type="button"
          onClick={() => setSplitCount(n => n + 1)}
          className="w-8 h-8 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
        >
          +
        </button>
        {splitCount > 1 && (
          <span className="text-ember-400 font-mono text-sm ml-2">{formatPrice(perPerson)} c/u</span>
        )}
      </div>
    </div>
  )
}
