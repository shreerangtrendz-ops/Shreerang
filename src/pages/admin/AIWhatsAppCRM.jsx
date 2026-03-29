import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const WABA_ID = '868455029689394';
const T = { teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C', green:'#25D366', blue:'#2468C8', orange:'#E67E22', border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95' };

async function askClaude(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:500, messages:[{role:'user',content:prompt}] })
  });
  const d = await resp.json();
  return d.content?.[0]?.text || '';
}

const TEMPLATES = [
  { id:'dispatch', label:'📦 Dispatch Notification', prompt:'Write a WhatsApp message notifying customer their order has been dispatched. Include: company name Shreerang Trendz, professional but warm tone, Hinglish, max 5 lines, no markdown.' },
  { id:'payment', label:'💰 Payment Reminder', prompt:'Write a payment reminder WhatsApp message. Professional, respectful, firm. Hinglish, company Shreerang Trendz, max 4 lines.' },
  { id:'new_design', label:'🎨 New Design Launch', prompt:'Write an exciting WhatsApp message announcing a new fabric design collection. Textile B2B context, Hinglish, enthusiastic, max 4 lines, Shreerang Trendz.' },
  { id:'festival', label:'🎊 Festival Offer', prompt:'Write a festival greeting with special offer for textile customers. Hinglish, warm, professional, Shreerang Trendz, max 4 lines.' },
  { id:'followup', label:'🔔 Order Follow-up', prompt:'Write a WhatsApp follow-up message checking on customer satisfaction with their order. Care-focused, Hinglish, Shreerang Trendz, max 3 lines.' },
  { id:'price', label:'💎 Rate Update', prompt:'Write a WhatsApp message informing about updated fabric rates/prices. Professional, clear, Hinglish, Shreerang Trendz, max 4 lines.' },
];

export default function AIWhatsAppCRM() {
  const [waToken, setWaToken] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [customContext, setCustomContext] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [broadcastList, setBroadcastList] = useState([]);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastProgress, setBroadcastProgress] = useState(null);
  const [sentLogs, setSentLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('compose');

  useEffect(() => { loadRecentCustomers(); }, []);

  const loadRecentCustomers = async () => {
    const { data } = await supabase.from('sales_bills').select('customer_name,bill_date,total_amount').order('bill_date', { ascending: false }).limit(100);
    const seen = new Set();
    const unique = (data||[]).filter(d => { if (seen.has(d.customer_name)) return false; seen.add(d.customer_name); return true; }).slice(0,20);
    setRecentCustomers(unique);
  };

  const generateMessage = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    const tmpl = TEMPLATES.find(t=>t.id===selectedTemplate);
    const context = customContext ? `
Additional context: ${customContext}` : '';
    const msg = await askClaude(tmpl.prompt + context);
    setGeneratedMsg(msg);
    setGenerating(false);
  };

  const sendWhatsApp = async (phone, msg) => {
    if (!waToken || !phone || !msg) { alert('Need: WhatsApp token, phone, and message'); return ''; }
    const cleanPhone = phone.replace(/[^0-9]/g,'');
    try {
      const resp = await fetch(`https://graph.facebook.com/v17.0/${WABA_ID}/messages`, {
        method:'POST', headers:{'Authorization':`Bearer ${waToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({ messaging_product:'whatsapp', to:cleanPhone, type:'text', text:{ body:msg } })
      });
      const d = await resp.json();
      return d.messages?.[0]?.id ? 'sent' : 'failed';
    } catch(e) { return 'error'; }
  };

  const sendSingle = async () => {
    if (!recipientPhone || !generatedMsg) return;
    setSendStatus('sending');
    const status = await sendWhatsApp(recipientPhone, generatedMsg);
    setSendStatus(status);
    if (status === 'sent') setSentLogs(prev => [{ phone:recipientPhone, msg:generatedMsg.substring(0,50), time:new Date().toLocaleTimeString(), status:'sent' }, ...prev]);
  };

  const startBroadcast = async () => {
    const phones = broadcastList.filter(p => p.phone);
    if (!phones.length || !generatedMsg) { alert('Add phones and generate message first'); return; }
    setBroadcastProgress({ total: phones.length, sent: 0, failed: 0 });
    for (let i = 0; i < phones.length; i++) {
      const status = await sendWhatsApp(phones[i].phone, generatedMsg.replace('[NAME]', phones[i].name || ''));
      setBroadcastProgress(prev => ({ ...prev, sent: prev.sent+(status==='sent'?1:0), failed: prev.failed+(status!=='sent'?1:0) }));
      if (i < phones.length-1) await new Promise(r => setTimeout(r, 1500)); // Rate limit
    }
  };

  const addToBroadcast = (customer) => {
    if (!broadcastList.find(b=>b.name===customer.customer_name)) {
      setBroadcastList(prev => [...prev, { name: customer.customer_name, phone: '' }]);
    }
  };

  const fmt = n => `₹${Math.round((n||0)/1000)}K`;

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      <div style={{ background:'#128C7E', borderRadius:12, padding:'14px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>📱 AI WhatsApp CRM</div>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 }}>AI-generated messages · Dispatch updates · Payment reminders · Broadcast</div>
        </div>
        <input value={waToken} onChange={e=>setWaToken(e.target.value)} placeholder="WhatsApp Bearer Token"
          style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:12, width:220 }} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:14 }}>
        {['compose','broadcast','logs'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={{ padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background:activeTab===t?'#128C7E':T.surface, color:activeTab===t?'#fff':T.muted, textTransform:'capitalize' }}>
            {t==='compose'?'✍️ Compose':t==='broadcast'?'📢 Broadcast':'📋 Sent Log'}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {/* Left: Template + compose */}
          <div>
            <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}`, marginBottom:12 }}>
              <div style={{ fontWeight:600, color:T.text, marginBottom:10 }}>1. Choose Template</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                    style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${selectedTemplate===t.id?'#128C7E':T.border}`, background:selectedTemplate===t.id?'#E8F8F6':T.bg, color:T.text, cursor:'pointer', textAlign:'left', fontSize:13 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}`, marginBottom:12 }}>
              <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>2. Add Context (optional)</div>
              <textarea value={customContext} onChange={e=>setCustomContext(e.target.value)} placeholder="e.g. Customer name, order details, specific offer..."
                style={{ width:'100%', height:60, padding:'8px 10px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, resize:'vertical', outline:'none', fontFamily:'inherit' }} />
              <button onClick={generateMessage} disabled={generating || !selectedTemplate}
                style={{ width:'100%', marginTop:8, padding:'10px', background:'#128C7E', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>
                {generating ? '⏳ Claude is writing...' : '🤖 Generate AI Message'}
              </button>
            </div>

            {generatedMsg && (
              <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
                <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>3. Send</div>
                <input value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value)} placeholder="91XXXXXXXXXX (with country code)"
                  style={{ width:'100%', padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, marginBottom:8, outline:'none' }} />
                <button onClick={sendSingle} disabled={!recipientPhone || !waToken}
                  style={{ width:'100%', padding:'10px', background: sendStatus==='sent'?T.green:sendStatus==='failed'?T.red:'#25D366', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>
                  {sendStatus==='sending'?'📤 Sending...':sendStatus==='sent'?'✓ Sent!':sendStatus==='failed'?'✗ Failed':'📱 Send WhatsApp'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Preview + recent customers */}
          <div>
            <div style={{ background:'#E8F5E9', borderRadius:10, padding:16, border:`1px solid #C8E6C9`, marginBottom:12, minHeight:200 }}>
              <div style={{ fontWeight:600, color:'#2E7D32', marginBottom:10, fontSize:12 }}>📱 WHATSAPP PREVIEW</div>
              {generatedMsg ? (
                <div style={{ background:'#DCF8C6', borderRadius:'12px 12px 0 12px', padding:'10px 14px', fontSize:13, lineHeight:1.6, maxWidth:'80%', boxShadow:'0 1px 2px rgba(0,0,0,0.1)' }}>
                  <div style={{ whiteSpace:'pre-line', color:'#1a1a1a' }}>{generatedMsg}</div>
                  <div style={{ color:'#999', fontSize:10, textAlign:'right', marginTop:4 }}>✓✓ {new Date().toLocaleTimeString().slice(0,5)}</div>
                </div>
              ) : (
                <div style={{ color:'#999', textAlign:'center', padding:30 }}>Message preview appears here</div>
              )}
              {generatedMsg && (
                <textarea value={generatedMsg} onChange={e=>setGeneratedMsg(e.target.value)}
                  style={{ width:'100%', marginTop:10, padding:'8px 10px', border:`1px solid #C8E6C9`, borderRadius:8, fontSize:12, resize:'vertical', outline:'none', background:'transparent', fontFamily:'inherit', minHeight:80 }} />
              )}
            </div>

            <div style={{ background:T.surface, borderRadius:10, padding:14, border:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:600, color:T.text, marginBottom:8, fontSize:13 }}>Recent Customers (from Tally)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {recentCustomers.map((c,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background:T.bg, borderRadius:6 }}>
                    <div>
                      <div style={{ color:T.text, fontSize:12, fontWeight:500 }}>{c.customer_name?.substring(0,22)}</div>
                      <div style={{ color:T.muted, fontSize:10 }}>{c.bill_date} · {fmt(c.total_amount)}</div>
                    </div>
                    <button onClick={()=>addToBroadcast(c)} style={{ background:T.teal, color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:10, cursor:'pointer' }}>+ Add</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <div style={{ background:T.surface, borderRadius:10, padding:14, border:`1px solid ${T.border}`, marginBottom:12 }}>
              <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>Broadcast List ({broadcastList.length} contacts)</div>
              {broadcastList.map((b,i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'center' }}>
                  <span style={{ color:T.text, fontSize:12, flex:1 }}>{b.name?.substring(0,20)}</span>
                  <input value={b.phone} onChange={e=>{const l=[...broadcastList];l[i].phone=e.target.value;setBroadcastList(l);}} placeholder="91XXXXXXXXXX"
                    style={{ width:140, padding:'4px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, outline:'none' }} />
                  <button onClick={()=>setBroadcastList(prev=>prev.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:14 }}>✕</button>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={broadcastInput} onChange={e=>setBroadcastInput(e.target.value)} placeholder="Add name,91XXXXXXXXXX"
                  style={{ flex:1, padding:'6px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, outline:'none' }} />
                <button onClick={()=>{ const [name,phone]=broadcastInput.split(','); if(phone){setBroadcastList(prev=>[...prev,{name:name?.trim(),phone:phone?.trim()}]);setBroadcastInput('');} }}
                  style={{ background:T.teal, color:'#fff', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12 }}>Add</button>
              </div>
            </div>
            {!generatedMsg && <div style={{ background:'#FFF3CD', borderRadius:8, padding:10, color:'#856404', fontSize:12 }}>⚠ Generate a message in Compose tab first</div>}
            {generatedMsg && (
              <button onClick={startBroadcast} disabled={!!broadcastProgress || !waToken}
                style={{ width:'100%', padding:'12px', background:broadcastProgress?T.muted:'#25D366', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:14 }}>
                {broadcastProgress ? `📤 Sending... ${broadcastProgress.sent+broadcastProgress.failed}/${broadcastProgress.total}` : `📢 Send to ${broadcastList.length} contacts`}
              </button>
            )}
            {broadcastProgress && (
              <div style={{ background:T.surface, borderRadius:8, padding:12, marginTop:10, border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span style={{ color:T.green }}>✓ Sent: {broadcastProgress.sent}</span>
                  <span style={{ color:T.red }}>✗ Failed: {broadcastProgress.failed}</span>
                  <span style={{ color:T.muted }}>Total: {broadcastProgress.total}</span>
                </div>
                <div style={{ background:T.border, borderRadius:3, height:6, marginTop:8 }}>
                  <div style={{ background:T.green, height:6, borderRadius:3, width:`${((broadcastProgress.sent+broadcastProgress.failed)/broadcastProgress.total*100).toFixed(0)}%`, transition:'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ background:'#E8F5E9', borderRadius:10, padding:14, border:`1px solid #C8E6C9` }}>
            <div style={{ fontWeight:600, color:'#2E7D32', marginBottom:8, fontSize:12 }}>MESSAGE TO BROADCAST</div>
            {generatedMsg ? (
              <div style={{ background:'#DCF8C6', borderRadius:'12px 12px 0 12px', padding:'10px 14px', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{generatedMsg}</div>
            ) : <div style={{ color:'#999', textAlign:'center', padding:20 }}>No message yet</div>}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.text }}>Sent Messages Log ({sentLogs.length})</div>
          {sentLogs.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:T.muted }}>No messages sent yet this session</div>
          ) : sentLogs.map((l,i) => (
            <div key={i} style={{ padding:'10px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
              <div>
                <span style={{ color:T.text, fontWeight:500 }}>{l.phone}</span>
                <span style={{ color:T.muted, marginLeft:10 }}>{l.msg}...</span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ color:T.muted }}>{l.time}</span>
                <span style={{ color: l.status==='sent'?T.green:T.red, fontWeight:500 }}>{l.status==='sent'?'✓ Sent':'✗ Failed'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
