import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const WABA_ID = '868455029689394';
const T = { teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C', green:'#1E9E5A', blue:'#2468C8', orange:'#E67E22', border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95' };

async function askClaude(prompt) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600, messages:[{role:'user',content:prompt}] })
    });
    const d = await resp.json();
    return d.content?.[0]?.text || '';
  } catch(e) { return ''; }
}

export default function AIPaymentRemindersPage() {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [aiMessages, setAiMessages] = useState({});
  const [generatingFor, setGeneratingFor] = useState(null);
  const [waToken, setWaToken] = useState('');
  const [sentStatus, setSentStatus] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryInsight, setSummaryInsight] = useState('');

  useEffect(() => { loadReceivables(); }, []);

  const loadReceivables = async () => {
    setLoading(true);
    // Get outstanding from sales_bills — bills without matching receipts
    const { data: sales } = await supabase.from('sales_bills').select('customer_name,bill_number,bill_date,total_amount,narration').order('bill_date', { ascending: true }).limit(500);

    // Group by customer, calculate total outstanding and max age
    const custMap = {};
    (sales||[]).forEach(s => {
      const name = s.customer_name;
      if (!name) return;
      if (!custMap[name]) custMap[name] = { customer: name, bills: [], total: 0, oldest: s.bill_date };
      custMap[name].bills.push(s);
      custMap[name].total += s.total_amount||0;
      if (s.bill_date < custMap[name].oldest) custMap[name].oldest = s.bill_date;
    });

    const today = new Date();
    const list = Object.values(custMap).map(c => {
      const days = Math.floor((today - new Date(c.oldest)) / 86400000);
      return { ...c, days, urgency: days > 60 ? 'critical' : days > 30 ? 'high' : days > 15 ? 'medium' : 'low' };
    }).sort((a,b) => b.total - a.total);

    setReceivables(list);
    setLoading(false);

    // Generate AI summary
    const top5 = list.slice(0,5).map(r => `${r.customer}: ₹${Math.round(r.total/1000)}K (${r.days} days)`).join(', ');
    const totalOutstanding = list.reduce((a,r) => a+r.total, 0);
    const critical = list.filter(r => r.urgency === 'critical').length;
    const insight = await askClaude(`You are a collections manager for Shreerang Trendz, a textile company in Surat. Analyze this receivables data and give 3 specific action items in Hinglish (Hindi+English mix). Be direct and specific.

Total outstanding: ₹${Math.round(totalOutstanding/100000)}L
Critical (60+ days): ${critical} customers
Top customers: ${top5}

Give 3 bullet points on what to do today.`);
    setSummaryInsight(insight);
  };

  const generateWhatsAppMsg = async (cust) => {
    setGeneratingFor(cust.customer);
    const msg = await askClaude(`Write a professional yet friendly WhatsApp payment reminder message in Hinglish (Hindi+English mix) for:
Customer: ${cust.customer}
Outstanding: ₹${Math.round(cust.total/1000)}K (${cust.bills.length} bills)
Overdue days: ${cust.days} days

Tone: Respectful but firm. Short (max 4 lines). Include business name Shreerang Trendz. Do not use bold or markdown. Just plain text.`);
    setAiMessages(prev => ({ ...prev, [cust.customer]: msg }));
    setGeneratingFor(null);
  };

  const sendWhatsApp = async (cust, phone) => {
    if (!waToken || !phone) { alert('Add WhatsApp token and customer phone'); return; }
    const msg = aiMessages[cust.customer];
    if (!msg) { alert('Generate AI message first'); return; }
    try {
      const resp = await fetch(`https://graph.facebook.com/v17.0/${WABA_ID}/messages`, {
        method:'POST', headers:{'Authorization':`Bearer ${waToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({ messaging_product:'whatsapp', to:phone.replace(/[^0-9]/g,''), type:'text', text:{ body: msg } })
      });
      const d = await resp.json();
      if (d.messages?.[0]?.id) setSentStatus(prev => ({...prev, [cust.customer]: 'sent'}));
      else alert('Send failed: ' + JSON.stringify(d));
    } catch(e) { alert('Error: '+e.message); }
  };

  const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.round(n/1000)}K`;

  const urgencyColors = { critical: T.red, high: T.orange, medium: T.gold, low: T.green };
  const urgencyBg = { critical:'#FEE2E2', high:'#FFF0E6', medium:'#FFFBEB', low:'#F0FFF4' };

  const filtered = receivables.filter(r => {
    if (filter !== 'all' && r.urgency !== filter) return false;
    if (searchTerm && !r.customer.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalOutstanding = receivables.reduce((a,r) => a+r.total, 0);
  const criticalCount = receivables.filter(r=>r.urgency==='critical').length;
  const highCount = receivables.filter(r=>r.urgency==='high').length;

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:T.muted}}>Loading receivables from Tally...</div>;

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      {/* Header */}
      <div style={{ background:T.navy, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>💰 AI Payment Recovery</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2 }}>Auto-analyzes Tally data · Generates WhatsApp reminders with Claude AI</div>
        </div>
        <input value={waToken} onChange={e=>setWaToken(e.target.value)} placeholder="WhatsApp Bearer Token"
          style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:12, width:200 }} />
      </div>

      {/* AI Insight */}
      {summaryInsight && (
        <div style={{ background:'#0B2E2B', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ color:T.gold, fontWeight:600, fontSize:12, marginBottom:6 }}>🤖 CLAUDE AI — COLLECTION PRIORITIES TODAY</div>
          <div style={{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{summaryInsight}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          { label:'Total Outstanding', val: fmt(totalOutstanding), color:T.red },
          { label:'Customers with Dues', val: receivables.length, color:T.text },
          { label:'Critical (60+ days)', val: criticalCount, color:T.red },
          { label:'High Priority (30-60d)', val: highCount, color:T.orange },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, borderRadius:10, padding:12, border:`1px solid ${T.border}`, textAlign:'center' }}>
            <div style={{ color:T.muted, fontSize:11, textTransform:'uppercase', marginBottom:4 }}>{k.label}</div>
            <div style={{ color:k.color, fontSize:20, fontWeight:700 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        {['all','critical','high','medium','low'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background: filter===f ? T.teal : T.surface, color: filter===f ? '#fff' : T.muted }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search customer..."
          style={{ marginLeft:'auto', padding:'6px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, outline:'none' }} />
      </div>

      {/* Customer List */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((r,i) => (
          <div key={i} style={{ background:T.surface, borderRadius:10, border:`2px solid ${urgencyColors[r.urgency]}`, overflow:'hidden' }}>
            <div style={{ background:urgencyBg[r.urgency], padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span style={{ fontWeight:600, color:T.text, fontSize:14 }}>{r.customer}</span>
                <span style={{ marginLeft:10, fontSize:11, color:urgencyColors[r.urgency], fontWeight:600, background:'rgba(255,255,255,0.6)', padding:'2px 8px', borderRadius:20 }}>
                  {r.urgency.toUpperCase()} · {r.days} days
                </span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, color:urgencyColors[r.urgency], fontSize:16 }}>{fmt(r.total)}</div>
                <div style={{ color:T.muted, fontSize:11 }}>{r.bills.length} bills</div>
              </div>
            </div>
            <div style={{ padding:'10px 16px' }}>
              <div style={{ color:T.muted, fontSize:11, marginBottom:8 }}>
                Bills: {r.bills.slice(0,3).map(b=>b.bill_number).join(', ')}{r.bills.length>3?` +${r.bills.length-3} more`:''}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={()=>generateWhatsAppMsg(r)} disabled={generatingFor===r.customer}
                  style={{ background:T.teal, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                  {generatingFor===r.customer ? '⏳ Generating...' : '🤖 Generate AI Message'}
                </button>
                {aiMessages[r.customer] && (
                  <button onClick={()=>{ const ph=prompt('Enter customer phone (91XXXXXXXXXX):'); sendWhatsApp(r,ph); }}
                    style={{ background: sentStatus[r.customer]==='sent' ? T.green : '#25D366', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                    {sentStatus[r.customer]==='sent' ? '✓ Sent' : '📱 Send WhatsApp'}
                  </button>
                )}
              </div>
              {aiMessages[r.customer] && (
                <div style={{ marginTop:10, background:T.bg, borderRadius:8, padding:10, border:`1px solid ${T.border}` }}>
                  <div style={{ color:T.muted, fontSize:10, marginBottom:4, fontWeight:600 }}>AI GENERATED MESSAGE:</div>
                  <textarea value={aiMessages[r.customer]} onChange={e=>setAiMessages(prev=>({...prev,[r.customer]:e.target.value}))}
                    style={{ width:'100%', background:'transparent', border:'none', fontSize:13, color:T.text, lineHeight:1.5, resize:'vertical', outline:'none', minHeight:60 }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
