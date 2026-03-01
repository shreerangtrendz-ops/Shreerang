import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarVisitsPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [visits, setVisits] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayVisits, setDayVisits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ visit_date: '', customer_name: '', purpose: 'sales', notes: '', assigned_to: '' });
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => { fetchVisits(); fetchTeam(); }, [currentDate]);

  async function fetchVisits() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('field_visits').select('*').gte('visit_date', start).lte('visit_date', end);
    setVisits(data || []);
  }

  async function fetchTeam() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
    setTeamMembers(data || []);
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function getVisitsForDay(day) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return visits.filter(v => v.visit_date === dateStr);
  }

  function handleDayClick(day) {
    setSelectedDay(day);
    setDayVisits(getVisitsForDay(day));
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  }

  async function handleAddVisit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('field_visits').insert([{ ...form, status: 'scheduled' }]);
    if (!error) { fetchVisits(); setShowModal(false); setForm({ visit_date: '', customer_name: '', purpose: 'sales', notes: '', assigned_to: '' }); }
    setLoading(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const purposeColors = { sales: 'bg-blue-500', payment: 'bg-green-500', service: 'bg-purple-500', demo: 'bg-orange-500' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar & Visits</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and track all field visits</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          + Schedule Visit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between p-4 border-b">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">&#8592;</button>
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">&#8594;</button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const dayVisitList = getVisitsForDay(day);
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = selectedDay === day;
                return (
                  <div key={idx} onClick={() => handleDayClick(day)}
                    className={`min-h-16 p-1 rounded-lg cursor-pointer border transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : isToday ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayVisitList.slice(0, 3).map((v, i) => (
                        <div key={i} className={`text-xs px-1 py-0.5 rounded text-white truncate ${purposeColors[v.purpose] || 'bg-gray-500'}`}>
                          {v.customer_name}
                        </div>
                      ))}
                      {dayVisitList.length > 3 && <div className="text-xs text-gray-500">+{dayVisitList.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4 p-4 border-t text-xs">
            {Object.entries(purposeColors).map(([p, c]) => (
              <div key={p} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${c}`} />
                <span className="capitalize text-gray-600">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          {selectedDay ? (
            <div>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">{MONTHS[month]} {selectedDay}, {year}</h3>
                <p className="text-sm text-gray-500">{dayVisits.length} visit(s) scheduled</p>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {dayVisits.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-sm">No visits scheduled</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">+ Add visit</button>
                  </div>
                ) : dayVisits.map(v => (
                  <div key={v.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{v.customer_name}</p>
                        <p className="text-xs text-gray-500">{v.assigned_to || 'Unassigned'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full text-white ${purposeColors[v.purpose] || 'bg-gray-500'}`}>
                        {v.purpose}
                      </span>
                    </div>
                    {v.notes && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{v.notes}</p>}
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'completed' ? 'bg-green-100 text-green-700' : v.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">This Month Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">Total Visits</span>
                  <span className="font-bold text-blue-900">{visits.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Completed</span>
                  <span className="font-bold text-green-900">{visits.filter(v => v.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-yellow-700">Scheduled</span>
                  <span className="font-bold text-yellow-900">{visits.filter(v => v.status === 'scheduled').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-purple-700">Sales Visits</span>
                  <span className="font-bold text-purple-900">{visits.filter(v => v.purpose === 'sales').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm text-orange-700">Payment Follow-ups</span>
                  <span className="font-bold text-orange-900">{visits.filter(v => v.purpose === 'payment').length}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">Click on a date to view visits</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-gray-900">Schedule New Visit</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&#x2715;</button>
            </div>
            <form onSubmit={handleAddVisit} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Visit Date *</label>
                <input type="date" required value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Customer Name *</label>
                <input type="text" required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})}
                  placeholder="Enter customer name" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Purpose *</label>
                <select value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="sales">Sales</option>
                  <option value="payment">Payment Follow-up</option>
                  <option value="service">Service</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Assigned To</label>
                <input type="text" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}
                  placeholder="Team member name" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Visit notes or objectives..." rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
