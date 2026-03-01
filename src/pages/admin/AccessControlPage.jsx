import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ROLES = [
  { id: 'admin', label: 'Admin', icon: '👑', color: 'bg-red-100 text-red-700', desc: 'Full system access' },
  { id: 'manager', label: 'Manager', icon: '🏆', color: 'bg-purple-100 text-purple-700', desc: 'View all, approve transactions' },
  { id: 'sales', label: 'Sales Executive', icon: '💼', color: 'bg-blue-100 text-blue-700', desc: 'Customer management, orders' },
  { id: 'payment', label: 'Payment Recovery', icon: '💰', color: 'bg-green-100 text-green-700', desc: 'Collections, payment follow-up' },
  { id: 'production', label: 'Production Staff', icon: '🏭', color: 'bg-orange-100 text-orange-700', desc: 'MTO orders, inventory' },
  { id: 'viewer', label: 'Viewer', icon: '👁', color: 'bg-gray-100 text-gray-700', desc: 'Read-only access' },
];

const PERMISSIONS = [
  { section: 'Customers', items: [
    { id: 'customers_view', label: 'View Customers' },
    { id: 'customers_edit', label: 'Edit Customers' },
    { id: 'customers_delete', label: 'Delete Customers' },
    { id: 'customers_restrict', label: 'Restrict/Unrestrict' },
  ]},
  { section: 'Orders', items: [
    { id: 'orders_view', label: 'View Orders' },
    { id: 'orders_create', label: 'Create Orders' },
    { id: 'orders_edit', label: 'Edit Orders' },
    { id: 'orders_approve', label: 'Approve Orders' },
    { id: 'orders_delete', label: 'Delete Orders' },
  ]},
  { section: 'Field Visits', items: [
    { id: 'visits_view_own', label: 'View Own Visits' },
    { id: 'visits_view_all', label: 'View All Visits' },
    { id: 'visits_create', label: 'Create Visits' },
    { id: 'visits_edit', label: 'Edit Any Visit' },
  ]},
  { section: 'Finance', items: [
    { id: 'payments_view', label: 'View Payments' },
    { id: 'payments_record', label: 'Record Payments' },
    { id: 'invoices_view', label: 'View Invoices' },
    { id: 'invoices_create', label: 'Create Invoices' },
    { id: 'reports_financial', label: 'Financial Reports' },
  ]},
  { section: 'Inventory & Products', items: [
    { id: 'inventory_view', label: 'View Inventory' },
    { id: 'inventory_edit', label: 'Edit Inventory' },
    { id: 'pricing_view', label: 'View Pricing' },
    { id: 'pricing_edit', label: 'Edit Pricing' },
  ]},
  { section: 'Admin Tools', items: [
    { id: 'team_manage', label: 'Manage Team' },
    { id: 'access_control', label: 'Access Control' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'data_export', label: 'Export Data' },
    { id: 'system_settings', label: 'System Settings' },
  ]},
];

const DEFAULT_PERMS = {
  admin: { customers_view:true, customers_edit:true, customers_delete:true, customers_restrict:true, orders_view:true, orders_create:true, orders_edit:true, orders_approve:true, orders_delete:true, visits_view_own:true, visits_view_all:true, visits_create:true, visits_edit:true, payments_view:true, payments_record:true, invoices_view:true, invoices_create:true, reports_financial:true, inventory_view:true, inventory_edit:true, pricing_view:true, pricing_edit:true, team_manage:true, access_control:true, integrations:true, data_export:true, system_settings:true },
  manager: { customers_view:true, customers_edit:true, customers_delete:false, customers_restrict:true, orders_view:true, orders_create:true, orders_edit:true, orders_approve:true, orders_delete:false, visits_view_own:true, visits_view_all:true, visits_create:true, visits_edit:true, payments_view:true, payments_record:true, invoices_view:true, invoices_create:true, reports_financial:true, inventory_view:true, inventory_edit:true, pricing_view:true, pricing_edit:true, team_manage:true, access_control:false, integrations:false, data_export:true, system_settings:false },
  sales: { customers_view:true, customers_edit:true, customers_delete:false, customers_restrict:false, orders_view:true, orders_create:true, orders_edit:true, orders_approve:false, orders_delete:false, visits_view_own:true, visits_view_all:false, visits_create:true, visits_edit:false, payments_view:true, payments_record:false, invoices_view:true, invoices_create:false, reports_financial:false, inventory_view:true, inventory_edit:false, pricing_view:true, pricing_edit:false, team_manage:false, access_control:false, integrations:false, data_export:false, system_settings:false },
  payment: { customers_view:true, customers_edit:false, customers_delete:false, customers_restrict:false, orders_view:true, orders_create:false, orders_edit:false, orders_approve:false, orders_delete:false, visits_view_own:true, visits_view_all:false, visits_create:true, visits_edit:false, payments_view:true, payments_record:true, invoices_view:true, invoices_create:false, reports_financial:false, inventory_view:false, inventory_edit:false, pricing_view:false, pricing_edit:false, team_manage:false, access_control:false, integrations:false, data_export:false, system_settings:false },
  production: { customers_view:true, customers_edit:false, customers_delete:false, customers_restrict:false, orders_view:true, orders_create:false, orders_edit:true, orders_approve:false, orders_delete:false, visits_view_own:false, visits_view_all:false, visits_create:false, visits_edit:false, payments_view:false, payments_record:false, invoices_view:false, invoices_create:false, reports_financial:false, inventory_view:true, inventory_edit:true, pricing_view:true, pricing_edit:false, team_manage:false, access_control:false, integrations:false, data_export:false, system_settings:false },
  viewer: { customers_view:true, customers_edit:false, customers_delete:false, customers_restrict:false, orders_view:true, orders_create:false, orders_edit:false, orders_approve:false, orders_delete:false, visits_view_own:false, visits_view_all:false, visits_create:false, visits_edit:false, payments_view:false, payments_record:false, invoices_view:false, invoices_create:false, reports_financial:false, inventory_view:true, inventory_edit:false, pricing_view:false, pricing_edit:false, team_manage:false, access_control:false, integrations:false, data_export:false, system_settings:false },
};

export default function AccessControlPage() {
  const [selectedRole, setSelectedRole] = useState('sales');
  const [perms, setPerms] = useState(DEFAULT_PERMS['sales']);
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('roles');
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', role: 'sales', department: '' });
  const [showAddStaff, setShowAddStaff] = useState(false);

  useEffect(() => { fetchStaff(); }, []);
  useEffect(() => { setPerms({ ...DEFAULT_PERMS[selectedRole] }); }, [selectedRole]);

  async function fetchStaff() {
    const { data } = await supabase.from('staff_members').select('*').order('name');
    setStaff(data || []);
  }

  async function saveRolePerms() {
    setSaving(true);
    const { data: existing } = await supabase.from('role_permissions').select('id').eq('role', selectedRole).single();
    const payload = { role: selectedRole, ...perms, updated_at: new Date().toISOString() };
    if (existing) {
      await supabase.from('role_permissions').update(payload).eq('role', selectedRole);
    } else {
      await supabase.from('role_permissions').insert([payload]);
    }
    setSaving(false);
  }

  async function addStaff(e) {
    e.preventDefault();
    const { error } = await supabase.from('staff_members').insert([staffForm]);
    if (!error) { fetchStaff(); setStaffForm({ name: '', email: '', phone: '', role: 'sales', department: '' }); setShowAddStaff(false); }
  }

  const countEnabled = (role) => Object.values(DEFAULT_PERMS[role] || {}).filter(Boolean).length;
  const totalPerms = Object.values(perms).length;
  const enabledPerms = Object.values(perms).filter(Boolean).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
        <p className="text-gray-500 text-sm mt-1">Manage roles, permissions and staff access levels</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[['roles', '🔐 Roles & Permissions'], ['staff', '👥 Staff Management']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'roles' && (
        <div className="flex gap-6">
          <div className="w-56 flex-shrink-0 space-y-2">
            {ROLES.map(role => (
              <div key={role.id} onClick={() => setSelectedRole(role.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedRole === role.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{role.icon}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>{role.label}</span>
                </div>
                <p className="text-xs text-gray-500">{role.desc}</p>
                <p className="text-xs text-gray-400 mt-1">{countEnabled(role.id)} permissions</p>
              </div>
            ))}
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {ROLES.find(r => r.id === selectedRole)?.icon} {ROLES.find(r => r.id === selectedRole)?.label} Permissions
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{enabledPerms}/{totalPerms} permissions enabled</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(enabledPerms/totalPerms)*100}%` }} />
                </div>
                <button onClick={saveRolePerms} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[500px]">
              {PERMISSIONS.map(section => (
                <div key={section.section}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{section.section}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(perm => (
                      <label key={perm.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${perms[perm.id] ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input type="checkbox" checked={perms[perm.id] || false}
                          onChange={e => setPerms({...perms, [perm.id]: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded" />
                        <span className={`text-sm ${perms[perm.id] ? 'text-blue-800 font-medium' : 'text-gray-600'}`}>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Staff Members ({staff.length})</h3>
            <button onClick={() => setShowAddStaff(!showAddStaff)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Add Staff Member
            </button>
          </div>

          {showAddStaff && (
            <div className="bg-white rounded-xl border p-4 mb-4">
              <form onSubmit={addStaff} className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar', required: true },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'staff@shreerangtrendz.com' },
                  { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 9876543210' },
                  { label: 'Department', key: 'department', type: 'text', placeholder: 'e.g. Sales, Production' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                    <input type={f.type} value={staffForm[f.key]} onChange={e => setStaffForm({...staffForm, [f.key]: e.target.value})}
                      placeholder={f.placeholder} required={f.required}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
                  <select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddStaff(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Add Staff</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Role', 'Email', 'Phone', 'Department', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No staff members added yet</td></tr>
                ) : staff.map(s => {
                  const role = ROLES.find(r => r.id === s.role);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {s.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${role?.color || 'bg-gray-100 text-gray-600'}`}>
                          {role?.icon} {role?.label || s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
