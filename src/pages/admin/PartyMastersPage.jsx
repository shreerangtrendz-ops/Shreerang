import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};

const fmt  = n => n ? '\u20b9' + Math.abs(Math.round(Number(n))).toLocaleString('en-IN') : '\u2014';
const fmtL = n => { if(!n) return '\u2014'; const v=Math.abs(Number(n)); return v>=100000 ? '\u20b9'+(v/100000).toFixed(1)+'L' : '\u20b9'+Math.round(v).toLocaleString('en-IN'); };
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '\u2014';

const SC = {'01':'J&K','02':'HP','03':'PB','04':'CH','05':'UK','06':'HR','07':'DL','08':'RJ','09':'UP','10':'BR','18':'AS','19':'WB','20':'JH','21':'OD','22':'CG','23':'MP','24':'GJ','27':'MH','29':'KA','30':'GA','32':'KL','33':'TN','36':'TG'};

function GSTBadge({ gst }) {
  if (!gst) return <span style={{fontSize:11,color:T.muted}}>No GST</span>;
  const clean = gst.trim().toUpperCase();
  const valid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
  const sname = SC[clean.slice(0,2)] || clean.slice(0,2);
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
      <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,
        background:valid?'#D1FAE5':'#FEF3C7',color:valid?'#065F46':'#92400E',
        border:`1px solid ${valid?'#6EE7B7':'#FCD34D'}`}}>
        {valid ? `OK ${sname}` : '! Invalid'}
      </span>
      <span style={{fontSize:11,color:T.muted,fontFamily:'monospace'}}>{clean}</span>
    </span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{background:T.bg,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`,minWidth:0}}>
      <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
      <div style={{fontSize:18,fontWeight:800,color:color||T.navy}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{display:'flex',gap:8,fontSize:12,padding:'5px 0',borderBottom:`1px solid ${T.bg}`}}>
      <span style={{color:T.muted,minWidth:130,flexShrink:0,fontWeight:500}}>{label}</span>
      <span style={{color:T.text,fontWeight:600,wordBreak:'break-word',flex:1}}>{value}</span>
    </div>
  );
}

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

function MasterTable({ columns, rows, onSelect, selected, loading, emptyMsg }) {
  if (loading) return <div style={{textAlign:'center',padding:'48px 0',color:T.muted,fontSize:13}}>Loading...</div>;
  if (!rows.length) return <div style={{textAlign:'center',padding:'48px 0',color:T.muted,fontSize:13}}>{emptyMsg||'No records found'}</div>;
  return (
    <div style={{overflowX:'auto',borderRadius:8,border:`1px solid ${T.border}`}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:T.tealLight}}>
            {columns.map(c => (
              <th key={c.key} style={{padding:'9px 12px',textAlign:'left',fontSize:11,fontWeight:700,
                color:T.navy,letterSpacing:'0.05em',textTransform:'uppercase',
                borderBottom:`2px solid ${T.border}`,whiteSpace:'nowrap'}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id||i}
              onClick={() => onSelect(selected?.id===row.id ? null : row)}
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
                  {c.render ? c.render(row) : (row[c.key] ?? '\u2014')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- CUSTOMER PROFILE PANEL ---
function CustomerProfile({ customer, onClose }) {
  const [stats, setStats]   = useState(null);
  const [bills, setBills]   = useState([]);
  const [aiSummary, setAI]  = useState('');
  const [aiLoading, setAIL] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const name = customer.tally_ledger_name || customer.name;
    supabase.from('sales_bills')
      .select('bill_number,bill_date,total_amount,quantity_mtrs,design_no,status')
      .eq('customer_name', name)
      .order('bill_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const rows = data || [];
        const total   = rows.reduce((s,r) => s + Number(r.total_amount||0), 0);
        const mtrs    = rows.reduce((s,r) => s + Number(r.quantity_mtrs||0), 0);
        const designs = [...new Set(rows.map(r=>r.design_no).filter(Boolean))];
        setStats({ total, mtrs, bills: rows.length, lastDate: rows[0]?.bill_date, designs });
        setBills(rows.slice(0,6));
      });
  }, [customer]);

  const getAI = async () => {
    if (!customer || !stats) return;
    setAIL(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:400,
          messages:[{
            role:'user',
            content:`You are a textile business analyst for SheeRang Trendz Pvt. Ltd. (Surat).
Analyse this customer and give a SHORT 3-4 line business summary covering: buying pattern, loyalty, payment terms, and one actionable recommendation.

Customer: ${customer.name}
City: ${customer.city}, ${customer.state}
Agent: ${customer.agent_name || 'Direct'}
Type: ${customer.customer_type}
Credit Days: ${customer.credit_days || 0}
Total Sales: ${fmtL(stats?.total)} across ${stats?.bills} bills
Last Order: ${fmtD(stats?.lastDate)}
Total Metres: ${Math.round(stats?.mtrs||0)}m
Designs Bought: ${stats?.designs?.slice(0,8).join(', ')}

Be concise. Plain paragraph only.`
          }]
        })
      });
      const data = await res.json();
      setAI(data.content?.[0]?.text || 'Could not generate summary.');
    } catch(e) { setAI('AI summary unavailable.'); }
    setAIL(false);
  };

  if (!customer) return null;

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0B2E2B 0%,#1a4a45 100%)',padding:'18px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{customer.name}</div>
            {customer.tally_ledger_name && customer.tally_ledger_name !== customer.name &&
              <div style={{fontSize:11,opacity:0.6,marginBottom:6}}>Tally: {customer.tally_ledger_name}</div>}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {customer.customer_type && (
                <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
                  background:'rgba(255,255,255,0.15)',color:'#fff'}}>{customer.customer_type}</span>
              )}
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
                background:customer.status==='active'?'#065F46':'#7F1D1D',color:'#fff'}}>
                {customer.status||'active'}
              </span>
              {customer.tier && <span style={{fontSize:11,opacity:0.7}}>{customer.tier}</span>}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
              width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14,flexShrink:0}}>
            x
          </button>
        </div>
      </div>

      <div style={{padding:'20px 22px'}}>
        {/* Stats Row */}
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            <StatCard label="Total Sales" value={fmtL(stats.total)} sub={`${stats.bills} bills`} color={T.teal}/>
            <StatCard label="Total Metres" value={`${Math.round(stats.mtrs||0).toLocaleString('en-IN')}m`} color={T.blue}/>
            <StatCard label="Last Order" value={fmtD(stats.lastDate)} color={T.navy}/>
            <StatCard label="Designs Bought" value={stats.designs.length} sub="unique designs" color={T.green}/>
          </div>
        )}

        {/* Two column layout */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>Contact & Location</div>
            <InfoRow label="City" value={customer.city}/>
            <InfoRow label="State" value={customer.state}/>
            <InfoRow label="Area" value={customer.area}/>
            <InfoRow label="Pincode" value={customer.pincode}/>
            <InfoRow label="Phone" value={customer.phone}/>
            <InfoRow label="Email" value={customer.email}/>
            <InfoRow label="Billing Address" value={customer.billing_address}/>
            <InfoRow label="Delivery Address" value={customer.delivery_address}/>
            <InfoRow label="Address" value={customer.address}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>Business Info</div>
            <InfoRow label="GST Number" value={customer.gst_number}/>
            <InfoRow label="GST State" value={customer.gst_number ? (SC[customer.gst_number.slice(0,2)] || customer.gst_number.slice(0,2)) : null}/>
            <InfoRow label="Agent" value={customer.agent_name}/>
            <InfoRow label="Credit Days" value={customer.credit_days>0 ? `${customer.credit_days} days` : null}/>
            <InfoRow label="Credit Limit" value={customer.credit_limit>0 ? fmt(customer.credit_limit) : null}/>
            <InfoRow label="Payment Terms" value={customer.payment_terms}/>
            <InfoRow label="Customer Type" value={customer.customer_type}/>
            <InfoRow label="Transporter" value={customer.transporter_name}/>
            <InfoRow label="Notes" value={customer.notes}/>
          </div>
        </div>

        {/* Recent Bills */}
        {bills.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',
              textTransform:'uppercase',marginBottom:8}}>Recent Bills</div>
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
                      <td style={{padding:'6px 10px'}}>{b.quantity_mtrs ? `${Number(b.quantity_mtrs).toFixed(0)}m` : '\u2014'}</td>
                      <td style={{padding:'6px 10px',fontWeight:600}}>{fmt(b.total_amount)}</td>
                      <td style={{padding:'6px 10px',color:T.muted,fontFamily:'monospace',fontSize:11}}>{b.design_no||'\u2014'}</td>
                      <td style={{padding:'6px 10px'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,
                          background:b.status==='paid'?'#D1FAE5':'#FEF3C7',
                          color:b.status==='paid'?'#065F46':'#92400E'}}>
                          {b.status||'\u2014'}
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
              [AI] AI Business Summary
            </div>
            {!aiSummary && (
              <button onClick={getAI} disabled={aiLoading || !stats}
                style={{padding:'5px 12px',background:T.teal,color:'#fff',border:'none',
                  borderRadius:6,fontSize:11,fontWeight:700,cursor:aiLoading?'wait':'pointer',
                  opacity:(!stats||aiLoading)?0.6:1}}>
                {aiLoading ? 'Analysing...' : 'Generate Analysis'}
              </button>
            )}
          </div>
          {aiSummary
            ? <p style={{margin:0,fontSize:12,color:'#0C4A6E',lineHeight:1.6}}>{aiSummary}</p>
            : <p style={{margin:0,fontSize:11,color:'#64748B',fontStyle:'italic'}}>
                Click "Generate Analysis" for an AI-powered business summary of this customer.
              </p>
          }
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <a href={`/admin/reports/party-ledger?party=${encodeURIComponent(customer.tally_ledger_name||customer.name)}`}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none'}}>
            [Ledger] Full Ledger
          </a>
          <a href={`/admin/smart-outstanding?search=${encodeURIComponent(customer.name)}`}
            style={{padding:'8px 16px',background:'#EEF8F6',color:T.navy,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none'}}>
            [Pay] Outstanding
          </a>
          <a href={`/admin/accounting/sales-bills?customer=${encodeURIComponent(customer.name)}`}
            style={{padding:'8px 16px',background:'#EEF8F6',color:T.navy,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none'}}>
            [Bills] All Bills
          </a>
        </div>
      </div>
    </div>
  );
}

// --- AGENT PROFILE PANEL ---
function AgentProfile({ agent, custCounts, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!agent) return;
    const name = agent.agent_name || agent.name;
    supabase.from('sales_bills')
      .select('total_amount,bill_date,commission_amount,comm_amount')
      .eq('agent_name', name)
      .then(({ data }) => {
        const rows = data || [];
        const total = rows.reduce((s,r) => s+Number(r.total_amount||0), 0);
        const comm  = rows.reduce((s,r) => s+Number(r.comm_amount||r.commission_amount||0), 0);
        const sorted = [...rows].sort((a,b)=>b.bill_date>a.bill_date?1:-1);
        setStats({ total, comm, bills: rows.length, lastDate: sorted[0]?.bill_date });
      });
  }, [agent]);

  if (!agent) return null;

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(135deg,#0B2E2B 0%,#1a4a45 100%)',padding:'18px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{agent.agent_name||agent.name}</div>
            <div style={{fontSize:12,opacity:0.7}}>{agent.city}{agent.state?', '+agent.state:''}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
            width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14}}>x</button>
        </div>
      </div>
      <div style={{padding:'20px 22px'}}>
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            <StatCard label="Total Sales" value={fmtL(stats.total)} sub={`${stats.bills} bills`} color={T.teal}/>
            <StatCard label="Commission" value={fmtL(stats.comm)} color={T.green}/>
            <StatCard label="Customers" value={custCounts[agent.agent_name||agent.name]||0} color={T.blue}/>
            <StatCard label="Last Sale" value={fmtD(stats.lastDate)} color={T.navy}/>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Contact</div>
            <InfoRow label="City" value={agent.city}/>
            <InfoRow label="State" value={agent.state}/>
            <InfoRow label="Phone" value={agent.phone}/>
            <InfoRow label="Email" value={agent.email}/>
            <InfoRow label="Address" value={agent.address}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Commission Info</div>
            <InfoRow label="Commission %" value={agent.commission_percentage ? `${parseFloat(agent.commission_percentage).toFixed(2)}%` : null}/>
            <InfoRow label="Customers Linked" value={String(custCounts[agent.agent_name||agent.name]||0)}/>
            <InfoRow label="Status" value={agent.status}/>
            <InfoRow label="Notes" value={agent.notes}/>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <a href={`/admin/reports/party-ledger?party=${encodeURIComponent(agent.agent_name||agent.name)}`}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none'}}>
            [Ledger] Full Ledger
          </a>
        </div>
      </div>
    </div>
  );
}

// --- SUPPLIER PROFILE PANEL ---
function SupplierProfile({ supplier, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!supplier) return;
    supabase.from('grey_purchase')
      .select('total_amount,voucher_date,qty_mtrs,purchase_rate')
      .eq('supplier_name', supplier.supplier_name)
      .order('voucher_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const rows = data || [];
        const total   = rows.reduce((s,r)=>s+Number(r.total_amount||0),0);
        const mtrs    = rows.reduce((s,r)=>s+Number(r.qty_mtrs||0),0);
        const rates   = rows.map(r=>Number(r.purchase_rate||0)).filter(r=>r>0);
        const avgRate = rates.length ? rates.reduce((a,b)=>a+b,0)/rates.length : 0;
        setStats({ total, mtrs, bills: rows.length, lastDate: rows[0]?.voucher_date, avgRate });
      });
  }, [supplier]);

  if (!supplier) return null;
  const stateFromGST = gst => gst ? (SC[gst.slice(0,2)] || `State ${gst.slice(0,2)}`) : null;

  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(135deg,#0B2E2B 0%,#1a4a45 100%)',padding:'18px 22px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{supplier.supplier_name}</div>
            {supplier.tally_ledger_name && <div style={{fontSize:11,opacity:0.6}}>Tally: {supplier.tally_ledger_name}</div>}
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',
            width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:14}}>x</button>
        </div>
      </div>
      <div style={{padding:'20px 22px'}}>
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            <StatCard label="Total Purchases" value={fmtL(stats.total)} sub={`${stats.bills} vouchers`} color={T.teal}/>
            <StatCard label="Total Metres" value={`${Math.round(stats.mtrs).toLocaleString('en-IN')}m`} color={T.blue}/>
            <StatCard label="Avg Rate" value={stats.avgRate>0?fmt(stats.avgRate)+'/m':'\u2014'} color={T.green}/>
            <StatCard label="Last Purchase" value={fmtD(stats.lastDate)} color={T.navy}/>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Business Details</div>
            <InfoRow label="GST Number" value={supplier.gst_number}/>
            <InfoRow label="GST State" value={stateFromGST(supplier.gst_number)}/>
            <InfoRow label="City" value={supplier.city}/>
            <InfoRow label="State" value={supplier.state}/>
            <InfoRow label="Phone" value={supplier.phone}/>
            <InfoRow label="Email" value={supplier.email}/>
            <InfoRow label="Address" value={supplier.address}/>
            <InfoRow label="Credit Days" value={supplier.credit_days>0?`${supplier.credit_days} days`:null}/>
            <InfoRow label="Last Purchase Rate" value={supplier.last_purchase_rate>0?fmt(supplier.last_purchase_rate)+'/m':null}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Bank Details</div>
            <InfoRow label="Bank Name" value={supplier.bank_name}/>
            <InfoRow label="Account No" value={supplier.bank_account_number}/>
            <InfoRow label="IFSC" value={supplier.ifsc_code}/>
            <InfoRow label="Account Holder" value={supplier.account_holder_name}/>
            <InfoRow label="Payment Terms" value={supplier.payment_terms}/>
            <InfoRow label="Notes" value={supplier.notes}/>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <a href={`/admin/reports/party-ledger?party=${encodeURIComponent(supplier.supplier_name)}`}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none'}}>
            [Ledger] Full Ledger
          </a>
        </div>
      </div>
    </div>
  );
}

// --- CUSTOMERS TAB ---
function CustomersTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [city, setCity]         = useState('');
  const [cities, setCities]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage]         = useState(0);
  const PAGE = 50;

  useEffect(() => {
    supabase.from('customers').select('city').not('city','is',null)
      .then(({ data }) => setCities([...new Set((data||[]).map(r=>r.city))].sort()));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('customers').select('*').order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    if (city)   q = q.eq('city', city);
    q = q.range(page*PAGE, page*PAGE+PAGE-1);
    const { data } = await q;
    setRows(data||[]);
    setLoading(false);
  }, [search, city, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key:'name', label:'Customer', wrap:true, render: r => (
      <div>
        <div style={{fontWeight:700,color:T.navy}}>{r.name}</div>
        {r.firm_name && <div style={{fontSize:11,color:T.muted}}>{r.firm_name}</div>}
      </div>
    )},
    { key:'location', label:'City / State / Area', render: r => (
      <div style={{fontSize:12}}>
        {r.city && <div style={{fontWeight:600}}>{r.city}{r.state?', '+r.state:''}</div>}
        {r.area && r.area !== r.city && <div style={{color:T.muted,fontSize:11}}>{r.area}</div>}
      </div>
    )},
    { key:'agent_name', label:'Agent', render: r => <span style={{fontSize:12}}>{r.agent_name||'\u2014'}</span> },
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number} /> },
    { key:'customer_type', label:'Type', render: r => (
      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,
        background:'#DBEAFE',color:'#1D4ED8'}}>{r.customer_type||'\u2014'}</span>
    )},
    { key:'credit_days', label:'Credit', render: r => r.credit_days>0?`${r.credit_days}d`:'\u2014' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'\u2014'}</span>
    )},
  ];

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="Search customer name..."
          style={{flex:1,minWidth:180,padding:'8px 12px',border:`1px solid ${T.border}`,
            borderRadius:8,fontSize:13,outline:'none',background:T.surface}}/>
        <select value={city} onChange={e=>{setCity(e.target.value);setPage(0);}}
          style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,background:T.surface,color:T.text}}>
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{background:'#EEF8F6',border:`1px solid ${T.border}`,borderRadius:8,
        padding:'9px 14px',marginBottom:12,fontSize:12,color:T.navy,display:'flex',alignItems:'center',gap:8}}>
        <span>[Map]</span>
        <span><strong>Route Planning:</strong> Filter by city - AI route optimisation coming soon.</span>
      </div>
      <MasterTable columns={columns} rows={rows} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No customers found" />
      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14,alignItems:'center'}}>
        <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
          style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:page===0?'not-allowed':'pointer',fontSize:12,opacity:page===0?0.4:1}}>\u2190 Prev</button>
        <span style={{fontSize:12,color:T.muted}}>Page {page+1} \u00b7 {rows.length} shown</span>
        <button onClick={() => setPage(p=>p+1)} disabled={rows.length<PAGE}
          style={{padding:'5px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:rows.length<PAGE?'not-allowed':'pointer',fontSize:12,opacity:rows.length<PAGE?0.4:1}}>Next \u2192</button>
      </div>
      <CustomerProfile customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// --- AGENTS TAB ---
function AgentsTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [custCounts, setCustCounts] = useState({});

  useEffect(() => {
    supabase.from('customers').select('agent_name').not('agent_name','is',null)
      .then(({ data }) => {
        const c = {};
        (data||[]).forEach(r => { c[r.agent_name]=(c[r.agent_name]||0)+1; });
        setCustCounts(c);
      });
    supabase.from('agents').select('*').order('name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
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
    { key:'commission_percentage', label:'Commission %', render: r => (
      <span style={{fontWeight:700,color:T.green}}>
        {r.commission_percentage ? `${parseFloat(r.commission_percentage).toFixed(2)}%` : '\u2014'}
      </span>
    )},
    { key:'customers', label:'Customers', render: r => (
      <span style={{fontWeight:700,color:T.blue,fontSize:14}}>{custCounts[r.agent_name||r.name]||0}</span>
    )},
    { key:'phone', label:'Phone' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'\u2014'}</span>
    )},
  ];

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agent name..."
        style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
          fontSize:13,outline:'none',background:T.surface,marginBottom:12,boxSizing:'border-box'}}/>
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No agents found" />
      <AgentProfile agent={selected} custCounts={custCounts} onClose={() => setSelected(null)} />
    </div>
  );
}

// --- SUPPLIERS TAB ---
function SuppliersTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from('suppliers').select('*').order('supplier_name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => !search || r.supplier_name?.toLowerCase().includes(search.toLowerCase()));
  const stateFromGST = gst => gst ? (SC[gst.slice(0,2)] || `State ${gst.slice(0,2)}`) : null;

  const columns = [
    { key:'supplier_name', label:'Supplier Name', render: r => <span style={{fontWeight:700,color:T.navy}}>{r.supplier_name}</span> },
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number} /> },
    { key:'city', label:'City / State', render: r => (
      <div style={{fontSize:12}}>
        <div style={{fontWeight:600}}>{r.city || stateFromGST(r.gst_number) || '\u2014'}</div>
        {r.state && <div style={{color:T.muted,fontSize:11}}>{r.state}</div>}
      </div>
    )},
    { key:'last_purchase_rate', label:'Last Rate', render: r => r.last_purchase_rate>0?`${fmt(r.last_purchase_rate)}/m`:'\u2014' },
    { key:'credit_days', label:'Credit', render: r => r.credit_days>0?`${r.credit_days}d`:'\u2014' },
    { key:'bank', label:'Bank', render: r => r.bank_name
      ? <span style={{fontSize:11,fontWeight:700,color:T.green}}>OK {r.bank_name}</span>
      : <span style={{fontSize:11,color:T.muted}}>\u2014</span> },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>{r.status||'\u2014'}</span>
    )},
  ];

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier name..."
        style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,
          fontSize:13,outline:'none',background:T.surface,marginBottom:12,boxSizing:'border-box'}}/>
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected}
        onSelect={r => setSelected(prev => prev?.id===r?.id ? null : r)} emptyMsg="No suppliers found" />
      <SupplierProfile supplier={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// --- TRANSPORTERS TAB ---
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
    { key:'city', label:'City' },
    { key:'phone', label:'Phone', render: r => r.phone || '\u2014' },
    { key:'created_at', label:'Added', render: r => fmtD(r.created_at) },
  ];

  return (
    <div>
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
              style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:T.muted}}>x</button>
          </div>
          <InfoRow label="City" value={selected.city} />
          <InfoRow label="Phone" value={selected.phone} />
          <InfoRow label="Added" value={fmtD(selected.created_at)} />
        </div>
      )}
    </div>
  );
}

// --- MAIN PAGE ---
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
    { id:'customers',    icon:'[C]', label:'Customers',    count:counts.customers },
    { id:'agents',       icon:'[A]', label:'Agents',       count:counts.agents },
    { id:'suppliers',    icon:'[S]', label:'Suppliers',    count:counts.suppliers },
    { id:'transporters', icon:'[T]', label:'Transporters', count:counts.transporters },
  ];

  return (
    <div style={{padding:'24px 28px',background:T.bg,minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:28}}>[M]</span>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:T.navy}}>Party Masters</h1>
          <p style={{margin:0,fontSize:13,color:T.muted}}>
            Customers \u00b7 Agents \u00b7 Suppliers \u00b7 Transporters \u2014 click any row to view full profile
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
