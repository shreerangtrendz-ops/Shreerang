import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';

const WA_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || '';
const PHONE_ID = '868455029689394';
const WA_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;

const T = {
  teal: '#2BA898', tealDark: '#071E1C', tealBright: '#3DBFAE',
  gold: '#D4920A', bg: '#F0F9F7', surface: '#fff',
  border: '#D0EDE8', text: '#071E1C', muted: '#4A7A74',
  green: '#059669', error: '#DC2626', orange: '#C86020',
};

// Audience segments
const SEGMENTS = [
  { id: 'all', label: 'All Customers', icon: '👥', desc: 'Everyone in the customer master', filter: {} },
  { id: 'active_30', label: 'Active (Last 30 Days)', icon: '🟢', desc: 'Placed order in last 30 days', filter: { days: 30 } },
  { id: 'overdue', label: 'Overdue Payments', icon: '⚠️', desc: 'Outstanding balance > 0', filter: { overdue: true } },
  { id: 'leads', label: 'Leads (No Orders)', icon: '🎯', desc: 'Enquiries, no orders yet', filter: { status: 'lead' } },
  { id: 'mill_print', label: 'Mill Print Buyers', icon: '🖨️', desc: 'Interested in Mill Print', filter: { interest: 'Mill Print' } },
  { id: 'digital', label: 'Digital Print Buyers', icon: '🎨', desc: 'Interested in Digital Print', filter: { interest: 'Digital Print' } },
  { id: 'embroidery', label: 'Embroidery Buyers', icon: '🧵', desc: 'Interested in Embroidery/Schiffli', filter: { interest: 'Embroidery' } },
  { id: 'custom', label: 'Custom List (CSV)', icon: '📋', desc: 'Paste phone numbers manually', filter: { custom: true } },
];

// Message templates
const TEMPLATES = [
  {
    id: 'new_design',
    label: '🎨 New Design Launch',
    text: `Dear {name},\n\n✨ *New Collection Arrived!*\n\nShreerang Trendz has launched exciting new {fabric} designs for the season.\n\n📱 View full catalogue: https://shreerangtrendz.com\n\nFor wholesale enquiries & pricing:\n📞 +91-7874200033\n\n— *Shreerang Trendz* 🧵`,
  },
  {
    id: 'payment_reminder',
    label: '💰 Payment Reminder',
    text: `Dear {name},\n\nThis is a gentle reminder that ₹{amount} is outstanding on your account with *Shreerang Trendz*.\n\nKindly arrange payment at your earliest convenience.\n\nFor any queries:\n📞 +91-7874200033\n\nThank you 🙏\n*Shreerang Trendz*`,
  },
  {
    id: 'festival_offer',
    label: '🎉 Festival Offer',
    text: `Dear {name},\n\n🎉 *Special Festival Offer!*\n\nGet *exclusive wholesale pricing* on selected fabrics this festive season!\n\n✅ Mill Print — Special rates\n✅ Digital Print — New designs\n✅ Schiffli — Premium collection\n\n📞 Call now: +91-7874200033\n\n*Shreerang Trendz* — Surat 🧵`,
  },
  {
    id: 'catalogue_update',
    label: '📦 Catalogue Update',
    text: `Dear {name},\n\n📦 *Updated Catalogue Ready!*\n\nOur latest fabric catalogue is now available.\n\n🌐 View online: https://shreerangtrendz.com\n\nWholesale buyers — login to portal for exclusive pricing.\n\nFor enquiries: +91-7874200033\n\n— *Shreerang Trendz* 🧵`,
  },
  {
    id: 'custom',
    label: '✍️ Custom Message',
    text: '',
  },
];

export default function WhatsAppBroadcastPage() {
  const [step, setStep] = useState(1); // 1=audience, 2=message, 3=preview, 4=results
  const [selectedSegment, setSelectedSegment] = useState('');
  const [customPhones, setCustomPhones] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [customVar, setCustomVar] = useState({ fabric: 'Mill Print', amount: '0' });
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState({ sent: 0, failed: 0, errors: [] });
  const [progress, setProgress] = useState(0);
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    loadBroadcastLog();
  }, []);

  async function loadBroadcastLog() {
    setLoadingLog(true);
    try {
      const { data } = await supabase
        .from('whatsapp_broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setBroadcastLog(data || []);
    } catch {}
    setLoadingLog(false);
  }

  async function loadRecipients(segmentId) {
    setLoadingRecipients(true);
    setRecipients([]);
    try {
      if (segmentId === 'custom') {
        const phones = customPhones.split(/[\n,\s]+/).map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10);
        setRecipients(phones.map(p => ({ name: 'Customer', phone: p, id: p })));
        setLoadingRecipients(false);
        return;
      }

      let query = supabase.from('customers').select('id, name, phone, status, fabric_interest, price_tier').eq('business_type', 'customer');

      if (segmentId === 'leads') query = query.eq('status', 'lead');
      else if (segmentId === 'overdue') query = query.gt('outstanding_amount', 0);
      else if (segmentId === 'mill_print') query = query.ilike('fabric_interest', '%Mill%');
      else if (segmentId === 'digital') query = query.ilike('fabric_interest', '%Digital%');
      else if (segmentId === 'embroidery') query = query.ilike('fabric_interest', '%Embroidery%');
      // active_30 and all: no extra filter for now

      const { data, error } = await query.not('phone', 'is', null).limit(500);
      if (error) throw error;

      const validRecipients = (data || []).filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
      setRecipients(validRecipients);
    } catch (e) {
      console.error('loadRecipients error:', e);
    }
    setLoadingRecipients(false);
  }

  function buildMessage(template, recipient) {
    return template
      .replace(/{name}/g, recipient.name || 'Customer')
      .replace(/{fabric}/g, customVar.fabric || 'fabrics')
      .replace(/{amount}/g, recipient.outstanding_amount ? `₹${Number(recipient.outstanding_amount).toLocaleString('en-IN')}` : customVar.amount)
      .replace(/{phone}/g, recipient.phone || '');
  }

  async function sendWhatsApp(phone, message) {
    try {
      const waPhone = phone.replace(/\D/g, '');
      const fullPhone = waPhone.length === 10 ? '91' + waPhone : waPhone;

      const res = await fetch(WA_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: message }
        })
      });
      const data = await res.json();
      if (data.messages?.[0]?.id) return { success: true, messageId: data.messages[0].id };
      return { success: false, error: data.error?.message || 'Unknown error' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function startBroadcast() {
    if (!recipients.length || !messageText.trim()) return;
    setSending(true);
    setStep(4);
    setProgress(0);
    let sent = 0, failed = 0, errors = [];
    const total = recipients.length;

    // Log broadcast start
    let broadcastId = null;
    try {
      const { data } = await supabase.from('whatsapp_broadcasts').insert({
        segment: selectedSegment,
        template_id: selectedTemplate,
        message_text: messageText,
        total_recipients: total,
        status: 'sending',
        created_at: new Date().toISOString(),
      }).select('id').single();
      broadcastId = data?.id;
    } catch {}

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const msg = buildMessage(messageText, recipient);
      const result = await sendWhatsApp(recipient.phone, msg);

      // Save to whatsapp_messages
      try {
        await supabase.from('whatsapp_messages').insert({
          phone_number: recipient.phone?.replace(/\D/g, '').padStart(12, '91'),
          message_text: msg,
          direction: 'outbound',
          message_type: 'broadcast',
          broadcast_id: broadcastId,
          created_at: new Date().toISOString(),
        });
      } catch {}

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ phone: recipient.phone, name: recipient.name, error: result.error });
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setResults({ sent, failed, errors: errors.slice(0, 10) });

      // Rate limit: 50 msgs/sec max on Meta API, add small delay
      if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 100));
    }

    // Update broadcast record
    if (broadcastId) {
      try {
        await supabase.from('whatsapp_broadcasts').update({
          sent_count: sent, failed_count: failed, status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', broadcastId);
      } catch {}
    }

    setSending(false);
    loadBroadcastLog();
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", padding: '24px 28px', background: T.bg, minHeight: '100vh', color: T.text }}>
      <Helmet><title>WhatsApp Broadcast — Shreerang</title></Helmet>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#25D36622', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📢</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T.tealDark, margin: 0 }}>WhatsApp Broadcast</h1>
            <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Send messages to customer segments via WhatsApp Business API</p>
          </div>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step >= s ? '#25D366' : T.border,
                  color: step >= s ? '#fff' : T.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700
                }}>{s}</div>
                <span style={{ fontSize: 11, color: step >= s ? T.tealDark : T.muted, fontWeight: step === s ? 700 : 400 }}>
                  {s === 1 ? 'Audience' : s === 2 ? 'Message' : 'Review & Send'}
                </span>
                {s < 3 && <span style={{ color: T.border, fontSize: 14 }}>›</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: step < 4 ? '1fr 320px' : '1fr', gap: 20 }}>

        {/* MAIN CONTENT */}
        <div>

          {/* STEP 1: AUDIENCE */}
          {step === 1 && (
            <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.tealDark }}>Step 1: Select Audience</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {SEGMENTS.map(seg => (
                  <div
                    key={seg.id}
                    onClick={() => { setSelectedSegment(seg.id); loadRecipients(seg.id); }}
                    style={{
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${selectedSegment === seg.id ? '#25D366' : T.border}`,
                      background: selectedSegment === seg.id ? '#f0fdf4' : T.surface,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{seg.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.tealDark }}>{seg.label}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{seg.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSegment === 'custom' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                    Phone Numbers (one per line, or comma separated)
                  </label>
                  <textarea
                    rows={5}
                    placeholder="9898xxxxxx&#10;9999xxxxxx&#10;Or: 9898xxxxxx, 9999xxxxxx"
                    value={customPhones}
                    onChange={e => setCustomPhones(e.target.value)}
                    onBlur={() => loadRecipients('custom')}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {selectedSegment && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {loadingRecipients ? (
                    <span style={{ fontSize: 13, color: T.muted }}>⏳ Loading recipients...</span>
                  ) : (
                    <div style={{ padding: '8px 16px', borderRadius: 99, background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534', fontSize: 13, fontWeight: 700 }}>
                      ✓ {recipients.length} recipients loaded
                    </div>
                  )}
                  {!loadingRecipients && recipients.length > 0 && (
                    <button
                      onClick={() => setStep(2)}
                      style={{ padding: '9px 20px', borderRadius: 8, background: '#25D366', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >Continue →</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MESSAGE */}
          {step === 2 && (
            <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.tealDark, margin: 0 }}>Step 2: Compose Message</h2>
                <button onClick={() => setStep(1)} style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
              </div>

              {/* Templates */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 8 }}>Quick Templates</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTemplate(t.id); setMessageText(t.text); }}
                      style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        border: `1.5px solid ${selectedTemplate === t.id ? '#25D366' : T.border}`,
                        background: selectedTemplate === t.id ? '#f0fdf4' : T.surface,
                        color: selectedTemplate === t.id ? '#166534' : T.text,
                        cursor: 'pointer',
                      }}
                    >{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Variable customization */}
              {(selectedTemplate === 'new_design' || selectedTemplate === 'festival_offer') && (
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fbbf24' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Fill Variables:</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#92400e', display: 'block', marginBottom: 3 }}>{'{fabric}'}</label>
                      <input value={customVar.fabric} onChange={e => setCustomVar(v => ({ ...v, fabric: e.target.value }))}
                        style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #fbbf24', fontSize: 12, width: 140 }} />
                    </div>
                  </div>
                </div>
              )}
              {selectedTemplate === 'payment_reminder' && (
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
                    Note: {'{amount}'} will be auto-filled from customer record if available, otherwise use:
                  </div>
                  <input placeholder="Default amount if unknown" value={customVar.amount} onChange={e => setCustomVar(v => ({ ...v, amount: e.target.value }))}
                    style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 12, width: 160 }} />
                </div>
              )}

              {/* Message editor */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  Message Text <span style={{ fontWeight: 400 }}>(use *bold*, {'{name}'}, {'{fabric}'}, {'{amount}'})</span>
                </label>
                <textarea
                  rows={10}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  placeholder="Type your message here..."
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{messageText.length} characters</span>
                  <span style={{ fontSize: 11, color: messageText.length > 1000 ? T.error : T.muted }}>
                    {messageText.length > 1000 ? '⚠️ Long message may be truncated' : 'OK'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!messageText.trim()}
                style={{ padding: '10px 24px', borderRadius: 8, background: messageText.trim() ? '#25D366' : T.border, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: messageText.trim() ? 'pointer' : 'not-allowed' }}
              >Preview & Send →</button>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.tealDark, margin: 0 }}>Step 3: Review & Send</h2>
                <button onClick={() => setStep(2)} style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
              </div>

              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Recipients', value: recipients.length, icon: '👥', color: T.teal },
                  { label: 'Message Length', value: `${messageText.length} chars`, icon: '📝', color: T.gold },
                  { label: 'Est. Time', value: `~${Math.ceil(recipients.length * 0.1 / 60)} min`, icon: '⏱️', color: T.orange },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '14px', borderRadius: 10, background: T.bg, border: `1.5px solid ${T.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Sample preview */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>Message Preview (sample recipient):</div>
                <div style={{ background: '#e5ddd5', padding: 16, borderRadius: 12 }}>
                  <div style={{ background: '#fff', borderRadius: '8px 8px 8px 0', padding: '10px 14px', maxWidth: '80%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {buildMessage(messageText, recipients[0] || { name: 'Customer', phone: '9898000000' })}
                    </p>
                    <div style={{ fontSize: 10, color: '#999', textAlign: 'right', marginTop: 4 }}>12:00 PM ✓✓</div>
                  </div>
                </div>
              </div>

              {/* First 5 recipients */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>Recipients (first 5 of {recipients.length}):</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recipients.slice(0, 5).map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${T.teal}20`, color: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {(r.name || 'C')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name || 'Customer'}</span>
                      <span style={{ fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{r.phone}</span>
                    </div>
                  ))}
                  {recipients.length > 5 && <div style={{ fontSize: 12, color: T.muted, padding: '4px 12px' }}>...and {recipients.length - 5} more</div>}
                </div>
              </div>

              <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fbbf24', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                ⚠️ <strong>Important:</strong> This will send real WhatsApp messages to {recipients.length} phone numbers. Meta WhatsApp API charges apply. Only send to customers who opted in.
              </div>

              <button
                onClick={startBroadcast}
                disabled={sending}
                style={{ padding: '12px 28px', borderRadius: 10, background: '#25D366', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                📢 Send Broadcast to {recipients.length} Customers
              </button>
            </div>
          )}

          {/* STEP 4: RESULTS */}
          {step === 4 && (
            <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.tealDark, marginBottom: 16 }}>
                {sending ? '📤 Sending Broadcast...' : '✅ Broadcast Complete'}
              </h2>

              {/* Progress bar */}
              {sending && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted, marginBottom: 6 }}>
                    <span>Progress: {progress}%</span>
                    <span>{results.sent + results.failed} / {recipients.length}</span>
                  </div>
                  <div style={{ height: 12, borderRadius: 99, background: T.border, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#25D366', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Please wait, do not close this page...</div>
                </div>
              )}

              {/* Results */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Sent Successfully', value: results.sent, icon: '✅', color: T.green },
                  { label: 'Failed', value: results.failed, icon: '❌', color: T.error },
                  { label: 'Total', value: recipients.length, icon: '📊', color: T.teal },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '14px', borderRadius: 10, background: T.bg, border: `1.5px solid ${T.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {results.errors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.error, marginBottom: 8 }}>Failed Deliveries:</div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {results.errors.map((e, i) => (
                      <div key={i} style={{ padding: '7px 12px', borderRadius: 7, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 12, color: T.error }}>
                        {e.name} (+{e.phone}) — {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!sending && (
                <button
                  onClick={() => { setStep(1); setSelectedSegment(''); setMessageText(''); setSelectedTemplate(''); setResults({ sent: 0, failed: 0, errors: [] }); setProgress(0); loadBroadcastLog(); }}
                  style={{ padding: '10px 20px', borderRadius: 8, background: T.teal, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >← Send Another Broadcast</button>
              )}
            </div>
          )}

          {/* BROADCAST HISTORY */}
          <div style={{ marginTop: 20, background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.tealDark, marginBottom: 14 }}>📋 Broadcast History</div>
            {loadingLog ? (
              <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: 24 }}>Loading...</div>
            ) : broadcastLog.length === 0 ? (
              <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: 24 }}>No broadcasts sent yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {broadcastLog.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, background: T.bg, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>📢</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{SEGMENTS.find(s => s.id === b.segment)?.label || b.segment} — {b.total_recipients} recipients</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>✓ {b.sent_count || 0} sent</div>
                      {b.failed_count > 0 && <div style={{ fontSize: 11, color: T.error }}>✗ {b.failed_count} failed</div>}
                    </div>
                    <div style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: b.status === 'completed' ? '#d1fae5' : '#fef3c7', color: b.status === 'completed' ? '#065f46' : '#92400e' }}>
                      {b.status || 'completed'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR: Tips */}
        {step < 4 && (
          <div>
            <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.tealDark, marginBottom: 12 }}>💡 Best Practices</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '⏰', tip: 'Best time to send: 10 AM – 12 PM or 4 PM – 6 PM' },
                  { icon: '👤', tip: 'Use {name} to personalize every message' },
                  { icon: '📏', tip: 'Keep messages under 500 characters for better readability' },
                  { icon: '🚫', tip: 'Don\'t send more than 1 broadcast per week per customer' },
                  { icon: '✅', tip: 'Only send to opted-in customers to avoid spam reports' },
                  { icon: '🌐', tip: 'Mix Hindi/Gujarati for regional customers' },
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{tip.icon}</span>
                    <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{tip.tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #86efac', padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 10 }}>📊 Quick Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'WhatsApp No.', value: '+91 78742 00033' },
                  { label: 'API Status', value: '🟢 Active' },
                  { label: 'Recipients Loaded', value: recipients.length || '—' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#166534' }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: '#14532d' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
