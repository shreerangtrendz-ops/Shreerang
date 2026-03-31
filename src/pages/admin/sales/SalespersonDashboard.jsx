/**
 * SalespersonDashboard.jsx
 * File: src/pages/admin/sales/SalespersonDashboard.jsx
 *
 * Shows each salesperson ONLY their assigned contacts + their own visits.
 * Uses existing: staff_members, salesperson_contact_assignments, customers,
 *                sales_visits, sales_orders, role_permissions tables.
 * No duplicate tables created — reuses your existing Supabase schema.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// ─── Simple stat card ────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'blue', icon }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-600 text-xl`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SalespersonDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [staffMember, setStaffMember] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [contacts, setContacts]       = useState([]);
  const [visits, setVisits]           = useState([]);
  const [orders, setOrders]           = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Get current logged-in user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // Get staff member record by email
      const { data: staff } = await supabase
        .from('staff_members')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (!staff) { navigate('/login'); return; }
      setStaffMember(staff);

      // Get role permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', staff.role)
        .single();
      setPermissions(perms);

      // Load assigned contacts (salesperson sees ONLY their assigned customers)
      const { data: assignedContacts } = await supabase
        .from('salesperson_contact_assignments')
        .select(`
          assigned_at,
          notes,
          customers (
            id, name, phone, email, city, state,
            customer_type, status, firm_name, gst_number
          )
        `)
        .eq('salesperson_id', staff.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      setContacts(assignedContacts?.map(a => ({ ...a.customers, assigned_at: a.assigned_at, notes: a.notes })) || []);

      // Load own visits only
      const { data: myVisits } = await supabase
        .from('sales_visits')
        .select('id, visit_date, customer_name, customer_city, visit_type, ai_summary, status, is_productive, next_followup_date')
        .eq('salesperson_id', staff.id)
        .order('visit_date', { ascending: false })
        .limit(20);
      setVisits(myVisits || []);

      // Load own orders only
      const { data: myOrders } = await supabase
        .from('sales_orders')
        .select('id, order_number, created_at, total_amount, status, approval_status, dispatch_status')
        .eq('salesperson_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setOrders(myOrders || []);

    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.phone?.includes(searchTerm) ||
    c?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    </div>
  );

  const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {staffMember?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {staffMember?.role?.replace('_', ' ').toUpperCase()} · {staffMember?.department}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Assigned Contacts" value={contacts.length}  color="blue"   icon="👥" />
        <StatCard label="My Visits"         value={visits.length}    color="green"  icon="📍" />
        <StatCard label="My Orders"         value={orders.length}    color="purple" icon="📦" />
        <StatCard label="Total Sales (₹)"   value={`₹${(totalSales/1000).toFixed(0)}K`} color="orange" icon="💰" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Assigned Contacts ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">My Assigned Contacts</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {contacts.length} total
            </span>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, phone, city..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No contacts assigned yet</p>
            ) : filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                  {contact.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.phone} · {contact.city}</p>
                  {contact.firm_name && <p className="text-xs text-gray-400 truncate">{contact.firm_name}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  contact.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {contact.status || 'active'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── My Recent Visits ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">My Recent Visits</h2>
            {permissions?.visits_create && (
              <button
                onClick={() => navigate('/admin/field-visits')}
                className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
              >
                + New Visit
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {visits.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No visits recorded yet</p>
            ) : visits.map(visit => (
              <div key={visit.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-gray-800">{visit.customer_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    visit.is_productive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {visit.is_productive ? '✓ Productive' : 'Not Productive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  📍 {visit.customer_city} · {new Date(visit.visit_date).toLocaleDateString('en-IN')}
                </p>
                {visit.ai_summary && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{visit.ai_summary}</p>
                )}
                {visit.next_followup_date && (
                  <p className="text-xs text-orange-500 mt-1">
                    🔔 Follow up: {new Date(visit.next_followup_date).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── My Orders ── */}
        {permissions?.orders_view && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">My Orders</h2>
              {permissions?.orders_create && (
                <button
                  onClick={() => navigate('/admin/sales-orders/new')}
                  className="text-xs bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition"
                >
                  + New Order
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 pr-4">Order #</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">No orders yet</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-2 pr-4 font-medium text-blue-600">{order.order_number}</td>
                      <td className="py-2 pr-4 text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2 pr-4 font-semibold">
                        ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          order.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                          order.approval_status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {order.approval_status || 'pending'}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          order.dispatch_status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {order.dispatch_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalespersonDashboard;
