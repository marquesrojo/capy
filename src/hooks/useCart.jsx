import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  // { product, quantity, notes, menuId?, selections? }
  // Un ítem de carta de precio fijo no es un producto: es el menú entero, con
  // lo que la persona eligió en cada paso. Dos menús ejecutivos con platos
  // distintos son dos líneas, aunque valgan lo mismo y se llamen igual.
  const [items, setItems] = useState([])
  const [location, setLocation] = useState(null) // { type, zoneId, mapX, mapY, label }
  const [sessionId, setSessionId] = useState(null)
  const [assignedStaffId, setAssignedStaffId] = useState(null)

  function addItem(product, quantity = 1, notes = '', extras = null) {
    const selections = extras?.selections || null
    const key = selections ? selections.map(s => s.product_id).join('|') : ''
    setItems(prev => {
      const existing = prev.find(i =>
        i.product.id === product.id &&
        i.notes === notes &&
        (i.selections ? i.selections.map(s => s.product_id).join('|') : '') === key
      )
      if (existing) {
        return prev.map(i =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { product, quantity, notes, menuId: extras?.menuId || null, selections }]
    })
  }

  function updateQuantity(index, quantity) {
    if (quantity <= 0) {
      removeItem(index)
      return
    }
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, quantity } : item)))
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItemNotes(index, notes) {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, notes } : item)))
  }

  function clearCart() {
    setItems([])
  }

  function clearSession() {
    setItems([])
    setSessionId(null)
    setLocation(null)
    setAssignedStaffId(null)
  }

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items]
  )

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  const value = {
    items,
    addItem,
    updateQuantity,
    updateItemNotes,
    removeItem,
    clearCart,
    clearSession,
    subtotal,
    itemCount,
    location,
    setLocation,
    sessionId,
    setSessionId,
    assignedStaffId,
    setAssignedStaffId,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
