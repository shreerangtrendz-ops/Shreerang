import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};

const fmt  = n => n ? '₹' + Math.abs(Math.round(Number(n))).toLocaleString('en-IN') : '—';
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

function GSTBadge({ gst }) {
  if (!gst) return <span style={{color:T.muted,fontSize:12}}>—</span>;
  const clean = gst.trim().toUpperCase();
  const valid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
  const SC = {'01':'J&K','02':'HP','03':'PB','04':'CH','05':'UK','06':'HR','07':'DL','08':'RJ','09':'UP','10':'BR','18':'AS','19':'WB','20':'JH','21':'OD','22':'CG','23':'MP','24':'GJ','27':'MH','29':'KA','30':'GA','32':'KL','33':'TN','36':'TG'};
  const sname = SC[clean.slice(0,2)] || clean.slice(0,2);
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
      <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,
        background:valid?'#D1FAE5':'#FEF3C7',color:valid?'#065F46':'#92400E',
        border:`1px solid ${valid?'#6EE7B7':'#FCD34D'}`}}>
        {valid ? `✓ ${sname}` : '⚠ Invalid'}
      </span>
      <span style={{fontSize:11,color:T.muted,fontFamily:'monospace'}}>{clean}</span>
    </span>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:4,borderBottom:`2px solid ${T.border}`,marginBottom:20}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding:'10px 18px',border:'none',background:'none',cursor:'pointer',
          fontSize:13,fontWeight:active===t.id?700:500,
          color:active===t.id?T.teal:T.muted,
          borderBottom:active===t.id?`2px solid ${T.teal}`:'2px solid transparent',
          marginBottom:-2,transition:'all 0.15s',whiteSpace:'nowrap',
          display:'flex',alignItems:'center',gap:6,
        }}>
          <span>{t.icon}</span><span>{t.label}</span>
          {t.count != null && (
            <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10,
              background:active===t.id?T.teal:T.border,color:active===t.id?'#fff':T.muted}}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, extra }) {
  return (
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder||'Search…'}
        style={{flex:1,minWidth:200,padding:'8px 12px',border:`1px solid ${T.border}`,
          borderRadius:8,fontSize:13,color:T.text,outline:'none',background:T.surface}}/>
      {extra}
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{display:'flex',gap:8,fontSize:12,padding:'4px 0',borderBottom:`1px solid ${T.bg}`}}>
      <span style={{color:T.muted,minWidth:130,flexShrink:0}}>{label}</span>
      <span style={{color:T.text,fontWeight:500,wordBreak:'break-word'}}>{value}</span>
    </div>
  );
}

function MasterTable({ columns, rows, onSelect, selected, loading, emptyMsg }) {
  if (loading) return <div style={{textAlign:'center',padding:'40px 0',color:T.muted,fontSize:13}}>Loading…</div>;
  if (!rows.length) return <div style={{textAlign:'center',padding:'40px 0',color:T.muted,fontSize:13}}>{emptyMsg||'No records found'}</div>;
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:T.tealLight}}>
            {columns.map(c => (
              <th key={c.key} style={{padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,
                color:T.navy,letterSpacing:'0.04em',textTransform:'uppercase',
                borderBottom:`2px solid ${T.border}`,whiteSpace:'nowrap'}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id||i} onClick={() => onSelect(selected?.id===row.id ? null : row)}
              style={{background:selected?.id===row.id?T.tealLight:i%2===0?T.surface:'#F8FCFB',
                cursor:'pointer',transition:'background 0.1s',borderBottom:`1px solid ${T.border}`}}
              onMouseEnter={e => { if(selected?.id!==row.id) e.currentTarget.style.background='#EEF8F6'; }}
              onMouseLeave={e => { if(selected?.id!==row.id) e.currentTarget.style.background=i%2===0?T.surface:'#F8FCFB'; }}>
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

function DetailPanel({ title, subtitle, onClose, children, actions }) {
  return (
    <div style={{marginTop:20,background:T.surface,border:`2px solid ${T.teal}`,borderRadius:12,padding:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:T.navy}}>{title}</h3>
          {subtitle && <div style={{fontSize:11,color:T.muted,marginTop:2}}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:T.muted}}>✕</button>
      </div>
      {children}
      {actions && <div style={{marginTop:12,display:'flex',gap:8}}>{actions}</div>}
    </div>
  );
}

function LedgerBtn({ name }) {
  return (
    <a href={`/admin/reports/party-ledger?party=${encodeURIComponent(name)}`}
      style={{padding:'7px 14px',background:T.teal,color:'#fff',borderRadius:7,fontSize:12,fontWeight:600,textDecoration:'none'}}>
      📒 View Ledger
    </a>
  );
}

// ─── CUSTOMERS TAB ────────────────────────────────────────────────────────────
function CustomersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE = 50;

  useEffect(() => {
    supabase.from('customers').select('city').not('city','is',null)
      .then(({ data }) => setCities([...new Set((data||[]).map(r=>r.city))].sort()));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('customers')
      .select('id,name,firm_name,city,state,area,gst_number,agent_name,tier,credit_limit,credit_days,customer_type,phone,status,tally_ledger_name,billing_address,delivery_address,notes,created_at')
      .order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    if (city)   q = q.eq('city', city);
    q = q.range(page*PAGE, page*PAGE+PAGE-1);
    const { data } = await q;
    setRows(data||[]);
    setLoading(false);
  }, [search, city, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key:'name', label:'Customer Name', render: r => <span style={{fontWeight:600,color:T.navy}}>{r.name}</span> },
    { key:'city', label:'City', render: r => r.city ? `${r.city}${r.state ? ', '+r.state : ''}` : '—' },
    { key:'area', label:'Area' },
    { key:'agent_name', label:'Agent', render: r => r.agent_name || '—' },
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number} /> },
    { key:'customer_type', label:'Type', render: r => (
      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,
        background:r.customer_type==='wholesale'?'#DBEAFE':'#F3E8FF',
        color:r.customer_type==='wholesale'?'#1D4ED8':'#7C3AED'}}>
        {r.customer_type||'—'}
      </span>
    )},
    { key:'credit_days', label:'Credit Days', render: r => r.credit_days>0 ? `${r.credit_days}d` : '—' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>
        {r.status||'—'}
      </span>
    )},
  ];

  return (
    <div>
      <SearchBar value={search} onChange={v=>{setSearch(v);setPage(0);}} placeholder="Search customer name…"
        extra={
          <select value={city} onChange={e=>{setCity(e.target.value);setPage(0);}}
            style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,color:T.text,background:T.surface}}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        }
      />
      <div style={{background:'#EEF8F6',border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 14px',
        marginBottom:16,fontSize:12,color:T.navy,display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:16}}>🗺️</span>
        <span><strong>Route Planning:</strong> Filter by city to see all customers in that area — AI will auto-generate optimised visit routes in a future update.</span>
      </div>
      <MasterTable columns={columns} rows={rows} loading={loading} selected={selected} onSelect={setSelected} emptyMsg="No customers found" />
      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16,alignItems:'center'}}>
        <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
          style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:page===0?'not-allowed':'pointer',color:T.text,fontSize:12,opacity:page===0?0.5:1}}>
          ← Prev
        </button>
        <span style={{fontSize:12,color:T.muted}}>Page {page+1} — {rows.length} records</span>
        <button onClick={() => setPage(p => p+1)} disabled={rows.length<PAGE}
          style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,
            cursor:rows.length<PAGE?'not-allowed':'pointer',color:T.text,fontSize:12,opacity:rows.length<PAGE?0.5:1}}>
          Next →
        </button>
      </div>
      {selected && (
        <DetailPanel
          title={selected.name}
          subtitle={selected.tally_ledger_name && selected.tally_ledger_name !== selected.name ? `Tally: ${selected.tally_ledger_name}` : null}
          onClose={() => setSelected(null)}
          actions={[
            <LedgerBtn key="l" name={selected.name} />,
            <a key="o" href={`/admin/smart-outstanding?search=${encodeURIComponent(selected.name)}`}
              style={{padding:'7px 14px',background:'#EEF8F6',color:T.navy,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,fontWeight:600,textDecoration:'none'}}>
              💰 Outstanding
            </a>
          ]}
        >
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
            <div>
              <DetailRow label="City / State" value={[selected.city,selected.state].filter(Boolean).join(', ')} />
              <DetailRow label="Area" value={selected.area} />
              <DetailRow label="Agent" value={selected.agent_name} />
              <DetailRow label="Customer Type" value={selected.customer_type} />
              <DetailRow label="Tier" value={selected.tier} />
              <DetailRow label="Phone" value={selected.phone} />
            </div>
            <div>
              <DetailRow label="GST Number" value={selected.gst_number} />
              <DetailRow label="Credit Limit" value={selected.credit_limit>0 ? fmt(selected.credit_limit) : null} />
              <DetailRow label="Credit Days" value={selected.credit_days>0 ? `${selected.credit_days} days` : null} />
              <DetailRow label="Billing Address" value={selected.billing_address} />
              <DetailRow label="Delivery Address" value={selected.delivery_address} />
              <DetailRow label="Notes" value={selected.notes} />
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}

// ─── AGENTS TAB ───────────────────────────────────────────────────────────────
function AgentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [custCounts, setCustCounts] = useState({});

  useEffect(() => {
    supabase.from('customers').select('agent_name').not('agent_name','is',null)
      .then(({ data }) => {
        const c = {};
        (data||[]).forEach(r => { c[r.agent_name] = (c[r.agent_name]||0)+1; });
        setCustCounts(c);
      });
    supabase.from('agents').select('*').order('name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.agent_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key:'name', label:'Agent Name', render: r => <span style={{fontWeight:600,color:T.navy}}>{r.agent_name||r.name}</span> },
    { key:'city', label:'City' },
    { key:'commission_percentage', label:'Commission %', render: r => (
      <span style={{fontWeight:700,color:T.green}}>
        {r.commission_percentage ? `${parseFloat(r.commission_percentage).toFixed(2)}%` : '—'}
      </span>
    )},
    { key:'customers', label:'Customers', render: r => (
      <span style={{fontWeight:600,color:T.blue}}>{custCounts[r.agent_name||r.name] || 0}</span>
    )},
    { key:'phone', label:'Phone' },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>
        {r.status||'—'}
      </span>
    )},
  ];

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search agent name…" />
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected} onSelect={setSelected} emptyMsg="No agents found" />
      {selected && (
        <DetailPanel
          title={selected.agent_name||selected.name}
          onClose={() => setSelected(null)}
          actions={[<LedgerBtn key="l" name={selected.agent_name||selected.name} />]}
        >
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
            <div>
              <DetailRow label="City" value={selected.city} />
              <DetailRow label="State" value={selected.state} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Email" value={selected.email} />
            </div>
            <div>
              <DetailRow label="Commission %" value={selected.commission_percentage ? `${parseFloat(selected.commission_percentage).toFixed(2)}%` : null} />
              <DetailRow label="Customers Linked" value={String(custCounts[selected.agent_name||selected.name]||0)} />
              <DetailRow label="Address" value={selected.address} />
              <DetailRow label="Notes" value={selected.notes} />
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}

// ─── SUPPLIERS TAB ────────────────────────────────────────────────────────────
function SuppliersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from('suppliers').select('*').order('supplier_name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => !search || r.supplier_name?.toLowerCase().includes(search.toLowerCase()));
  const SC = {'24':'Gujarat','27':'Maharashtra','29':'Karnataka','07':'Delhi','09':'UP','08':'Rajasthan','19':'West Bengal','33':'Tamil Nadu','32':'Kerala'};
  const stateFromGST = gst => gst ? (SC[gst.slice(0,2)] || `State ${gst.slice(0,2)}`) : null;

  const columns = [
    { key:'supplier_name', label:'Supplier Name', render: r => <span style={{fontWeight:600,color:T.navy}}>{r.supplier_name}</span> },
    { key:'gst_number', label:'GST', render: r => <GSTBadge gst={r.gst_number} /> },
    { key:'city', label:'City', render: r => r.city || (r.gst_number ? stateFromGST(r.gst_number) : '—') },
    { key:'last_purchase_rate', label:'Last Rate', render: r => r.last_purchase_rate>0 ? fmt(r.last_purchase_rate) : '—' },
    { key:'credit_days', label:'Credit Days', render: r => r.credit_days>0 ? `${r.credit_days}d` : '—' },
    { key:'bank', label:'Bank', render: r => r.bank_name
      ? <span style={{fontSize:11,fontWeight:700,color:T.green}}>✓ {r.bank_name}</span>
      : <span style={{fontSize:11,color:T.muted}}>—</span> },
    { key:'status', label:'Status', render: r => (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,
        background:r.status==='active'?'#D1FAE5':'#FEF2F2',
        color:r.status==='active'?'#065F46':'#991B1B'}}>
        {r.status||'—'}
      </span>
    )},
  ];

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search supplier name…" />
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected} onSelect={setSelected} emptyMsg="No suppliers found" />
      {selected && (
        <DetailPanel
          title={selected.supplier_name}
          subtitle={selected.tally_ledger_name ? `Tally: ${selected.tally_ledger_name}` : null}
          onClose={() => setSelected(null)}
          actions={[<LedgerBtn key="l" name={selected.supplier_name} />]}
        >
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
            <div>
              <DetailRow label="GST Number" value={selected.gst_number} />
              <DetailRow label="City" value={selected.city} />
              <DetailRow label="State" value={selected.state} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Credit Days" value={selected.credit_days>0 ? `${selected.credit_days} days` : null} />
              <DetailRow label="Last Purchase Rate" value={selected.last_purchase_rate>0 ? fmt(selected.last_purchase_rate) : null} />
            </div>
            <div>
              <DetailRow label="Bank Name" value={selected.bank_name} />
              <DetailRow label="Account No" value={selected.bank_account_number} />
              <DetailRow label="IFSC" value={selected.ifsc_code} />
              <DetailRow label="Account Holder" value={selected.account_holder_name} />
              <DetailRow label="Payment Terms" value={selected.payment_terms} />
              <DetailRow label="Notes" value={selected.notes} />
            </div>
          </div>
        </DetailPanel>
      )}
    </div>
  );
}

// ─── TRANSPORTERS TAB ─────────────────────────────────────────────────────────
function TransportersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from('transporters').select('*').order('name')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key:'name', label:'Transporter Name', render: r => <span style={{fontWeight:600,color:T.navy}}>{r.name}</span> },
    { key:'city', label:'City' },
    { key:'phone', label:'Phone', render: r => r.phone || '—' },
    { key:'created_at', label:'Added', render: r => fmtD(r.created_at) },
  ];

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search transporter or city…" />
      <MasterTable columns={columns} rows={filtered} loading={loading} selected={selected} onSelect={setSelected} emptyMsg="No transporters found" />
      {selected && (
        <DetailPanel title={selected.name} onClose={() => setSelected(null)}>
          <DetailRow label="City" value={selected.city} />
          <DetailRow label="Phone" value={selected.phone} />
          <DetailRow label="Added" value={fmtD(selected.created_at)} />
        </DetailPanel>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PartyMastersPage() {
  const [activeTab, setActiveTab] = useState('customers');
  const [counts, setCounts] = useState({});

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
    { id:'transporters', icon:'🚚', label:'Transporters', count:counts.transporters },
  ];

  return (
    <div style={{padding:'24px 28px',background:T.bg,minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:28}}>📋</span>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:T.navy}}>Party Masters</h1>
          <p style={{margin:0,fontSize:13,color:T.muted}}>Customers · Agents · Suppliers · Transporters — central reference database</p>
        </div>
      </div>
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:'20px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {activeTab==='customers'    && <CustomersTab />}
        {activeTab==='agents'       && <AgentsTab />}
        {activeTab==='suppliers'    && <SuppliersTab />}
        {activeTab==='transporters' && <TransportersTab />}
      </div>
    </div>
  );
}
