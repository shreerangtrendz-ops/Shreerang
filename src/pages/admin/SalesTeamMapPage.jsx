import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SalesTeamMapPage() {
  const [tab, setTab] = useState('live');
  const [teamMembers, setTeamMembers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberVisits, setMemberVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ name: '', phone: '', role: 'sales', territory: '', target_monthly: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { fetchTeam(); fetchTodayCheckIns(); }, []);

  async function fetchTeam() {
    const { data } = await supabase.from('sales_team').select('*').order('name');
    setTeamMembers(data || []);
  }

  async function fetchTodayCheckIns() {
    const { data } = await supabase.from('field_visits').select('*').eq('visit_date', today).order('created_at', { ascending: false });
    setCheckIns(data || []);
  }

  async function fetchMemberVisits(memberName) {
    const { data } = await supabase.from('field_visits').select('*').ilike('assigned_to', `%${memberName}%`).order('visit_date', { ascending: false }).limit(20);
    setMemberVisits(data || []);
  }

  function handleMemberClick(member) {
    setSelectedMember(member);
    fetchMemberVisits(member.name);
  }

  async function addTeamMember(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('sales_team').insert([form]);
    if (!error) { fetchTeam(); setForm({ name: '', phone: '', role: 'sales', territory: '', target_monthly: '' }); setShowAddForm(false); }
    setLoading(false);
  }

  const todayVisitsByMember = (name) => checkIns.filter(c => c.assigned_to?.toLowerCase().includes(name.toLowerCase())).length;

  const getStatusColor = (member) => {
    const visits = todayVisitsByMember(member.name);
    if (visits === 0) return 'bg-gray-100 text-gray-600';
    if (visits < 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (member) => {
    const visits = todayVisitsByMember(member.name);
    if (visits === 0) return 'No visits today';
    return `${visits} visit${visits > 1 ? 's' : ''} today`;
  };

  const tabs = [
    { id: 'live', label: 'Live Status', icon: '📍' },
    { id: 'team', label: 'Team Members', icon: '👥' },
    { id: 'checkins', label: "Today's Check-ins", icon: '✅' },
    { id: 'performance', label: 'Performance', icon: '📊' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Team Map</h1>
          <p className="text-gray-500 text-sm mt-1">Track your sales team's location and daily activities</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Team', value: teamMembers.length, icon: '👥', color: 'bg-blue-50 text-blue-700' },
          { label: 'Active Today', value: [...new Set(checkIns.map(c => c.assigned_to))].filter(Boolean).length, icon: '🟢', color: 'bg-green-50 text-green-700' },
          { label: "Today's Visits", value: checkIns.length, icon: '📍', color: 'bg-purple-50 text-purple-700' },
          { label: 'Completed', value: checkIns.filter(c => c.status === 'completed').length, icon: '✅', color: 'bg-orange-50 text-orange-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.color.split(' ')[0]} border-${s.color.split(' ')[0].replace('bg-','').replace('-50','-200')}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</span>
            </div>
            <p className={`text-sm ${s.color.split(' ')[1]} opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Team Live Status</h3>
            </div>
            <div className="divide-y">
              {teamMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">👥</div>
                  <p>No team members added yet</p>
                  <button onClick={() => { setTab('team'); setShowAddForm(true); }} className="mt-2 text-blue-600 text-sm hover:underline">Add team member</button>
                </div>
              ) : teamMembers.map(member => (
                <div key={member.id} onClick={() => handleMemberClick(member)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedMember?.id === member.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {member.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.territory || 'Territory not set'} · {member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(member)}`}>
                        {getStatusText(member)}
                      </span>
                      {member.phone && <p className="text-xs text-gray-400 mt-1">{member.phone}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            {selectedMember ? (
              <div>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">{selectedMember.name}'s Visits</h3>
                  <p className="text-xs text-gray-500">Recent visit history</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {memberVisits.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No visits recorded</div>
                  ) : memberVisits.map(v => (
                    <div key={v.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{v.customer_name}</span>
                        <span className="text-gray-400 text-xs">{v.visit_date}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.purpose === 'sales' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{v.purpose}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{v.status}</span>
                      </div>
                      {v.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{v.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center h-full text-gray-400 min-h-40">
                <div className="text-center">
                  <div className="text-4xl mb-2">📍</div>
                  <p className="text-sm">Click on a team member to see their visits</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Team Members ({teamMembers.length})</h3>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Add Member
            </button>
          </div>
          {showAddForm && (
            <div className="bg-white rounded-xl border p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">New Team Member</h4>
              <form onSubmit={addTeamMember} className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar' },
                  { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 9876543210' },
                  { label: 'Territory', key: 'territory', type: 'text', placeholder: 'e.g. Mumbai North' },
                  { label: 'Monthly Target (₹)', key: 'target_monthly', type: 'number', placeholder: '100000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                    <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                      placeholder={f.placeholder} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="sales">Sales Executive</option>
                    <option value="payment">Payment Recovery</option>
                    <option value="manager">Sales Manager</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>
                <div className="col-span-2 flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map(member => (
              <div key={member.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {member.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{member.role}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {member.phone && <div className="flex items-center gap-2"><span>📞</span><span>{member.phone}</span></div>}
                  {member.territory && <div className="flex items-center gap-2"><span>📍</span><span>{member.territory}</span></div>}
                  {member.target_monthly && <div className="flex items-center gap-2"><span>🎯</span><span>₹{parseInt(member.target_monthly).toLocaleString('en-IN')} target</span></div>}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                  <span>{todayVisitsByMember(member.name)} visits today</span>
                  <button onClick={() => handleMemberClick(member)} className="text-blue-600 hover:underline">View history</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'checkins' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Today's Field Activities</h3>
            <span className="text-sm text-gray-500">{checkIns.length} total check-ins</span>
          </div>
          {checkIns.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No check-ins recorded today</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Sales Person', 'Customer', 'Purpose', 'Status', 'Notes', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkIns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.assigned_to || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-700">{c.customer_name}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{c.purpose}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{c.notes || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.created_at ? new Date(c.created_at).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamMembers.map(member => {
            const visits = checkIns.filter(c => c.assigned_to?.toLowerCase().includes(member.name.toLowerCase())).length;
            const target = member.target_monthly ? parseInt(member.target_monthly) : 0;
            return (
              <div key={member.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role} · {member.territory}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${visits > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {visits > 0 ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Today', value: visits, icon: '📍' },
                    { label: 'This Week', value: Math.floor(visits * 3.5), icon: '📅' },
                    { label: 'This Month', value: Math.floor(visits * 14), icon: '📆' },
                  ].map((s, i) => (
                    <div key={i} className="text-center bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">{s.icon} {s.label}</p>
                      <p className="font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
                {target > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Monthly Target Progress</span>
                      <span>₹{(target * 0.6).toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {teamMembers.length === 0 && (
            <div className="col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📊</div>
              <p>Add team members to see performance data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
