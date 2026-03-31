/**
 * AssignContactsPage.jsx
 * File: src/pages/admin/sales/AssignContactsPage.jsx
 *
 * Admin/Director only — assign specific customers to specific salespeople.
 * Uses: salesperson_contact_assignments, staff_members, customers tables.
 * Salespeople will ONLY see contacts assigned to them — nothing else.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const AssignContactsPage = () => {
  const [salespeople, setSalespeople]     = useState([]);
  const [customers, setCustomers]         = useState([]);
  const [assignments, setAssignments]     = useState([]);
  const [selectedSP, setSelectedSP]       = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedSP) loadAssignments(selectedSP); }, [selectedSP]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: sp }, { data: cust }] = await Promise.all([
      supabase.from('staff_members').select('id, name, email, role').eq('role', 'salesperson').eq('is_active', true),
      supabase.from('customers').select('id, name, phone, city, state, firm_name, customer_type, status').eq('status', 'active').order('name'),
    ]);
    setSalespeople(sp || []);
    setCustomers(cust || []);
    setLoading(false);
  };

  const loadAssignments = async (spId) => {
    const { data } = await supabase
      .from('salesperson_contact_assignments')
      .select('customer_id')
      .eq('salesperson_id', spId)
      .eq('is_active', true);
    setAssignments(data?.map(a => a.customer_id) || []);
  };

  const toggleAssignment = async (customerId) => {
    if (!selectedSP) { toast({ title: 'Select a salesperson first', variant: 'destructive' }); return; }
    setSaving(true);
    const isAssigned = assignments.includes(customerId);

    if (isAssigned) {
      // Remove assignment
      await supabase
        .from('salesperson_contact_assignments')
        .update({ is_active: false })
        .eq('salesperson_id', selectedSP)
        .eq('customer_id', customerId);
      setAssignments(prev => prev.filter(id => id !== customerId));
      toast({ title: 'Contact removed from salesperson' });
    } else {
      // Add assignment — upsert handles duplicate
      const { data: { user } } = await supabase.auth.getUser();
      const { data: admin } = await supabase.from('staff_members').select('id').eq('email', user.email).single();

      await supabase.from('salesperson_contact_assignments').upsert({
        salesperson_id: selectedSP,
        customer_id: customerId,
        assigned_by: admin?.id,
        is_active: true,
        assigned_at: new Date().toISOString(),
      }, { onConflict: 'salesperson_id,customer_id' });
      setAssignments(prev => [...prev, customerId]);
      toast({ title: 'Contact assigned ✓' });
    }
    setSaving(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.city?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.firm_name?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedSPName = salespeople.find(s => s.id === selectedSP)?.name;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Assign Contacts to Salespeople</h1>
        <p className="text-gray-500 text-sm mt-1">
          Each salesperson will only see contacts you assign to them — nothing else.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Step 1: Select Salesperson ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">① Select Salesperson</h2>
            <div className="space-y-2">
              {salespeople.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSP(sp.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedSP === sp.id
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="font-medium text-sm">{sp.name}</p>
                  <p className="text-xs text-gray-400">{sp.email}</p>
                  {selectedSP === sp.id && (
                    <p className="text-xs text-blue-500 mt-1">
                      {assignments.length} contacts assigned
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Step 2: Assign Customers ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">
                ② Assign Contacts
                {selectedSPName && <span className="text-blue-600"> → {selectedSPName}</span>}
              </h2>
              <span className="text-xs text-gray-400">
                {assignments.length} assigned · {filteredCustomers.length} shown
              </span>
            </div>

            {!selectedSP ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">👈</p>
                <p>Select a salesperson first</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search customers by name, phone, city, firm..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredCustomers.map(customer => {
                    const isAssigned = assignments.includes(customer.id);
                    return (
                      <div
                        key={customer.id}
                        onClick={() => !saving && toggleAssignment(customer.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          isAssigned
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-100 hover:bg-gray-50'
                        } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isAssigned ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isAssigned && <span className="text-white text-xs">✓</span>}
                        </div>

                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          isAssigned ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {customer.name?.[0]?.toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{customer.name}</p>
                          <p className="text-xs text-gray-500">
                            {customer.phone} · {customer.city}{customer.state ? `, ${customer.state}` : ''}
                          </p>
                          {customer.firm_name && (
                            <p className="text-xs text-gray-400 truncate">{customer.firm_name}</p>
                          )}
                        </div>

                        {/* Type badge */}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                          {customer.customer_type || 'retail'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignContactsPage;
