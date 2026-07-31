import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Crea el pedido que carga el camarero desde su comanda.
//
// Va con service role porque el camarero puede estar atendiendo un local al que
// está vinculado y no es dueño: la RLS de orders no lo dejaría escribir ahí.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const venueId = body.venueId
    const locationLabel = body.locationLabel
    const items = body.items
    const total = body.total
    const staffId = body.staffId || null
    const notes = body.notes || null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const orderInsert = {
      venue_id: venueId,
      location_label: locationLabel,
      location_type: 'mesa',
      status: 'recibido',
      // Sin descuentos todavía: el subtotal es el total. Si el camarero aplica
      // uno, la comanda actualiza los dos después de crear el pedido.
      subtotal: total,
      total: total,
      // La comanda las manda desde el principio y acá se perdían: el pedido
      // llegaba a la cocina sin las aclaraciones de la mesa
      notes: notes,
    }

    if (staffId) {
      orderInsert.assigned_staff_id = staffId
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select('id, daily_number')
      .single()

    if (orderError) throw new Error(orderError.message)

    const orderItems = items.map((i) => ({
      order_id: order.id,
      // Un menú de precio fijo no es un producto de la carta: no hay id que
      // referenciar, y lo que se eligió vive en selected_options
      product_id: i.product_id || null,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.unit_price * i.quantity,
      // Se perdían igual que las notas generales: "sin sal" nunca llegaba
      item_notes: i.item_notes || null,
      venue_menu_id: i.venue_menu_id || null,
      selected_options: i.selected_options || null,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw new Error(itemsError.message)

    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
