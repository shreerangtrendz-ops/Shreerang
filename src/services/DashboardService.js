import { supabase } from '@/lib/customSupabaseClient';

// Helper to safely execute a Supabase query with fallback
const safeFetch = async (promise, fallbackValue) => {
  try {
    const { data, error, count } = await promise;
    if (error) {
      console.warn('[DashboardService] Supabase fetch error:', error.message);
      return fallbackValue;
    }
    return count !== null && count !== undefined ? count : (data || fallbackValue);
  } catch (err) {
    console.error('[DashboardService] Unexpected error:', err);
    return fallbackValue;
  }
};

// Helper for sum queries
const safeSum = async (table, column, filters = {}) => {
  try {
    let q = supabase.from(table).select(column);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) return 0;
    return (data || []).reduce((s, r) => s + (parseFloat(r[column]) || 0), 0);
  } catch { return 0; }
};

export const DashboardService = {

  // ── CATALOGUE COUNTS ──────────────────────────────────────
  async getTotalFabrics() {
    return safeFetch(
      supabase.from('fabric_master').select('*', { count: 'exact', head: true }),
      0
    );
  },
  async getTotalDesigns() {
    return safeFetch(
      supabase.from('designs').select('*', { count: 'exact', head: true }),
      0
    );
  },
  async getTotalProducts() {
    return safeFetch(
      supabase.from('product_masters').select('*', { count: 'exact', head: true }),
      0
    );
  },

  // ── ORDERS ────────────────────────────────────────────────
  async getTotalOrders() {
    return safeFetch(
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      0
    );
  },
  async getPendingOrders() {
    return safeFetch(
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing', 'confirmed']),
      0
    );
  },
  async getRecentOrders(limit = 5) {
    return safeFetch(
      supabase.from('orders')
        .select('id, order_number, customer_name, final_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  // ── ACCOUNTING: PURCHASE BILLS ────────────────────────────
  async getTotalPurchaseThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
    try {
      const { data, error } = await supabase
        .from('purchase_bills')
        .select('total_amount')
        .gte('invoice_date', start)
        .lte('invoice_date', end);
      if (error) return 0;
      return (data || []).reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    } catch { return 0; }
  },

  // ── ACCOUNTING: SALES BILLS ───────────────────────────────
  async getTotalSalesThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
    try {
      const { data, error } = await supabase
        .from('sales_bills')
        .select('total_amount')
        .gte('bill_date', start)
        .lte('bill_date', end);
      if (error) {
        // Try 'orders' table as fallback
        const { data: od, error: oe } = await supabase
          .from('orders')
          .select('final_amount')
          .gte('created_at', start)
          .lte('created_at', end);
        if (oe) return 0;
        return (od || []).reduce((s, r) => s + (parseFloat(r.final_amount) || 0), 0);
      }
      return (data || []).reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    } catch { return 0; }
  },

  // ── ACCOUNTING: OUTSTANDING ───────────────────────────────
  async getOutstandingReceivable() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('final_amount, paid_amount')
        .in('status', ['pending', 'processing', 'dispatched', 'partially_paid']);
      if (error) return 0;
      return (data || []).reduce((s, r) => {
        const outstanding = (parseFloat(r.final_amount) || 0) - (parseFloat(r.paid_amount) || 0);
        return s + Math.max(0, outstanding);
      }, 0);
    } catch { return 0; }
  },

  async getOutstandingPayable() {
    try {
      const { data, error } = await supabase
        .from('purchase_fabric')
        .select('amount, paid_amount')
        .neq('payment_status', 'paid');
      if (error) return 0;
      return (data || []).reduce((s, r) => {
        const outstanding = (parseFloat(r.amount) || 0) - (parseFloat(r.paid_amount) || 0);
        return s + Math.max(0, outstanding);
      }, 0);
    } catch { return 0; }
  },

  // ── TALLY SYNC STATUS ─────────────────────────────────────
  async getLastTallySyncTime() {
    try {
      const { data, error } = await supabase
        .from('tally_sync_log')
        .select('synced_at, sync_type, status')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    } catch { return null; }
  },

  async getTallySyncErrors() {
    return safeFetch(
      supabase.from('tally_sync_errors')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),
      0
    );
  },

  // ── RECENT ITEMS ──────────────────────────────────────────
  async getRecentDesigns(limit = 5) {
    return safeFetch(
      supabase.from('designs')
        .select('id, design_number, design_name, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  async getRecentPurchaseBills(limit = 5) {
    return safeFetch(
      supabase.from('purchase_bills')
        .select('id, bill_number, supplier_name, total_amount, invoice_date, status')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  async getRecentSalesBills(limit = 5) {
    return safeFetch(
      supabase.from('sales_bills')
        .select('id, bill_number, customer_name, total_amount, bill_date, status')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  // ── ANALYTICS ────────────────────────────────────────────
  async getOrdersByStatus() {
    try {
      const { data, error } = await supabase.from('orders').select('status');
      if (error) throw error;
      return (data || []).reduce((acc, r) => {
        const s = r.status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
    } catch { return {}; }
  },

  async getDesignsByFabricType() {
    try {
      const { data, error } = await supabase.from('fabric_master').select('type');
      if (error) throw error;
      const stats = (data || []).reduce((acc, r) => {
        const t = r.type || 'Other';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(stats).map(([fabric_type, count]) => ({ fabric_type, count }));
    } catch { return []; }
  },

  async getTotalCostSheets() {
    return safeFetch(
      supabase.from('cost_sheets').select('*', { count: 'exact', head: true }),
      0
    );
  },

  // ── COMPOSITE: All dashboard KPIs in one call ─────────────
  async getDashboardKPIs() {
    const [
      totalFabrics, totalDesigns, totalOrders, pendingOrders,
      purchaseThisMonth, salesThisMonth,
      outstandingReceivable, outstandingPayable,
      lastTallySync, tallySyncErrors
    ] = await Promise.allSettled([
      DashboardService.getTotalFabrics(),
      DashboardService.getTotalDesigns(),
      DashboardService.getTotalOrders(),
      DashboardService.getPendingOrders(),
      DashboardService.getTotalPurchaseThisMonth(),
      DashboardService.getTotalSalesThisMonth(),
      DashboardService.getOutstandingReceivable(),
      DashboardService.getOutstandingPayable(),
      DashboardService.getLastTallySyncTime(),
      DashboardService.getTallySyncErrors(),
    ]);

    const v = (r, d) => r.status === 'fulfilled' && r.value !== undefined ? r.value : d;

    return {
      totalFabrics:            v(totalFabrics, 0),
      totalDesigns:            v(totalDesigns, 0),
      totalOrders:             v(totalOrders, 0),
      pendingOrders:           v(pendingOrders, 0),
      purchaseThisMonth:       v(purchaseThisMonth, 0),
      salesThisMonth:          v(salesThisMonth, 0),
      outstandingReceivable:   v(outstandingReceivable, 0),
      outstandingPayable:      v(outstandingPayable, 0),
      lastTallySync:           v(lastTallySync, null),
      tallySyncErrors:         v(tallySyncErrors, 0),
    };
  }
};
