import { supabase } from './customSupabaseClient';

export const OrderStatusHandler = {
    
    async getOrderStatus(orderIdOrPhone) {
        const isPhone = /^\+?[0-9]{10,15}$/.test(orderIdOrPhone);
        
        let query = supabase.from('sales_orders').select('order_no, status, total_amount, tracking_number');
        
        if (isPhone) {
            // Get latest order for phone
            query = query.ilike('customer_phone', `%${orderIdOrPhone.slice(-10)}%`).order('created_at', { ascending: false }).limit(1);
        } else {
            query = query.eq('order_no', orderIdOrPhone);
        }

        const { data, error } = await query.single();
        
        if (error || !data) return null;
        
        return {
            order_no: data.order_no,
            status: data.status,
            amount: data.total_amount,
            tracking: data.tracking_number || 'Not dispatched'
        };
    },

    formatStatusMessage(order) {
        if (!order) return "❌ We couldn't find an order with that details.";
        
        let emoji = '📦';
        if (order.status === 'shipped') emoji = '🚚';
        if (order.status === 'delivered') emoji = '✅';
        
        return `${emoji} Order *${order.order_no}*\nStatus: *${order.status.toUpperCase()}*\nAmount: ₹${order.amount}\nTracking: ${order.tracking}`;
    }
};