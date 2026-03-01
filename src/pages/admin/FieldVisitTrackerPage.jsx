import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ══════════════════════════════════════════════════════════
//  FIELD VISIT TRACKER — Shreerang Trendz
//  Features:
//   1. Record Sales / Payment follow-up visits
//   2. Voice note → AI transcription (Hindi ➜ English)
//   3. AI-parsed structured record (requirements / payment commitment)
//   4. Outstation GPS proof-of-visit (Google Maps link)
//   5. Customer DB AI analysis (sales insights)
//   6. City Visit Planner — serial route optimiser
//   7. Restricted customer logic (blocked from sales route,
//      included with ⚠️ payment flag if dues pending)
// ══════════════════════════════════════════════════════════

/* ── tiny helpers ── */
const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green:  'bg-green-100 text-green-800 border-green-200',
    red:    'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue:   'bg-blue-100 text-blue-800 border-blue-200',
    gray:   'bg-gray-100 text-gray-700 border-gray-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>
);

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="text-2xl">{icon}</div>
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

/* ── AI-simulated helpers (replace with real OpenAI/Gemini call) ── */
const simulateAISummary = (rawText, visitType) => {
  if (!rawText || rawText.trim().length < 10) return null;
  if (visitType === 'payment') {
    return {
      summary: rawText,
      payment_commitment: `Customer committed to payment. Details: ${rawText.substring(0, 120)}`,
      next_action: 'Follow up on committed payment date',
      priority: 'high',
      tags: ['payment', 'follow-up'],
    };
  }
  return {
    summary: rawText,
    customer_requirement: `Requirement noted: ${rawText.substring(0, 120)}`,
    products_interested: ['Fabric', 'Design Catalogue'],
    next_action: 'Send product catalogue / samples',
    priority: rawText.toLowerCase().includes('urgent') ? 'high' : 'medium',
    tags: ['sales', 'requirement'],
  };
};

/* ═══════════════════════════════════════════════════════════
   TAB 1 — LOG A VISIT
═══════════════════════════════════════════════════════════ */
const LogVisitTab = ({ customers, salesTeam, onSaved }) => {
  const [form, setForm] = useState({
    customer_id: '',
    salesperson: '',
    visit_type: 'sales',
    visit_date: new Date().toISOString().split('T')[0],
    is_outstation: false,
    gps_location: '',
    gps_link: '',
    raw_notes: '',
    voice_transcript: '',
    payment_committed_amount: '',
    payment_committed_date: '',
    followup_date: '',
    status: 'visited',
  });
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* Voice recording */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        /* In production: send blob to Whisper API for transcription */
        /* Simulating transcription for demo: */
        const mockTranscripts = [
          'Customer ne kaha ki use 500 meter blue cotton fabric chahiye next week tak.',
          'Payment ke baare mein baat hui. Customer ne 15 tarikh tak 50000 rupaye dene ka commitment diya.',
          'Customer ko nayi design catalogue dekhni thi. Schiffli embroidery mein interest hai.',
        ];
        const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        const englishTranslation = transcript
          .replace('Customer ne kaha ki', 'Customer said that')
          .replace('use', 'they need')
          .replace('chahiye next week tak', 'is needed by next week.')
          .replace('Payment ke baare mein baat hui.', 'Payment discussion happened.')
          .replace('Customer ne 15 tarikh tak 50000 rupaye dene ka commitment diya.', 'Customer committed to paying Rs 50,000 by the 15th.')
          .replace('Customer ko nayi design catalogue dekhni thi.', 'Customer wanted to see new design catalogue.')
          .replace('Schiffli embroidery mein interest hai.', 'Interested in Schiffli embroidery.');
        set('voice_transcript', englishTranslation);
        set('raw_notes', englishTranslation);
        const ai = simulateAISummary(englishTranslation, form.visit_type);
        setAiResult(ai);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setRecording(false); }
  };

  /* GPS capture */
  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        set('gps_location', `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        set('gps_link', `https://www.google.com/maps?q=${lat},${lng}`);
        setGpsLoading(false);
      },
      err => { alert('GPS error: ' + err.message); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* AI parse on notes change */
  const handleNotesChange = (v) => {
    set('raw_notes', v);
    if (v.length > 20) {
      const ai = simulateAISummary(v, form.visit_type);
      setAiResult(ai);
    }
  };

  /* Save */
  const handleSave = async () => {
    if (!form.customer_id) { alert('Please select a customer'); return; }
    setSaving(true);
    try {
      const record = {
        customer_id: form.customer_id,
        salesperson_name: form.salesperson,
        visit_type: form.visit_type,
        visit_date: form.visit_date,
        is_outstation: form.is_outstation,
        gps_location: form.gps_location || null,
        gps_link: form.gps_link || null,
        raw_notes: form.raw_notes,
        voice_transcript: form.voice_transcript || null,
        ai_summary: aiResult ? JSON.stringify(aiResult) : null,
        customer_requirement: aiResult?.customer_requirement || aiResult?.payment_commitment || null,
        payment_committed_amount: form.payment_committed_amount ? parseFloat(form.payment_committed_amount) : null,
        payment_committed_date: form.payment_committed_date || null,
        followup_date: form.followup_date || null,
        status: form.status,
        tags: aiResult?.tags || [],
        priority: aiResult?.priority || 'medium',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('field_visits').insert([record]);
      if (error) throw error;

      setSaved(true);
      onSaved?.();
      setTimeout(() => {
        setSaved(false);
        setForm(p => ({
          ...p,
          customer_id: '', raw_notes: '', voice_transcript: '',
          gps_location: '', gps_link: '', payment_committed_amount: '',
          payment_committed_date: '', followup_date: '',
        }));
        setAiResult(null);
      }, 2000);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };

  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  return (
    <div className="space-y-6">
      {/* Customer + Visit Type */}
      <Card className="p-5">
        <SectionHeader icon="📋" title="Visit Details" subtitle="Select customer and purpose of visit" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={form.customer_id}
              onChange={e => set('customer_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company_name ? ` (${c.company_name})` : ''} — {c.city || 'No city'}
                  {c.is_restricted ? ' 🚫' : ''}
                </option>
              ))}
            </select>
            {selectedCustomer?.is_restricted && (
              <p className="text-xs text-red-600 mt-1">⚠️ Restricted customer — sales visits blocked</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
            <select
              value={form.salesperson}
              onChange={e => set('salesperson', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Team Member --</option>
              {salesTeam.map(s => (
                <option key={s.id} value={s.name}>{s.name} — {s.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Purpose</label>
            <div className="flex gap-3">
              {['sales', 'payment', 'followup'].map(t => (
                <button
                  key={t}
                  onClick={() => set('visit_type', t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.visit_type === t
                      ? t === 'payment' ? 'bg-green-600 text-white border-green-600'
                        : t === 'followup' ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {t === 'sales' ? '🛒 Sales' : t === 'payment' ? '💰 Payment' : '🔄 Follow-up'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
            <input
              type="date"
              value={form.visit_date}
              onChange={e => set('visit_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* GPS / Outstation */}
      <Card className="p-5">
        <SectionHeader icon="📍" title="Location Proof" subtitle="Capture GPS for outstation visits" />
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="outstation"
            checked={form.is_outstation}
            onChange={e => set('is_outstation', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="outstation" className="text-sm font-medium text-gray-700">
            This is an outstation visit
          </label>
        </div>
        {form.is_outstation && (
          <div className="space-y-3">
            <button
              onClick={captureGPS}
              disabled={gpsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {gpsLoading ? '⏳ Fetching GPS...' : '📍 Capture My Location'}
            </button>
            {form.gps_location && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">✅ Location captured: {form.gps_location}</p>
                <a href={form.gps_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  🗺 Open in Google Maps
                </a>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Or paste Google Maps link</label>
              <input
                type="url"
                value={form.gps_link}
                onChange={e => set('gps_link', e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Voice Note + Notes */}
      <Card className="p-5">
        <SectionHeader icon="🎙️" title="Visit Notes" subtitle="Record voice note (Hindi/English) or type directly — AI will analyse" />
        <div className="space-y-4">
          {/* Voice */}
          <div className="flex items-center gap-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                🎙️ Start Voice Note
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium animate-pulse"
              >
                ⏹ Stop Recording
              </button>
            )}
            <span className="text-xs text-gray-500">Supports Hindi — AI auto-translates to English</span>
          </div>

          {form.voice_transcript && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">🤖 Voice Transcript (AI translated):</p>
              <p className="text-sm text-blue-900">{form.voice_transcript}</p>
            </div>
          )}

          {/* Text notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Notes / Requirements</label>
            <textarea
              rows={4}
              value={form.raw_notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Describe what customer said — requirements, concerns, products discussed..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* AI Analysis */}
          {aiResult && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-xs font-bold text-purple-700 mb-2">🤖 AI ANALYSIS</p>
              {aiResult.customer_requirement && (
                <p className="text-sm text-gray-800 mb-1"><span className="font-medium">📦 Requirement:</span> {aiResult.customer_requirement}</p>
              )}
              {aiResult.payment_commitment && (
                <p className="text-sm text-gray-800 mb-1"><span className="font-medium">💰 Payment:</span> {aiResult.payment_commitment}</p>
              )}
              {aiResult.next_action && (
                <p className="text-sm text-gray-800 mb-1"><span className="font-medium">➡️ Next Action:</span> {aiResult.next_action}</p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {(aiResult.tags || []).map(t => <Badge key={t} color="purple">{t}</Badge>)}
                {aiResult.priority && (
                  <Badge color={aiResult.priority === 'high' ? 'red' : 'yellow'}>
                    Priority: {aiResult.priority}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Payment details (only for payment type) */}
      {form.visit_type === 'payment' && (
        <Card className="p-5">
          <SectionHeader icon="💰" title="Payment Commitment" subtitle="Record what customer committed" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committed Amount (₹)</label>
              <input
                type="number"
                value={form.payment_committed_amount}
                onChange={e => set('payment_committed_amount', e.target.value)}
                placeholder="50000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committed Payment Date</label>
              <input
                type="date"
                value={form.payment_committed_date}
                onChange={e => set('payment_committed_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Follow-up date */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Follow-up Date</label>
            <input
              type="date"
              value={form.followup_date}
              onChange={e => set('followup_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="visited">✅ Visited</option>
              <option value="followup_scheduled">📅 Follow-up Scheduled</option>
              <option value="no_response">❌ No Response</option>
              <option value="order_taken">🛒 Order Taken</option>
              <option value="payment_collected">💰 Payment Collected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
          saved ? 'bg-green-500 text-white' :
          saving ? 'bg-gray-400 text-white' :
          'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saved ? '✅ Visit Saved Successfully!' : saving ? '⏳ Saving...' : '💾 Save Visit Record'}
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TAB 2 — VISIT HISTORY
═══════════════════════════════════════════════════════════ */
const VisitHistoryTab = ({ visits, customers, loading }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = visits.filter(v => {
    const customer = customers.find(c => c.id === v.customer_id);
    const matchSearch = !search ||
      (customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.raw_notes || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'all' || v.visit_type === filter;
    return matchSearch && matchType;
  });

  const typeColors = { sales: 'blue', payment: 'green', followup: 'purple' };
  const statusColors = {
    visited: 'gray', followup_scheduled: 'yellow', no_response: 'red',
    order_taken: 'blue', payment_collected: 'green',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search customer or notes..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {['all', 'sales', 'payment', 'followup'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading visits...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No visits found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const customer = customers.find(c => c.id === v.customer_id);
            const ai = v.ai_summary ? (() => { try { return JSON.parse(v.ai_summary); } catch { return null; } })() : null;
            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{customer?.name || 'Unknown'}</span>
                      {customer?.company_name && <span className="text-gray-500 text-sm">({customer.company_name})</span>}
                      <Badge color={typeColors[v.visit_type] || 'gray'}>{v.visit_type}</Badge>
                      <Badge color={statusColors[v.status] || 'gray'}>{v.status?.replace(/_/g, ' ')}</Badge>
                      {v.is_outstation && <Badge color="orange">📍 Outstation</Badge>}
                      {ai?.priority === 'high' && <Badge color="red">🔥 High Priority</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{v.raw_notes}</p>
                    {ai?.customer_requirement && (
                      <p className="text-xs text-purple-700 mt-1">📦 {ai.customer_requirement}</p>
                    )}
                    {ai?.payment_commitment && (
                      <p className="text-xs text-green-700 mt-1">💰 {ai.payment_commitment}</p>
                    )}
                    {v.payment_committed_amount && (
                      <p className="text-xs text-green-700 font-medium mt-1">
                        💳 Committed: ₹{Number(v.payment_committed_amount).toLocaleString('en-IN')}
                        {v.payment_committed_date && ` by ${new Date(v.payment_committed_date).toLocaleDateString('en-IN')}`}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                      <span>👤 {v.salesperson_name || 'Unknown'}</span>
                      <span>📅 {new Date(v.visit_date).toLocaleDateString('en-IN')}</span>
                      {v.followup_date && <span>🔄 Follow-up: {new Date(v.followup_date).toLocaleDateString('en-IN')}</span>}
                      {v.gps_link && (
                        <a href={v.gps_link} target="_blank" rel="noopener noreferrer"
                          className="text-blue-500 hover:underline">
                          🗺 View Location
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-400">{customer?.city}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TAB 3 — CUSTOMER AI INSIGHTS
═══════════════════════════════════════════════════════════ */
const CustomerInsightsTab = ({ customers, visits }) => {
  const [selected, setSelected] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const analyseCustomer = useCallback(() => {
    const customer = customers.find(c => c.id === selected);
    if (!customer) return;
    const custVisits = visits.filter(v => v.customer_id === selected);
    const salesVisits = custVisits.filter(v => v.visit_type === 'sales');
    const payVisits = custVisits.filter(v => v.visit_type === 'payment');
    const allNotes = custVisits.map(v => v.raw_notes || '').join(' ');
    const keywords = [];
    const fabricTerms = ['cotton', 'polyester', 'silk', 'linen', 'fabric', 'schiffli', 'embroidery', 'digital print', 'mill print'];
    const quantTerms = ['500', '1000', 'meter', 'piece', 'pcs', 'bulk'];
    fabricTerms.forEach(t => { if (allNotes.toLowerCase().includes(t)) keywords.push(t); });
    quantTerms.forEach(t => { if (allNotes.toLowerCase().includes(t)) keywords.push(t); });

    const totalCommitted = custVisits.reduce((s, v) => s + (parseFloat(v.payment_committed_amount) || 0), 0);
    const lastVisit = custVisits.length > 0
      ? custVisits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0]
      : null;

    setAnalysis({
      customer,
      totalVisits: custVisits.length,
      salesVisits: salesVisits.length,
      payVisits: payVisits.length,
      keywords,
      totalCommitted,
      lastVisit,
      engagementScore: Math.min(10, Math.round(
        (custVisits.length * 2) +
        (salesVisits.length) +
        (totalCommitted > 0 ? 3 : 0) +
        (lastVisit && (Date.now() - new Date(lastVisit.visit_date)) < 30 * 24 * 3600 * 1000 ? 2 : 0)
      )),
      recommendations: [
        keywords.length > 0
          ? `📦 Carry samples of: ${keywords.slice(0, 3).join(', ')}`
          : '📦 Bring general catalogue',
        totalCommitted > 0
          ? `💰 Pending payment follow-up: ₹${totalCommitted.toLocaleString('en-IN')}`
          : '✅ No pending payment records',
        custVisits.some(v => v.status === 'followup_scheduled')
          ? '⏰ Has pending follow-up scheduled'
          : '📅 Consider scheduling next visit',
      ],
    });
  }, [selected, customers, visits]);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader icon="🔍" title="Customer Intelligence" subtitle="AI-powered analysis of customer behaviour and requirements" />
        <div className="flex gap-3">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.city || 'No city'}</option>
            ))}
          </select>
          <button
            onClick={analyseCustomer}
            disabled={!selected}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
          >
            🤖 Analyse
          </button>
        </div>
      </Card>

      {analysis && (
        <div className="space-y-4">
          {/* Score */}
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{analysis.customer.name}</h3>
                <p className="text-sm text-gray-500">
                  {analysis.customer.company_name} • {analysis.customer.city}, {analysis.customer.state}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Payment Terms: {analysis.customer.payment_terms} • Tier: {analysis.customer.tier || 'Standard'}
                </p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-black ${
                  analysis.engagementScore >= 7 ? 'text-green-600' :
                  analysis.engagementScore >= 4 ? 'text-yellow-600' : 'text-red-500'
                }`}>
                  {analysis.engagementScore}/10
                </div>
                <div className="text-xs text-gray-500">Engagement Score</div>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Visits', value: analysis.totalVisits, icon: '📅', color: 'blue' },
              { label: 'Sales Visits', value: analysis.salesVisits, icon: '🛒', color: 'green' },
              { label: 'Payment Visits', value: analysis.payVisits, icon: '💰', color: 'yellow' },
              { label: 'Committed ₹', value: '₹' + analysis.totalCommitted.toLocaleString('en-IN'), icon: '💳', color: 'purple' },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-2">🏷️ Detected Interests / Requirements</p>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map(k => <Badge key={k} color="blue">{k}</Badge>)}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="p-4">
            <p className="text-sm font-bold text-gray-700 mb-3">💡 AI Recommendations</p>
            <div className="space-y-2">
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-0.5">→</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Last visit */}
          {analysis.lastVisit && (
            <Card className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-2">📋 Last Visit Summary</p>
              <p className="text-sm text-gray-600">{analysis.lastVisit.raw_notes}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(analysis.lastVisit.visit_date).toLocaleDateString('en-IN')} • {analysis.lastVisit.visit_type} • {analysis.lastVisit.salesperson_name}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TAB 4 — CITY VISIT PLANNER
═══════════════════════════════════════════════════════════ */
const CityPlannerTab = ({ customers, visits }) => {
  const [city, setCity] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [plan, setPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  const cities = [...new Set(customers.map(c => c.city).filter(Boolean))].sort();

  const generatePlan = useCallback(() => {
    if (!city) return;

    const cityCustomers = customers.filter(c =>
      c.city?.toLowerCase() === city.toLowerCase()
    );

    /* Separate: active vs restricted */
    const active = cityCustomers.filter(c => !c.is_restricted);
    const restricted = cityCustomers.filter(c => c.is_restricted);

    /* For each active customer: check pending payment from visits */
    const enriched = active.map(c => {
      const custVisits = visits.filter(v => v.customer_id === c.id);
      const pendingPayment = custVisits.reduce((s, v) => {
        if (v.payment_committed_amount && v.status !== 'payment_collected')
          return s + parseFloat(v.payment_committed_amount);
        return s;
      }, 0);

      /* AI priority: recent visits, payment pending, keywords */
      const lastVisit = custVisits.length > 0
        ? custVisits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0]
        : null;
      const daysSince = lastVisit
        ? Math.round((Date.now() - new Date(lastVisit.visit_date)) / (24 * 3600 * 1000))
        : 999;

      /* Compute AI-suggested priority */
      let score = 0;
      if (pendingPayment > 50000) score += 5;
      else if (pendingPayment > 0) score += 3;
      if (daysSince > 30) score += 3;
      else if (daysSince > 14) score += 1;
      if (custVisits.some(v => v.status === 'followup_scheduled')) score += 4;
      if (c.credit_days && c.credit_days > 60) score += 2;

      /* Detect current demand from visit notes */
      const allNotes = custVisits.map(v => v.raw_notes || '').join(' ').toLowerCase();
      const demanded = [];
      const products = ['cotton', 'polyester', 'silk', 'schiffli', 'embroidery', 'digital print', 'mill print', 'fabric'];
      products.forEach(p => { if (allNotes.includes(p)) demanded.push(p); });

      return { ...c, pendingPayment, lastVisit, daysSince, score, demanded };
    });

    /* Sort by score descending */
    const sorted = [...enriched].sort((a, b) => b.score - a.score);

    /* Add restricted customers with payment dues */
    const restrictedWithDues = restricted.map(c => {
      const custVisits = visits.filter(v => v.customer_id === c.id);
      const pendingPayment = custVisits.reduce((s, v) => {
        if (v.payment_committed_amount && v.status !== 'payment_collected')
          return s + parseFloat(v.payment_committed_amount);
        return s;
      }, 0);
      return { ...c, pendingPayment, isRestricted: true };
    }).filter(c => c.pendingPayment > 0);

    /* Collect all products to carry */
    const allDemanded = [...new Set(sorted.flatMap(c => c.demanded))];

    setPlan({
      city,
      date: planDate,
      activeRoute: sorted,
      restrictedWithDues,
      productsToCarry: allDemanded,
      estimatedHours: Math.round(sorted.length * 0.75 + 0.5),
    });
  }, [city, planDate, customers, visits]);

  const savePlan = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const route = plan.activeRoute.map((c, i) => ({
        order: i + 1,
        customer_id: c.id,
        customer_name: c.name,
        pending_payment: c.pendingPayment,
        demanded: c.demanded,
        score: c.score,
      }));

      const { error } = await supabase.from('city_visit_plans').upsert([{
        plan_date: plan.date,
        city: plan.city,
        salesperson_name: 'Auto-generated',
        ai_optimized_route: route,
        total_customers: plan.activeRoute.length,
        estimated_duration_hours: plan.estimatedHours,
        products_to_carry: plan.productsToCarry,
        status: 'Draft',
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      alert('✅ City visit plan saved!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader
          icon="🗺️"
          title="AI City Visit Planner"
          subtitle="Auto-optimise the visit sequence, detect demand, exclude restricted customers (unless payment pending)"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select City --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
            <input
              type="date"
              value={planDate}
              onChange={e => setPlanDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generatePlan}
              disabled={!city}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              🤖 Generate AI Plan
            </button>
          </div>
        </div>
      </Card>

      {plan && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: plan.activeRoute.length, icon: '👥' },
              { label: 'Est. Duration', value: plan.estimatedHours + 'h', icon: '⏱️' },
              { label: 'Payment Followups', value: plan.activeRoute.filter(c => c.pendingPayment > 0).length, icon: '💰' },
              { label: 'Products to Carry', value: plan.productsToCarry.length, icon: '📦' },
            ].map(s => (
              <Card key={s.label} className="p-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Products to carry */}
          {plan.productsToCarry.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-2">📦 Products to Carry</p>
              <div className="flex flex-wrap gap-2">
                {plan.productsToCarry.map(p => <Badge key={p} color="blue">{p}</Badge>)}
              </div>
            </Card>
          )}

          {/* Route */}
          <Card className="p-5">
            <p className="text-sm font-bold text-gray-700 mb-3">🚗 Optimised Visit Route — {plan.city}</p>
            <div className="space-y-2">
              {plan.activeRoute.map((c, i) => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      {c.company_name && <span className="text-gray-500 text-sm">({c.company_name})</span>}
                      {c.pendingPayment > 0 && (
                        <Badge color="green">💰 ₹{c.pendingPayment.toLocaleString('en-IN')} due</Badge>
                      )}
                      {c.daysSince < 7 && <Badge color="yellow">Recent visit</Badge>}
                      {c.score >= 6 && <Badge color="red">🔥 High priority</Badge>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>📞 {c.phone || 'No phone'}</span>
                      <span>🕐 Last visit: {c.daysSince === 999 ? 'Never' : c.daysSince + 'd ago'}</span>
                      {c.demanded.length > 0 && <span>📦 Wants: {c.demanded.slice(0, 2).join(', ')}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{c.payment_terms}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Restricted with payment dues */}
          {plan.restrictedWithDues.length > 0 && (
            <Card className="p-5 border-orange-200 bg-orange-50">
              <p className="text-sm font-bold text-orange-800 mb-3">
                ⚠️ Restricted Customers — Payment Follow-up Required ({plan.restrictedWithDues.length})
              </p>
              <p className="text-xs text-orange-600 mb-3">
                These customers are blocked from regular sales visits, but outstanding payment needs to be collected.
              </p>
              <div className="space-y-2">
                {plan.restrictedWithDues.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                    <div>
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      {c.company_name && <span className="text-gray-500 text-sm ml-1">({c.company_name})</span>}
                      <p className="text-xs text-gray-500">📞 {c.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right">
                      <Badge color="red">💰 ₹{c.pendingPayment.toLocaleString('en-IN')} due</Badge>
                      <p className="text-xs text-red-500 mt-1">Payment followup only</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Save */}
          <button
            onClick={savePlan}
            disabled={saving}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '⏳ Saving...' : '💾 Save City Visit Plan'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
const FieldVisitTrackerPage = () => {
  const [activeTab, setActiveTab] = useState('log');
  const [customers, setCustomers] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(() => setRefreshCount(p => p + 1), []);

  /* ── load data ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        /* customers */
        const { data: cust } = await supabase
          .from('customers')
          .select('id, name, company_name, phone, city, state, status, payment_terms, tier, credit_days, is_restricted, metadata')
          .order('name');

        /* sales team from admin_settings or a simple hardcoded fallback */
        const { data: team } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'sales_team')
          .single();

        /* field visits */
        const { data: fv } = await supabase
          .from('field_visits')
          .select('*')
          .order('visit_date', { ascending: false })
          .limit(200);

        setCustomers((cust || []).map(c => ({
          ...c,
          is_restricted: c.is_restricted || c.status === 'blacklisted' || c.status === 'restricted',
        })));

        setSalesTeam(
          team?.value
            ? (typeof team.value === 'string' ? JSON.parse(team.value) : team.value)
            : [
                { id: '1', name: 'Sales Team', role: 'Sales Executive' },
                { id: '2', name: 'Accounts Team', role: 'Accounts' },
              ]
        );

        setVisits(fv || []);
      } catch (err) {
        console.error('Load error:', err);
      }
      setLoading(false);
    };
    load();
  }, [refreshCount]);

  const TABS = [
    { id: 'log',      label: '📋 Log Visit',       desc: 'Record new visit' },
    { id: 'history',  label: '📅 Visit History',   desc: 'Past visits log' },
    { id: 'insights', label: '🔍 Customer Insights', desc: 'AI analysis' },
    { id: 'planner',  label: '🗺️ City Planner',    desc: 'Route optimiser' },
  ];

  const stats = {
    totalVisits: visits.length,
    todayVisits: visits.filter(v => v.visit_date === new Date().toISOString().split('T')[0]).length,
    salesVisits: visits.filter(v => v.visit_type === 'sales').length,
    paymentVisits: visits.filter(v => v.visit_type === 'payment').length,
    pendingFollowups: visits.filter(v => v.status === 'followup_scheduled').length,
    totalCommitted: visits.reduce((s, v) => s + (parseFloat(v.payment_committed_amount) || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">📍 Field Visit Tracker</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI-powered sales & payment visit management — voice notes, GPS proof, route planning
            </p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {[
            { label: 'Today', value: stats.todayVisits, icon: '📅', color: 'blue' },
            { label: 'Total Visits', value: stats.totalVisits, icon: '📋', color: 'gray' },
            { label: 'Sales', value: stats.salesVisits, icon: '🛒', color: 'blue' },
            { label: 'Payment', value: stats.paymentVisits, icon: '💰', color: 'green' },
            { label: 'Follow-ups', value: stats.pendingFollowups, icon: '🔄', color: 'yellow' },
            { label: 'Total Committed', value: '₹' + Math.round(stats.totalCommitted / 1000) + 'k', icon: '💳', color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
              <div className="text-lg">{s.icon}</div>
              <div className="text-lg font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading && activeTab !== 'log' ? (
        <div className="text-center py-12 text-gray-400">Loading data...</div>
      ) : (
        <>
          {activeTab === 'log' && (
            <LogVisitTab customers={customers} salesTeam={salesTeam} onSaved={refresh} />
          )}
          {activeTab === 'history' && (
            <VisitHistoryTab visits={visits} customers={customers} loading={loading} />
          )}
          {activeTab === 'insights' && (
            <CustomerInsightsTab customers={customers} visits={visits} />
          )}
          {activeTab === 'planner' && (
            <CityPlannerTab customers={customers} visits={visits} />
          )}
        </>
      )}
    </div>
  );
};

export default FieldVisitTrackerPage;
