import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // { product, quantity, notes }
  const [location, setLocation] = useState(null) // { type, zoneId, mapX, mapY, label }

  function addItem(product, quantity = 1, notes = '') {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.notes === notes)
      if (existing) {
        return prev.map(i =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { product, quantity, notes }]
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

  function clearCart() {
    setItems([])
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
    removeItem,
    clearCart,
    subtotal,
    itemCount,
    location,
    setLocation
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
