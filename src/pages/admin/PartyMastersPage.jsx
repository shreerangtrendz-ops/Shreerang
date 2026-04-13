import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
  amber:'#D97706',
};

const PAGE = 50;
const fmt  = n => n ? '₹' + Math.abs(Math.round(Number(n))).toLocaleString('en-IN') : '—';
const fmtL = n => { if(!n) return '—'; const v=Math.abs(Number(n)); return v>=100000 ? '₹'+(v/100000).toFixed(1)+'L' : '₹'+Math.round(v).toLocaleString('en-IN'); };
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

const STATE_CODES = {'01':'J&K','02':'HP','03':'PB','04':'CH','05':'UK','06':'HR','07':'DL','08':'RJ','09':'UP','10':'BR','18':'AS','19':'WB','20':'JH','21':'OD','22':'CG','23':'MP','24':'GJ','27':'MH','29':'KA','30':'GA','32':'KL','33':'TN','36':'TG'};
const stateFromGST = gst => gst ? (STATE_CODES[gst.trim().slice(0,2)] || null) : null;

// ─── Data completeness score ──────────────────────────────────────────────────
function completeness(row, type='customer') {
  const fields = type === 'customer'
    ? ['name','address','city','state','pincode','phone','gst_number','agent_name']
    : type === 'supplier'
    ? ['supplier_name','address','city','phone','gst_number']
    : ['name','phone','city'];
  const filled = fields.filter(f => row[f] && String(row[f]).trim() !== '');
  return Math.round((filled.length / fields.length) * 100);
}

function CompletenessBar({ pct, size = 'md' }) {
  const color = pct >= 80 ? T.green : pct >= 50 ? T.amber : T.red;
  if (size === 'sm') return (
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <div style={{width:36,height:4,background:'#e5e7eb',borderRadius:2}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:2}}/>
      </div>
      <span style={{fontSize:10,color,fontWeight:700}}>{pct}%</span>
    </div>
  );
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:6,background:'#e5e7eb',borderRadius:3}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:3,transition:'width 0.3s'}}/>
      </div>
      <span style={{fontSize:12,color,fontWeight:700,minWidth:35}}>{pct}%</span>
    </div>
  );
}

// ─── GST Badge ────────────────────────────────────────────────────────────────
function GSTBadge({ gst }) {
  if (!gst) return <span style={{fontSize:11,color:T.muted,fontStyle:'italic'}}>No GST</span>;
  const clean = gst.trim().toUpperCase();
  const valid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
  const sname = STATE_CODES[clean.slice(0,2)] || clean.slice(0,2);
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
      <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,
        background:valid?'#D1FAE5':'#FEF3C7',color:valid?'#065F46':'#92400E',
        border:`1px solid ${valid?'#6EE7B7':'#FCD34D'}`}}>
        {valid ? `✓ ${sname}` : '! Invalid'}
      </span>
      <span style={{fontSize:11,color:T.muted,fontFamily:'monospace'}}>{clean}</span>
    </span>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────
function EditableField({ label, value, field, onSave, placeholder = 'Click to add' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (val === (value || '')) { setEditing(false); return; }
    setSaving(true);
    await onSave(field, val.trim() || null);
    setSaving(false);
    setEditing(false);
  };

  if (editing) return (
    <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`,alignItems:'center'}}>
      <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>{label}</span>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape') setEditing(false); }}
        style={{flex:1,border:`1px solid ${T.teal}`,borderRadius:5,padding:'3px 8px',
          fontSize:12,outline:'none',background:'#fff'}}
      />
      <button onClick={save} disabled={saving}
        style={{padding:'3px 10px',background:T.teal,color:'#fff',border:'none',
          borderRadius:5,fontSize:11,cursor:'pointer',flexShrink:0}}>
        {saving ? '...' : '✓'}
      </button>
      <button onClick={() => setEditing(false)}
        style={{padding:'3px 8px',background:'#f1f5f9',color:T.muted,border:'none',
          borderRadius:5,fontSize:11,cursor:'pointer',flexShrink:0}}>✕</button>
    </div>
  );

  return (
    <div
      onClick={() => { setVal(value || ''); setEditing(true); }}
      style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',
        borderBottom:`1px solid ${T.bg}`,cursor:'pointer',borderRadius:4,
        transition:'background 0.1s'}}
      title="Click to edit"
      onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>{label}</span>
      {value
        ? <span style={{color:T.text,fontWeight:600,flex:1}}>{value}</span>
        : <span style={{color:'#cbd5e1',fontSize:11,flex:1,fontStyle:'italic'}}>{placeholder} ✏️</span>
      }
    </div>
  );
}

// ─── Static info row ──────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`}}>
      <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>{label}</span>
      <span style={{color:T.text,fontWeight:600,wordBreak:'break-word',flex:1}}>{value}</span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{background:T.bg,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`,minWidth:0}}>
      <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
      <div style={{fontSize:18,fontWeight:800,color:color||T.navy}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:0,borderBottom:`2px solid ${T.border}`,marginBottom:20}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding:'10px 20px',border:'none',background:'none',cursor:'pointer',
          fontSize:13,fontWeight:active===t.id?700:500,
          color:active===t.id?T.teal:T.muted,
          borderBottom:active===t.id?`2px solid ${T.teal}`:'2px solid transparent',
          marginBottom:-2,transition:'all 0.15s',whiteSpace:'nowrap',
          display:'flex',alignItems:'center',gap:6,
        }}>
          <span style={{fontSize:15}}>{t.icon}</span>
          <span>{t.label}</span>
          {t.count != null && (
            <span style={{fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:10,
              background:active===t.id?T.teal:T.border,color:active===t.id?'#fff':T.muted}}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Master table ─────────────────────────────────────────────────────────────
function MasterTable({ columns, rows, onSelect, selected, loading, emptyMsg }) {
  if (loading) return (
    <div style={{textAlign:'center',padding:'40px 0',color:T.muted}}>
      <div style={{fontSize:28,marginBottom:8}}>⏳</div>Loading...
    </div>
  );
  if (!rows.length) return (
    <div style={{textAlign:'center',padding:'40px 0',color:T.muted}}>
      <div style={{fontSize:32,marginBottom:8}}>🔍</div>{emptyMsg}
    </div>
  );
  return (
    <div style={{borderRadius:10,border:`1px solid ${T.border}`,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:T.tealLight}}>
            {columns.map(c => (
              <th key={c.key} style={{padding:'9px 12px',textAlign:'left',fontSize:11,
                fontWeight:700,color:T.navy,textTransform:'uppercase',letterSpacing:'0.05em',
                borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap'}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id||i}
              onClick={() => onSelect(row)}
              style={{
                background:selected?.id===row.id?'#DFF4F0':i%2===0?T.surface:'#FAFCFC',
                cursor:'pointer',transition:'background 0.12s',
                borderBottom:`1px solid ${T.border}`,
                borderLeft:selected?.id===row.id?`3px solid ${T.teal}`:'3px solid transparent',
              }}
              onMouseEnter={e => { if(selected?.id!==row.id) e.currentTarget.style.background='#EEF8F6'; }}
              onMouseLeave={e => { if(selected?.id!==row.id) e.currentTarget.style.background=i%2===0?T.surface:'#FAFCFC'; }}>
              {columns.map(c => (
                <td key={c.key} style={{padding:'9px 12px',color:T.text,whiteSpace:c.wrap?'normal':'nowrap'}}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CUSTOMER PROFILE PANEL
// ════════════════════════════════════════════════════════════════════
function CustomerProfile({ customer, onClose, onUpdate }) {
  const [stats, setStats]   = useState(null);
  const [bills, setBills]   = useState([]);
  const [aiSummary, setAI]  = useState('');
  const [aiLoading, setAIL] = useState(false);
  const [localCust, setLocalCust] = useState(customer);

  useEffect(() => { setLocalCust(customer); setAI(''); }, [customer]);

  useEffect(() => {
    if (!customer) return;
    const name = customer.tally_ledger_name || customer.name;
    supabase.from('sales_bills')
      .select('bill_number,bill_date,total_amount,quantity_mtrs,design_no,status')
      .eq('customer_name', name)
      .order('bill_date', { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        const rows = data || [];
        const total   = rows.reduce((s,r) => s + Number(r.total_amount||0), 0);
        const mtrs    = rows.reduce((s,r) => s + Number(r.quantity_mtrs||0), 0);
        const designs = [...new Set(rows.map(r=>r.design_no).filter(Boolean))];
        setStats({ total, mtrs, bills: rows.length, lastDate: rows[0]?.bill_date, designs });
        setBills(rows.slice(0,6));
      });
  }, [customer]);

  const saveField = async (field, value) => {
    const { error } = await supabase.from('customers')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    if (!error) {
      const updated = { ...localCust, [field]: value };
      setLocalCust(updated);
      onUpdate && onUpdate(updated);
    }
  };

  const getAI = async () => {
    if (!localCust || !stats) return;
    setAIL(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:400,
          messages:[{ role:'user', content:
`Analyse this textile customer of ShreeRang Trendz (Surat). Give a SHORT 3-4 line summary: buying pattern, loyalty, payment terms, actionable recommendation.

Customer: ${localCust.name} | City: ${localCust.city||'?'}, ${localCust.state||stateFromGST(localCust.gst_number)||'?'}
Agent: ${localCust.agent_name||'Direct'} | Type: ${localCust.customer_type||'Wholesale'} | Credit: ${localCust.credit_days||0}d
Total Sales: ${fmtL(stats?.total)} (${stats?.bills} bills) | Last Order: ${fmtD(stats?.lastDate)} | Metres: ${Math.round(stats?.mtrs||0)}m
Designs: ${stats?.designs?.slice(0,8).join(', ')||'none'}

Plain paragraph only, no bullet points.`
          }]
        })
      });
      const d = await res.json();
      setAI(d.content?.[0]?.text || 'Could not generate summary.');
    } catch { setAI('AI summary unavailable.'); }
    setAIL(false);
  };

  if (!localCust) return null;
  const pct = completeness(localCust, 'customer');
  const displayCity = localCust.city || stateFromGST(localCust.gst_number) || null;

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0B2E2B 0%,#1a4a45 100%)',padding:'18px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{localCust.name}</div>
            {localCust.tally_ledger_name && localCust.tally_ledger_name !== localCust.name &&
              <div style={{fontSize:11,opacity:0.6,marginBottom:6}}>Tally: {localCust.tally_ledger_name}</div>}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {localCust.customer_type && (
                <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
                  background:'rgba(255,255,255,0.15)',color:'#fff'}}>{localCust.customer_type}</span>
              )}
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
                background:localCust.status==='active'?'#065F46':'#7F1D1D',color:'#fff'}}>
                {localCust.status||'active'}
              </span>
              {displayCity && <span style={{fontSize:12,opacity:0.85}}>📍 {displayCity}</span>}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
            <button onClick={onClose}
              style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
                width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14}}>✕</button>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:70,height:5,background:'rgba(255,255,255,0.2)',borderRadius:3}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'#6EE7B7':pct>=50?'#FCD34D':'#FCA5A5',borderRadius:3}}/>
              </div>
              <span style={{fontSize:11,opacity:0.8}}>{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'20px 22px'}}>
        {/* Stats */}
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            <StatCard label="Total Sales" value={fmtL(stats.total)} sub={`${stats.bills} bills`} color={T.teal}/>
            <StatCard label="Total Metres" value={`${Math.round(stats.mtrs||0).toLocaleString('en-IN')}m`} color={T.blue}/>
            <StatCard label="Last Order" value={fmtD(stats.lastDate)} color={T.navy}/>
            <StatCard label="Designs Bought" value={stats.designs.length} sub="unique designs" color={T.green}/>
          </div>
        )}

        {/* Data completeness notice */}
        {pct < 80 && (
          <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,
            padding:'10px 14px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:16}}>✏️</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:T.amber}}>Profile {pct}% complete — click any field below to fill missing data</div>
              <div style={{fontSize:11,color:'#92400e',marginTop:2}}>
                Missing: {['city','state','pincode','phone','gst_number','address','agent_name']
                  .filter(f => !localCust[f])
                  .join(', ') || 'none'}
              </div>
            </div>
            <CompletenessBar pct={pct} />
          </div>
        )}

        {/* Two column layout */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              📍 Contact & Location
              <span style={{fontSize:10,color:T.teal,fontWeight:500,fontStyle:'italic',textTransform:'none'}}>click to edit</span>
            </div>
            <EditableField label="City" field="city" value={localCust.city} onSave={saveField} placeholder="Enter city name" />
            <EditableField label="State" field="state" value={localCust.state} onSave={saveField} placeholder="e.g. Gujarat" />
            <EditableField label="Pincode" field="pincode" value={localCust.pincode} onSave={saveField} placeholder="6-digit pincode" />
            <EditableField label="Phone" field="phone" value={localCust.phone} onSave={saveField} placeholder="Mobile/Landline" />
            <EditableField label="Email" field="email" value={localCust.email} onSave={saveField} placeholder="Email address" />
            <EditableField label="Address" field="address" value={localCust.address} onSave={saveField} placeholder="Street address" />
            {localCust.billing_address && <InfoRow label="Billing Addr" value={localCust.billing_address}/>}
            {localCust.delivery_address && <InfoRow label="Delivery Addr" value={localCust.delivery_address}/>}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>💼 Business Info</div>
            <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`}}>
              <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>GST Number</span>
              <span style={{flex:1}}>
                {localCust.gst_number
                  ? <GSTBadge gst={localCust.gst_number}/>
                  : <span style={{color:'#cbd5e1',fontSize:11,fontStyle:'italic'}}>
                      Not in Tally — add GSTIN in Tally ledger
                    </span>
                }
              </span>
            </div>
            <InfoRow label="GST State" value={stateFromGST(localCust.gst_number)}/>
            <EditableField label="Agent" field="agent_name" value={localCust.agent_name} onSave={saveField} placeholder="Agent name" />
            <InfoRow label="Credit Days" value={localCust.credit_days>0?`${localCust.credit_days} days`:null}/>
            <InfoRow label="Credit Limit" value={localCust.credit_limit>0?fmt(localCust.credit_limit):null}/>
            <InfoRow label="Payment Terms" value={localCust.payment_terms}/>
            <InfoRow label="Customer Type" value={localCust.customer_type}/>
            <InfoRow label="Transporter" value={localCust.transporter_name}/>
            <InfoRow label="PAN Number" value={localCust.pan_number}/>
            <InfoRow label="Opening Balance" value={localCust.opening_balance!=null && localCust.opening_balance!=0 ? fmt(localCust.opening_balance) : null}/>
            {localCust.tally_sync_at && (
              <div style={{display:'flex',gap:8,fontSize:11,padding:'5px 0'}}>
                <span style={{color:T.muted,minWidth:130}}>Tally Synced</span>
                <span style={{color:T.muted}}>{new Date(localCust.tally_sync_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</span>
              </div>
            )}
            <EditableField label="Notes" field="notes" value={localCust.notes} onSave={saveField} placeholder="Add notes..." />
          </div>
        </div>

        {/* Recent Bills */}
        {bills.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>🧾 Recent Bills</div>
            <div style={{borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:T.tealLight}}>
                    {['Bill No','Date','Metres','Amount','Design','Status'].map(h => (
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',fontSize:10,
                        fontWeight:700,color:T.navy,textTransform:'uppercase',
                        borderBottom:`1px solid ${T.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b,i) => (
                    <tr key={b.bill_number||i} style={{borderBottom:`1px solid ${T.bg}`,
                      background:i%2===0?T.surface:'#FAFCFC'}}>
                      <td style={{padding:'6px 10px',fontWeight:600,color:T.blue}}>{b.bill_number}</td>
                      <td style={{padding:'6px 10px',color:T.muted}}>{fmtD(b.bill_date)}</td>
                      <td style={{padding:'6px 10px'}}>{b.quantity_mtrs?`${Number(b.quantity_mtrs).toFixed(0)}m`:'—'}</td>
                      <td style={{padding:'6px 10px',fontWeight:600}}>{fmt(b.total_amount)}</td>
                      <td style={{padding:'6px 10px',color:T.muted,fontFamily:'monospace',fontSize:11}}>{b.design_no||'—'}</td>
                      <td style={{padding:'6px 10px'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,
                          background:b.status==='paid'?'#D1FAE5':'#FEF3C7',
                          color:b.status==='paid'?'#065F46':'#92400E'}}>
                          {b.status||'—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div style={{background:'#F0F9FF',border:'1px solid #BAE6FD',borderRadius:8,padding:'14px 16px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0C4A6E',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              🤖 AI Business Summary
            </div>
            {!aiSummary && (
              <button onClick={getAI} disabled={aiLoading||!stats}
                style={{padding:'5px 14px',background:aiLoading?'#94a3b8':T.teal,color:'#fff',border:'none',
                  borderRadius:6,fontSize:12,cursor:aiLoading?'not-allowed':'pointer',fontWeight:600}}>
                {aiLoading ? '⏳ Analysing...' : 'Generate Analysis'}
              </button>
            )}
          </div>
          {aiSummary
            ? <p style={{margin:0,fontSize:13,color:'#0C4A6E',lineHeight:1.6}}>{aiSummary}</p>
            : <p style={{margin:0,fontSize:12,color:'#64748b',fontStyle:'italic'}}>
                Click "Generate Analysis" for an AI-powered business summary of this customer.
              </p>
          }
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button onClick={() => window.open(`/admin/accounting/sales?customer=${encodeURIComponent(localCust.tally_ledger_name||localCust.name)}`,'_blank')}
            style={{padding:'8px 16px',background:T.navy,color:'#fff',border:'none',
              borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            📒 Full Ledger
          </button>
          <button onClick={() => window.open(`/admin/accounting/outstanding?party=${encodeURIComponent(localCust.tally_ledger_name||localCust.name)}`,'_blank')}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',
              borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            💳 Outstanding
          </button>
          <button onClick={() => window.open(`/admin/accounting/sales?customer=${encodeURIComponent(localCust.tally_ledger_name||localCust.name)}&mode=bills`,'_blank')}
            style={{padding:'8px 16px',background:T.blue,color:'#fff',border:'none',
              borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            🧾 All Bills
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUPPLIER PROFILE PANEL
// ════════════════════════════════════════════════════════════════════
function SupplierProfile({ supplier, onClose, onUpdate }) {
  const [localSup, setLocalSup] = useState(supplier);

  useEffect(() => { setLocalSup(supplier); }, [supplier]);

  const saveField = async (field, value) => {
    const { error } = await supabase.from('suppliers')
      .update({ [field]: value })
      .eq('id', supplier.id);
    if (!error) {
      const updated = { ...localSup, [field]: value };
      setLocalSup(updated);
      onUpdate && onUpdate(updated);
    }
  };

  if (!localSup) return null;
  const pct = completeness(localSup, 'supplier');

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(135deg,#1a3a6b 0%,#2468C8 100%)',padding:'16px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>{localSup.supplier_name}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {localSup.supplier_type && (
                <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
                  background:'rgba(255,255,255,0.15)'}}>{localSup.supplier_type}</span>
              )}
              {localSup.city && <span style={{fontSize:12,opacity:0.85}}>📍 {localSup.city}</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:60,height:5,background:'rgba(255,255,255,0.2)',borderRadius:3}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'#6EE7B7':'#FCD34D',borderRadius:3}}/>
              </div>
              <span style={{fontSize:11,opacity:0.8}}>{pct}%</span>
            </div>
            <button onClick={onClose}
              style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
                width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14}}>✕</button>
          </div>
        </div>
      </div>

      <div style={{padding:'18px 22px'}}>
        {pct < 80 && (
          <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,
            padding:'8px 12px',marginBottom:14,fontSize:12,color:'#92400e'}}>
            ✏️ Profile {pct}% complete — click any field to edit
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>📍 Contact</div>
            <EditableField label="City" field="city" value={localSup.city} onSave={saveField} placeholder="Enter city" />
            <EditableField label="State" field="state" value={localSup.state} onSave={saveField} placeholder="Enter state" />
            <EditableField label="Pincode" field="pincode" value={localSup.pincode} onSave={saveField} placeholder="Pincode" />
            <EditableField label="Phone" field="phone" value={localSup.phone} onSave={saveField} placeholder="Phone number" />
            <EditableField label="Email" field="email" value={localSup.email} onSave={saveField} placeholder="Email" />
            <EditableField label="Address" field="address" value={localSup.address} onSave={saveField} placeholder="Street address" />
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>💼 Business</div>
            <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`}}>
              <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>GST</span>
              <span style={{flex:1}}><GSTBadge gst={localSup.gst_number}/></span>
            </div>
            <InfoRow label="GST State" value={stateFromGST(localSup.gst_number)}/>
            <InfoRow label="PAN" value={localSup.pan_number}/>
            <InfoRow label="Supplier Type" value={localSup.supplier_type}/>
            <InfoRow label="Credit Days" value={localSup.credit_days>0?`${localSup.credit_days} days`:null}/>
            <InfoRow label="Tally Group" value={localSup.tally_group}/>
            <InfoRow label="Opening Balance" value={localSup.opening_balance!=null&&localSup.opening_balance!=0?fmt(localSup.opening_balance):null}/>
            <EditableField label="Notes" field="notes" value={localSup.notes} onSave={saveField} placeholder="Add notes..." />
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// AGENT PROFILE PANEL
// ════════════════════════════════════════════════════════════════════
function AgentProfile({ agent, custCounts, onClose, onUpdate }) {
  const [localAgent, setLocalAgent] = useState(agent);
  useEffect(() => { setLocalAgent(agent); }, [agent]);

  const saveField = async (field, value) => {
    const { error } = await supabase.from('agents').update({ [field]: value }).eq('id', agent.id);
    if (!error) { const u = {...localAgent,[field]:value}; setLocalAgent(u); onUpdate&&onUpdate(u); }
  };

  if (!localAgent) return null;
  const custCount = custCounts[localAgent.agent_name||localAgent.name] || 0;

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.gold}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(135deg,#78350f 0%,#d97706 100%)',padding:'16px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>{localAgent.agent_name||localAgent.name}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,padding:'2px 10px',borderRadius:10,
                background:'rgba(255,255,255,0.2)'}}>🤝 {custCount} customers</span>
              {localAgent.city && <span style={{fontSize:12,opacity:0.85}}>📍 {localAgent.city}</span>}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
              width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14}}>✕</button>
        </div>
      </div>
      <div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:'uppercase',marginBottom:8}}>Contact</div>
          <EditableField label="City" field="city" value={localAgent.city} onSave={saveField} />
          <EditableField label="State" field="state" value={localAgent.state} onSave={saveField} />
          <EditableField label="Phone" field="phone" value={localAgent.phone} onSave={saveField} />
          <EditableField label="Email" field="email" value={localAgent.email} onSave={saveField} />
          <EditableField label="Address" field="address" value={localAgent.address} onSave={saveField} />
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:T.muted,textTransform:'uppercase',marginBottom:8}}>Business</div>
          <InfoRow label="PAN" value={localAgent.pan_number}/>
          <InfoRow label="Opening Bal" value={localAgent.opening_balance!=0?fmt(localAgent.opening_balance):null}/>
          <InfoRow label="Tally Group" value={localAgent.tally_group}/>
          <InfoRow label="Tally Ledger" value={localAgent.tally_ledger_name}/>
          <EditableField label="Notes" field="notes" value={localAgent.notes} onSave={saveField} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ════════════════════════════════════════════════════════════════════
function CustomersTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [cityFilter, setCity]   = useState('');
  const [agentFilter, setAgent] = useState('');
  const [stateFilter, setState] = useState('');
  const [page, setPage]         = useState(0);
  const [selected, setSelected] = useState(null);
  const [incomplete, setIncomplete] = useState(false);
  const [cities, setCities]     = useState([]);
  const [agents, setAgents]     = useState([]);
  const [states, setStates]     = useState([]);

  useEffect(() => {
    supabase.from('customers').select('*').order('name').limit(10000)
      .then(({ data }) => {
        const d = data || [];
        setRows(d);
        setLoading(false);
        // Build filter lists from real data
        const cs = [...new Set(d.map(r=>r.city).filter(Boolean))].sort();
        const ag = [...new Set(d.map(r=>r.agent_name).filter(Boolean))].sort();
        const st = [...new Set(d.map(r=>r.state).filter(Boolean))].sort();
        setCities(cs); setAgents(ag); setStates(st);
      });
  }, []);

  const handleUpdate = useCallback((updated) => {
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelected(updated);
  }, []);

  const filtered = rows.filter(r => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) &&
        !r.phone?.includes(search) && !r.gst_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && r.city !== cityFilter) return false;
    if (agentFilter && r.agent_name !== agentFilter) return false;
    if (stateFilter && r.state !== stateFilter) return false;
    if (incomplete && completeness(r,'customer') >= 80) return false;
    return true;
  });

  const pagedRows = filtered.slice(page * PAGE, (page+1) * PAGE);

  // Summary stats
  const withCity = rows.filter(r=>r.city).length;
  const withGST  = rows.filter(r=>r.gst_number).length;
  const withPhone= rows.filter(r=>r.phone).length;
  const avgPct   = Math.round(rows.reduce((s,r)=>s+completeness(r,'customer'),0) / Math.max(rows.length,1));

  const columns = [
    { key:'name', label:'Customer Name', render: r => (
      <div>
        <div style={{fontWeight:700,color:T.navy,fontSize:13}}>{r.name}</div>
        {r.agent_name && <div style={{fontSize:10,color:T.muted}}>via {r.agent_name}</div>}
      </div>
    )},
    { key:'city', label:'City', render: r => (
      <div style={{fontSize:12}}>
        {r.city
          ? <span style={{fontWeight:600,color:T.navy}}>{r.city}</span>
          : <span style={{color:'#cbd5e1',fontSize:11,fontStyle:'italic'}}>—</span>
        }
        {r.state && <div style={{fontSize:10,color:T.muted}}>{r.state}</div>}
      </div>
    )},
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number}/> },
    { key:'phone', label:'Phone', render: r => r.phone
      ? <span style={{fontSize:12,color:T.text}}>{r.phone}</span>
      : <span style={{color:'#cbd5e1',fontSize:11}}>—</span>
    },
    { key:'customer_type', label:'Type', render: r => r.customer_type
      ? <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
          background:T.tealLight,color:T.teal}}>{r.customer_type}</span>
      : <span style={{color:'#cbd5e1',fontSize:11}}>—</span>
    },
    { key:'completeness', label:'Profile', render: r => <CompletenessBar pct={completeness(r,'customer')} size="sm"/> },
  ];

  return (
    <div>
      {/* Summary stats bar */}
      {!loading && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
          <div style={{background:T.tealLight,borderRadius:8,padding:'10px 14px',border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>Avg. Completeness</div>
            <div style={{fontSize:20,fontWeight:800,color:avgPct>=70?T.green:T.amber}}>{avgPct}%</div>
          </div>
          <div style={{background:'#f0fdf4',borderRadius:8,padding:'10px 14px',border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>Have City</div>
            <div style={{fontSize:20,fontWeight:800,color:T.green}}>{withCity.toLocaleString('en-IN')}</div>
            <div style={{fontSize:10,color:T.muted}}>{rows.length-withCity} missing</div>
          </div>
          <div style={{background:'#fef3c7',borderRadius:8,padding:'10px 14px',border:'1px solid #fcd34d'}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>Have Phone</div>
            <div style={{fontSize:20,fontWeight:800,color:T.amber}}>{withPhone.toLocaleString('en-IN')}</div>
            <div style={{fontSize:10,color:T.muted}}>{rows.length-withPhone} missing</div>
          </div>
          <div style={{background:'#eff6ff',borderRadius:8,padding:'10px 14px',border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>Have GST</div>
            <div style={{fontSize:20,fontWeight:800,color:T.blue}}>{withGST.toLocaleString('en-IN')}</div>
            <div style={{fontSize:10,color:T.muted}}>Add in Tally to sync</div>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:8,marginBottom:12}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="Search name, phone, GST..."
          style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
            fontSize:13,outline:'none',background:T.surface}}/>
        <select value={cityFilter} onChange={e=>{setCity(e.target.value);setPage(0);}}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}>
          <option value="">All Cities</option>
          {cities.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={agentFilter} onChange={e=>{setAgent(e.target.value);setPage(0);}}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}>
          <option value="">All Agents</option>
          {agents.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <select value={stateFilter} onChange={e=>{setState(e.target.value);setPage(0);}}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}>
          <option value="">All States</option>
          {states.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={()=>{setIncomplete(p=>!p);setPage(0);}}
          style={{padding:'8px 12px',border:`1px solid ${incomplete?T.amber:T.border}`,
            borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:incomplete?700:400,
            background:incomplete?'#fffbeb':T.surface,color:incomplete?T.amber:T.muted}}>
          {incomplete ? '⚠️ Incomplete only' : '🔍 Show incomplete'}
        </button>
      </div>

      <MasterTable columns={columns} rows={pagedRows} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No customers found" />

      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14,alignItems:'center'}}>
        <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
          style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:page===0?'not-allowed':'pointer',fontSize:12,opacity:page===0?0.4:1}}>← Prev</button>
        <span style={{fontSize:12,color:T.muted}}>Page {page+1} · {pagedRows.length} of {filtered.length} shown</span>
        <button onClick={() => setPage(p=>p+1)} disabled={(page+1)*PAGE>=filtered.length}
          style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:(page+1)*PAGE>=filtered.length?'not-allowed':'pointer',fontSize:12,
            opacity:(page+1)*PAGE>=filtered.length?0.4:1}}>Next →</button>
      </div>

      <CustomerProfile customer={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUPPLIERS TAB
// ════════════════════════════════════════════════════════════════════
function SuppliersTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [typeFilter, setType]   = useState('');

  useEffect(() => {
    supabase.from('suppliers').select('*').order('supplier_name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const handleUpdate = useCallback((updated) => {
    setRows(prev => prev.map(r => r.id===updated.id ? updated : r));
    setSelected(updated);
  }, []);

  const types = [...new Set(rows.map(r=>r.supplier_type).filter(Boolean))].sort();
  const filtered = rows.filter(r => {
    if (search && !r.supplier_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && r.supplier_type !== typeFilter) return false;
    return true;
  });

  const columns = [
    { key:'supplier_name', label:'Supplier Name', render: r => (
      <div>
        <div style={{fontWeight:700,color:T.navy}}>{r.supplier_name}</div>
        {r.supplier_type && <div style={{fontSize:10,color:T.muted}}>{r.supplier_type}</div>}
      </div>
    )},
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number}/> },
    { key:'city', label:'City', render: r => r.city||stateFromGST(r.gst_number)||'—' },
    { key:'phone', label:'Phone', render: r => r.phone||'—' },
    { key:'credit_days', label:'Credit', render: r => r.credit_days>0?`${r.credit_days}d`:'—' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'active'}</span>
    )},
    { key:'completeness', label:'Profile', render: r => <CompletenessBar pct={completeness(r,'supplier')} size="sm"/> },
  ];

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier name..."
          style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
            fontSize:13,outline:'none',background:T.surface}}/>
        <select value={typeFilter} onChange={e=>setType(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}>
          <option value="">All Types</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No suppliers found" />
      <SupplierProfile supplier={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// AGENTS TAB
// ════════════════════════════════════════════════════════════════════
function AgentsTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [custCounts, setCustCounts] = useState({});

  useEffect(() => {
    supabase.from('customers').select('agent_name').not('agent_name','is',null)
      .then(({ data }) => {
        const c = {}; (data||[]).forEach(r => { c[r.agent_name]=(c[r.agent_name]||0)+1; });
        setCustCounts(c);
      });
    supabase.from('agents').select('*').order('name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const handleUpdate = useCallback((updated) => {
    setRows(prev => prev.map(r => r.id===updated.id ? updated : r));
    setSelected(updated);
  }, []);

  const filtered = rows.filter(r => !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.agent_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key:'name', label:'Agent Name', render: r => <span style={{fontWeight:700,color:T.navy}}>{r.agent_name||r.name}</span> },
    { key:'city', label:'City / State', render: r => (
      <div style={{fontSize:12}}>
        {r.city && <div style={{fontWeight:600}}>{r.city}</div>}
        {r.state && <div style={{color:T.muted,fontSize:11}}>{r.state}</div>}
      </div>
    )},
    { key:'customers', label:'Customers', render: r => (
      <span style={{fontWeight:700,color:T.blue,fontSize:14}}>{custCounts[r.agent_name||r.name]||0}</span>
    )},
    { key:'phone', label:'Phone', render: r => r.phone||'—' },
    { key:'opening_balance', label:'Opening Bal', render: r => r.opening_balance&&r.opening_balance!=0?fmt(r.opening_balance):'—' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'active'}</span>
    )},
  ];

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agent name..."
        style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
          fontSize:13,outline:'none',background:T.surface,marginBottom:12,boxSizing:'border-box'}}/>
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No agents found" />
      <AgentProfile agent={selected} custCounts={custCounts} onClose={() => setSelected(null)} onUpdate={handleUpdate}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TRANSPORTERS TAB
// ════════════════════════════════════════════════════════════════════
function TransportersTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from('transporters').select('*').order('name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key:'name', label:'Transporter', render: r => <span style={{fontWeight:700,color:T.navy}}>{r.name}</span> },
    { key:'city', label:'City', render: r => r.city||'—' },
    { key:'phone', label:'Phone', render: r => r.phone||'—' },
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number}/> },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'—'}</span>
    )},
  ];

  return (
    <div>
      {rows.length === 0 && !loading && (
        <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,padding:'12px 16px',
          marginBottom:12,fontSize:13,color:'#92400e'}}>
          ⚠️ <strong>0 transporters synced.</strong> In Tally, transporter ledgers must be under a group containing "Transport", "Courier", "Cargo", or "Logistics".
          Check your Tally group names and update <code>routeLedger()</code> in n8n v35 accordingly.
        </div>
      )}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transporter or city..."
        style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
          fontSize:13,outline:'none',background:T.surface,marginBottom:12,boxSizing:'border-box'}}/>
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No transporters found" />
      {selected && (
        <div style={{marginTop:16,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:800,color:T.navy}}>{selected.name}</h3>
            <button onClick={() => setSelected(null)}
              style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:T.muted}}>✕</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div>
              <InfoRow label="City" value={selected.city}/>
              <InfoRow label="State" value={selected.state}/>
              <InfoRow label="Phone" value={selected.phone}/>
              <InfoRow label="Email" value={selected.email}/>
              <InfoRow label="Address" value={selected.address}/>
            </div>
            <div>
              <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`}}>
                <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>GST</span>
                <span><GSTBadge gst={selected.gst_number}/></span>
              </div>
              <InfoRow label="PAN" value={selected.pan_number}/>
              <InfoRow label="Tally Group" value={selected.tally_group}/>
              <InfoRow label="Opening Bal" value={selected.opening_balance&&selected.opening_balance!=0?fmt(selected.opening_balance):null}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function PartyMastersPage() {
  const [activeTab, setActiveTab] = useState('customers');
  const [counts, setCounts]       = useState({});

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id',{count:'exact',head:true}),
      supabase.from('agents').select('id',{count:'exact',head:true}),
      supabase.from('suppliers').select('id',{count:'exact',head:true}),
      supabase.from('transporters').select('id',{count:'exact',head:true}),
    ]).then(([c,a,s,t]) => setCounts({customers:c.count,agents:a.count,suppliers:s.count,transporters:t.count}));
  }, []);

  const tabs = [
    { id:'customers',    icon:'👥', label:'Customers',    count:counts.customers },
    { id:'agents',       icon:'🤝', label:'Agents',       count:counts.agents },
    { id:'suppliers',    icon:'🏭', label:'Suppliers',    count:counts.suppliers },
    { id:'transporters', icon:'🚛', label:'Transporters', count:counts.transporters },
  ];

  return (
    <div style={{padding:'24px 28px',background:T.bg,minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:28}}>📋</span>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:T.navy}}>Party Masters</h1>
          <p style={{margin:0,fontSize:13,color:T.muted}}>
            Customers · Agents · Suppliers · Transporters — click any row to view & edit profile
          </p>
        </div>
      </div>
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,
        padding:'20px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {activeTab==='customers'    && <CustomersTab />}
        {activeTab==='agents'       && <AgentsTab />}
        {activeTab==='suppliers'    && <SuppliersTab />}
        {activeTab==='transporters' && <TransportersTab />}
      </div>
    </div>
  );
}
