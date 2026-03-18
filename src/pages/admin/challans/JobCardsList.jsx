import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, CheckCircle, Clock, Truck } from 'lucide-react';

const C = { teal:'#2BA898',tealDark:'#0B2E2B',gold:'#D4920A',border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',surface:'#fff',surface2:'#F8FBFA' };

const STATUS_META = {
  pending:       { label:'Pending',       color:'#64748b', bg:'#f1f5f9' },
  at_mill:       { label:'At Mill',       color:'#d97706', bg:'#fffbeb' },
  received:      { label:'Received',      color:'#0891b2', bg:'#e0f7fa' },
  quality_check: { label:'Quality Check', color:'#7c3aed', bg:'#f5f3ff' },
  done:          { label:'Done',          color:'#16a34a', bg:'#dcfce7' },
};

export default function JobCardsList() {
  const { toast } = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [editQty, setEditQty] = useState({});

  useEffect(() => { fetchCards(); }, []);

  async function fetchCards() {
    setLoading(true);
    const { data } = await supabase
      .from('job_cards')
      .select('*, sales_orders(order_no, party_name)')
      .order('created_at', { ascending: false });
    setCards(data || []);
    setLoading(false);
  }

  async function updateStatus(card, status) {
    setUpdating(card.id);
    await supabase.from('job_cards').update({ status, updated_at: new Date().toISOString() }).eq('id', card.id);
    setUpdating(null);
    fetchCards();
  }

  async function saveQtyReceived(card) {
    const qty = parseFloat(editQty[card.id]);
    if (isNaN(qty)) return;
    setUpdating(card.id);
    await supabase.from('job_cards').update({ qty_received: qty, updated_at: new Date().toISOString() }).eq('id', card.id);
    setUpdating(null);
    setEditQty(p => { const n={...p}; delete n[card.id]; return n; });
    fetchCards();
  }

  const filtered = cards.filter(c => filter === 'all' || c.status === filter);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#f4f9f8', minHeight:'100vh', color:C.text }}>
      <div style={{ background:`linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:18 }}>📦 Job Work Challans</div>
          <div style={{ color:'#81c5bc', fontSize:12 }}>Track all job cards across process steps · {cards.length} total</div>
        </div>
        <button onClick={fetchCards} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:8, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.surface, overflowX:'auto' }}>
        {['all',...Object.keys(STATUS_META)].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter===s?C.teal:C.border}`, background:filter===s?C.teal:'#fff', color:filter===s?'#fff':C.muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            {s==='all'?`All (${cards.length})`:`${STATUS_META[s]?.label} (${cards.filter(c=>c.status===s).length})`}
          </button>
        ))}
      </div>

      {loading ? <div style={{textAlign:'center',padding:60,color:C.muted}}>Loading job cards…</div> : (
        <div style={{ padding:'16px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <div style={{ fontWeight:600 }}>No job cards yet</div>
              <div style={{ fontSize:12, marginTop:4 }}>Create a Sales Order and click "Generate Job Cards" to start.</div>
            </div>
          ) : (
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface2 }}>
                    {['Card No','Order','Fabric','Process Step','Job Worker','Sent','Received','Shortage','Rate','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:C.muted, fontSize:11, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((card, i) => {
                    const sm = STATUS_META[card.status] || STATUS_META.pending;
                    const shortage = (card.qty_sent||0) - (card.qty_received||0);
                    const isEditingQty = card.id in editQty;
                    return (
                      <tr key={card.id} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?'transparent':'#fafffe' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:C.teal, fontSize:12 }}>{card.card_no||'—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ fontWeight:600, fontSize:12 }}>{card.sales_orders?.order_no||'—'}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{card.sales_orders?.party_name||''}</div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ fontWeight:600, fontSize:12 }}>{card.fabric_name||'—'}</div>
                          {card.design_no&&<div style={{ fontSize:11, color:C.muted }}>{card.design_no}</div>}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ background:`${C.teal}18`, color:C.teal, padding:'2px 8px', borderRadius:8, fontWeight:600, fontSize:11 }}>
                              #{card.step_sequence} {card.process_step}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', color:C.muted, fontSize:12 }}>{card.job_worker_name||'—'}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600 }}>{card.qty_sent||0}m</td>
                        <td style={{ padding:'10px 12px' }}>
                          {isEditingQty ? (
                            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                              <input type="number" value={editQty[card.id]} onChange={e=>setEditQty(p=>({...p,[card.id]:e.target.value}))}
                                style={{ width:60, padding:'4px 6px', border:`1.5px solid ${C.teal}`, borderRadius:5, fontSize:12 }}/>
                              <button onClick={()=>saveQtyReceived(card)} style={{ padding:'4px 8px', background:C.teal, color:'#fff', border:'none', borderRadius:5, fontSize:11, cursor:'pointer', fontWeight:600 }}>✓</button>
                              <button onClick={()=>setEditQty(p=>{const n={...p};delete n[card.id];return n;})} style={{ padding:'4px 6px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:5, fontSize:11, cursor:'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={()=>setEditQty(p=>({...p,[card.id]:card.qty_received||''}))}
                              style={{ padding:'4px 10px', border:`1px solid ${C.border}`, borderRadius:5, background:'#fff', cursor:'pointer', fontSize:12, color:C.text }}>
                              {card.qty_received||0}m ✏️
                            </button>
                          )}
                        </td>
                        <td style={{ padding:'10px 12px', color:shortage>0?'#dc2626':C.muted, fontWeight:shortage>0?700:400, fontSize:12 }}>
                          {shortage > 0 ? `-${shortage.toFixed(1)}m` : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', color:C.gold, fontWeight:600, fontSize:12 }}>₹{card.rate||0}/m</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ padding:'3px 9px', borderRadius:10, background:sm.bg, color:sm.color, fontWeight:700, fontSize:11 }}>
                            {sm.label}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <select value={card.status} onChange={e=>updateStatus(card,e.target.value)} disabled={updating===card.id}
                            style={{ padding:'5px 8px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, color:C.text, cursor:'pointer', background:'#fff' }}>
                            {Object.entries(STATUS_META).map(([k,v])=>(
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
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
    </div>
  );
}
