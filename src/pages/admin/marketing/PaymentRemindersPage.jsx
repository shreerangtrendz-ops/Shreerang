import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Send, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const C = { teal:'#2BA898',tealDark:'#0B2E2B',gold:'#D4920A',border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',surface:'#fff',surface2:'#F8FBFA',error:'#D93A3A',green:'#1E9E5A' };

function getDaysColor(days) {
  if (days > 30) return '#dc2626';
  if (days > 15) return '#d97706';
  if (days > 7) return '#ca8a04';
  return C.teal;
}

export default function PaymentRemindersPage() {
  const { toast } = useToast();
  const [outstandings, setOutstandings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [filter, setFilter] = useState('all');
  const [minDays, setMinDays] = useState(7);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    // Get outstanding from Tally sync
    const { data: os } = await supabase
      .from('tally_outstandings')
      .select('*')
      .eq('type','receivable')
      .gt('pending_amount', 0)
      .order('pending_amount', { ascending: false });

    // Get reminder history
    const { data: rem } = await supabase
      .from('payment_reminders')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    setOutstandings(os || []);
    setReminders(rem || []);
    setLoading(false);
  }

  // Calculate days overdue from bill date
  function getDaysOverdue(item) {
    if (!item.bill_date) return 0;
    const billDate = new Date(item.bill_date);
    const today = new Date();
    return Math.floor((today - billDate) / (1000 * 60 * 60 * 24));
  }

  async function sendReminder(item) {
    const days = getDaysOverdue(item);
    setSending(p => ({...p, [item.id]: true}));

    // Build WhatsApp message
    const message = `Dear ${item.party_name},\n\nThis is a gentle reminder that ₹${item.pending_amount?.toLocaleString('en-IN')} is outstanding on your account with Shreerang Trendz (${days} days).\n\nKindly arrange payment at your earliest convenience.\n\nThank you,\nShreerang Trendz\n📞 +91-7874200033`;

    // Log reminder to DB
    const { error } = await supabase.from('payment_reminders').insert({
      party_name: item.party_name,
      party_phone: null,
      amount_due: item.pending_amount,
      days_overdue: days,
      reminder_type: 'manual',
      message_sent: message,
      whatsapp_status: 'pending',
    });

    setSending(p => ({...p, [item.id]: false}));

    if (error) {
      toast({ variant:'destructive', description: error.message });
      return;
    }

    // Try to send via WhatsApp API
    try {
      const res = await fetch('/api/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_name: item.party_name, amount: item.pending_amount, days }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ description: `✅ Reminder logged for ${item.party_name}` });
      } else {
        toast({ description: `📋 Logged — WhatsApp: ${json.error || 'no phone on file'}` });
      }
    } catch {
      toast({ description: `📋 Reminder logged for ${item.party_name}` });
    }

    fetchData();
  }

  async function sendAllOverdue() {
    const overdue = filtered.filter(i => getDaysOverdue(i) >= minDays);
    toast({ description: `Sending ${overdue.length} reminders…` });
    for (const item of overdue) {
      await sendReminder(item);
      await new Promise(r => setTimeout(r, 500)); // 500ms delay between sends
    }
    toast({ description: '✅ All reminders sent!' });
  }

  const filtered = outstandings.filter(o => {
    const days = getDaysOverdue(o);
    if (filter === 'overdue7') return days >= 7;
    if (filter === 'overdue15') return days >= 15;
    if (filter === 'overdue30') return days >= 30;
    return true;
  });

  const totalDue = filtered.reduce((a,b) => a+(b.pending_amount||0), 0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#f4f9f8', minHeight:'100vh', color:C.text }}>
      <div style={{ background:`linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:18 }}>💬 Payment Reminders</div>
          <div style={{ color:'#81c5bc', fontSize:12 }}>Send WhatsApp reminders to overdue parties · Auto-pulled from Tally</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchData} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={sendAllOverdue} style={{ padding:'9px 18px', background:C.gold, color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Send size={14}/> Send All ({filtered.filter(i=>getDaysOverdue(i)>=minDays).length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, padding:'16px 20px' }}>
        {[
          { label:'Total Outstanding', value:`₹${totalDue.toLocaleString('en-IN')}`, color:C.tealDark, icon:'💰' },
          { label:'Parties', value:filtered.length, color:C.teal, icon:'👥' },
          { label:'7+ Days', value:filtered.filter(i=>getDaysOverdue(i)>=7).length, color:C.gold, icon:'⚠️' },
          { label:'30+ Days', value:filtered.filter(i=>getDaysOverdue(i)>=30).length, color:'#dc2626', icon:'🚨' },
          { label:'Sent Today', value:reminders.filter(r=>r.sent_at?.startsWith(new Date().toISOString().slice(0,10))).length, color:C.green, icon:'✅' },
        ].map(card => (
          <div key={card.label} style={{ background:C.surface, borderRadius:12, padding:'14px 16px', border:`1.5px solid ${C.border}` }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{card.icon}</div>
            <div style={{ fontWeight:800, fontSize:20, color:card.color }}>{card.value}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding:'0 20px 12px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        {['all','overdue7','overdue15','overdue30'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter===f?C.teal:C.border}`, background:filter===f?C.teal:'#fff', color:filter===f?'#fff':C.muted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {f==='all'?'All':f==='overdue7'?'7+ Days':f==='overdue15'?'15+ Days':'30+ Days'}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, fontSize:12, color:C.muted }}>
          Auto-send threshold:
          <input type="number" value={minDays} onChange={e=>setMinDays(parseInt(e.target.value)||7)} min={1} max={90}
            style={{ width:50, padding:'4px 6px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, textAlign:'center' }}/>
          days
        </div>
      </div>

      {/* Outstanding List */}
      {loading ? <div style={{textAlign:'center',padding:60,color:C.muted}}>Loading outstanding from Tally…</div> : (
        <div style={{ padding:'0 20px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
              <div style={{ fontWeight:600 }}>No outstanding found!</div>
              <div style={{ fontSize:12, marginTop:4 }}>Run Tally sync first to populate data.</div>
            </div>
          ) : (
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface2 }}>
                    {['Party Name','Outstanding','Bill Date','Days Overdue','Last Reminder','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:C.muted, fontSize:11, textTransform:'uppercase', letterSpacing:0.6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item,i) => {
                    const days = getDaysOverdue(item);
                    const lastReminder = reminders.find(r=>r.party_name===item.party_name);
                    return (
                      <tr key={item.id} style={{ borderTop:`1px solid ${C.border}`, background:days>=30?'#fff5f5':'transparent' }}>
                        <td style={{ padding:'10px 14px', fontWeight:600 }}>{item.party_name}</td>
                        <td style={{ padding:'10px 14px', fontWeight:700, color:days>=30?'#dc2626':C.tealDark, fontSize:15 }}>
                          ₹{(item.pending_amount||0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding:'10px 14px', color:C.muted, fontSize:12 }}>{item.bill_date||'—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ padding:'3px 10px', borderRadius:12, background:`${getDaysColor(days)}22`, color:getDaysColor(days), fontWeight:700, fontSize:12 }}>
                            {days > 0 ? `${days}d` : 'Today'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:11, color:C.muted }}>
                          {lastReminder ? new Date(lastReminder.sent_at||lastReminder.created_at).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={()=>sendReminder(item)} disabled={sending[item.id]}
                            style={{ padding:'6px 14px', background:sending[item.id]?'#94a3b8':C.teal, color:'#fff', border:'none', borderRadius:7, cursor:sending[item.id]?'not-allowed':'pointer', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                            {sending[item.id]?'Sending…':<><Send size={12}/> Remind</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reminder History */}
      {reminders.length > 0 && (
        <div style={{ padding:'0 20px 30px' }}>
          <div style={{ fontWeight:700, color:C.tealDark, marginBottom:10, fontSize:14 }}>📜 Recent Reminders</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
            {reminders.slice(0,6).map(r=>(
              <div key={r.id} style={{ background:C.surface, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}` }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{r.party_name}</div>
                <div style={{ fontSize:12, color:C.gold, fontWeight:600 }}>₹{(r.amount_due||0).toLocaleString('en-IN')} · {r.days_overdue}d overdue</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{new Date(r.created_at).toLocaleString('en-IN')}</div>
                <span style={{ fontSize:10, background:r.whatsapp_status==='sent'?'#dcfce7':'#fef3c7', color:r.whatsapp_status==='sent'?'#16a34a':'#92400e', padding:'2px 7px', borderRadius:8, fontWeight:600 }}>
                  {r.whatsapp_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
