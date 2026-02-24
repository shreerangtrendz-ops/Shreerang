import { supabase } from '@/lib/customSupabaseClient';

export const CustomerOrderService = {
  async createOrder(orderData, cartItems, userId = null) {
    try {
      // 1. Generate Order Number
      const { data: orderNumber, error: numError } = await supabase.rpc('generate_order_number');
      
      if (numError) throw numError;

      // 2. Prepare Order Object
      const orderPayload = {
        order_number: orderNumber,
        user_id: userId,
        customer_name: orderData.customerName,
        customer_phone: orderData.phone,
        customer_email: orderData.email,
        order_type: 'online_retail',
        order_source: 'website',
        total_amount: orderData.totalAmount,
        final_amount: orderData.totalAmount,
        status: 'pending',
        payment_status: 'pending',
        shipping_address: {
            billing: orderData.billingAddress,
            delivery: orderData.deliveryAddress || orderData.billingAddress,
            firm_name: orderData.firmName
        },
        delivery_address: orderData.deliveryAddress || orderData.billingAddress,
        notes: orderData.notes,
        created_at: new Date().toISOString()
      };

      // 3. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Prepare Order Items
      const orderItemsPayload = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        sku: item.sku || 'UNKNOWN',
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      // 5. Insert Order Items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      return order;
    } catch (error) {
      console.error('Create Order Error:', error);
      throw error;
    }
  }
};