import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const PAGE_SIZE = 50;
const FY_YEARS = [2022, 2023, 2024, 2025, 2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

const fmt = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', blue:'#2468C8',
  gold:'#E8A800', goldLight:'#FFF8E8',
  purple:'#9B59B6', purpleLight:'#F5EFF9',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};

const TYPE_META = {
  Receipt:       { bg:'#D1FAE5', col:'#065F46', icon:'📥', accent:T.green },
  Payment:       { bg:'#FEF3C7', col:'#B45309', icon:'📤', accent:T.orange },
  Contra:        { bg:'#DBEAFE', col:'#1D4ED8', icon:'🔄', accent:T.blue },
  'Credit Note': { bg:'#FCE7F3', col:'#9D174D', icon:'📋', accent:T.purple },
  'Debit Note':  { bg:'#FEE2E2', col:'#991B1B', icon:'📝', accent:T.red },
  Journal:       { bg:'#E0E7FF', col:'#3730A3', icon:'📒', accent:'#4338CA' },
};

function typeChip(vtype) {
  const c = TYPE_META[vtype] || { bg:'#F3F4F6', col:'#374151', icon:'📄' };
  return (
    <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.col,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
      {c.icon} {vtype}
    </span>
  );
}

function InfoRow({label, value, color, mono, bold}) {
  if (!value && value !== 0) return null;
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
      <span style={{color:T.muted,flexShrink:0}}>{label}</span>
      <span style={{color:color||T.text,fontWeight:bold?700:500,fontFamily:mono?'monospace':'inherit',textAlign:'right',wordBreak:'break-word',maxWidth:220}}>
        {value}
      </span>
    </div>
  );
}

export default function FinancialVouchersPage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(fy.from);
  const [dateTo, setDateTo] = useState(fy.to);
  const [typeFilter, setTypeFilter] = useState('');

  const activeFY = FY_YEARS.find(y => dateFrom === `${y}-04-01` && dateTo === `${y+1}-03-31`);

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE_SIZE, to = from + PAGE_SIZE - 1;
    let q = supabase.from('accounting_vouchers')
      .select('*', { count: 'exact' })
      .order('voucher_date', { ascending: false })
      .range(from, to);
    if (dateFrom) q = q.gte('voucher_date', dateFrom);
    if (dateTo) q = q.lte('voucher_date', dateTo);
    if (typeFilter) q = q.eq('voucher_type', typeFilter);
    if (search) q = q.or(`party_name.ilike.%${search}%,voucher_number.ilike.%${search}%,narration.ilike.%${search}%,bank_ledger.ilike.%${search}%,instrument_no.ilike.%${search}%`);
    const { data, error, count } = await q;
    if (!error) { setRows(data || []); setTotalCount(count || 0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, typeFilter, search]);

  useEffect(() => { load(0); }, [load]);

  const setFY = y => { setDateFrom(`${y}-04-01`); setDateTo(`${y+1}-03-31`); };

  // Page-level KPIs
  const kpi = type => rows.filter(v => v.voucher_type === type).reduce((s,v) => s + Number(v.total_amount||0), 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportCSV = () => {
    const hdr = ['Voucher No','Date','Type','Party','Dr Ledger','Cr Ledger','Amount','Bank','Mode','Cheque No','IFSC','Narration'];
    const csv = rows.map(r => [r.voucher_number,r.voucher_date,r.voucher_type,r.party_name,r.dr_ledger,r.cr_ledger,r.total_amount,r.bank_ledger,r.payment_mode,r.instrument_no,r.ifsc_code,r.narration].map(v=>`"${v||''}"`).join(','));
    const blob = new Blob([[hdr.join(','),...csv].join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `AccountingVouchers_${dateFrom}_to_${dateTo}.csv`; a.click();
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh'}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.navy},#143F3C)`,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#fff',margin:0,display:'flex',alignItems:'center',gap:8}}>
            💰 Accounting Vouchers — Tally Daybook
          </h1>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.55)',margin:'4px 0 0'}}>
            Receipts · Payments · Contras · Journals · Credit Notes · Debit Notes — 100% Tally fields
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportCSV} style={{padding:'8px 14px',background:T.green,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>📥 CSV</button>
          <button onClick={()=>load(page)} style={{padding:'8px 14px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>🔄 Refresh</button>
          <button onClick={()=>navigate(-1)} style={{padding:'8px 14px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>← Back</button>
        </div>
      </div>

      <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPI Row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
          {[
            {label:'Receipts',     val:fmt(kpi('Receipt')),      color:T.green,  icon:'📥'},
            {label:'Payments',     val:fmt(kpi('Payment')),      color:T.orange, icon:'📤'},
            {label:'Contras',      val:fmt(kpi('Contra')),       color:T.blue,   icon:'🔄'},
            {label:'Journals',     val:fmt(kpi('Journal')),      color:'#4338CA', icon:'📒'},
            {label:'Credit Notes', val:fmt(kpi('Credit Note')),  color:T.purple, icon:'📋'},
            {label:'Debit Notes',  val:fmt(kpi('Debit Note')),   color:T.red,    icon:'📝'},
          ].map((c,i) => (
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 14px',position:'relative',overflow:'hidden',cursor:'pointer'}}
              onClick={()=>{setTypeFilter(typeFilter===Object.keys(TYPE_META)[i]?'':Object.keys(TYPE_META)[i]);setPage(0);}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>{c.icon} {c.label}</div>
              <div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* FY + Filters */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{display:'flex',gap:4,marginBottom:12,background:T.bg,padding:'4px',borderRadius:8,border:`1px solid ${T.border}`,width:'fit-content'}}>
            {FY_YEARS.map(y => (
              <button key={y} onClick={()=>setFY(y)}
                style={{padding:'5px 11px',fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:6,border:'none',transition:'all .15s',
                  background:activeFY===y?T.teal:'transparent',color:activeFY===y?'#fff':T.muted}}>
                FY {y.toString().slice(2)}-{(y+1).toString().slice(2)}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:'2 1 200px'}}>
              <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Search</div>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Party, voucher no, bank, cheque no…"
                style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>From</div>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>To</div>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Type</div>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,background:'#fff',outline:'none',minWidth:130}}>
                <option value="">All Types</option>
                {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{totalCount.toLocaleString('en-IN')} vouchers</span>
            <span style={{fontSize:12,color:T.teal,fontWeight:700}}>Page {page+1}/{totalPages||1}</span>
          </div>

          {loading ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>
              <div style={{fontSize:36,marginBottom:8}}>💰</div>
              <div>No accounting vouchers found. Run SQL migration, then sync from Tally.</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                <thead>
                  <tr style={{background:T.bg}}>
                    {['Voucher No','Date','Type','Party / Ledger','Dr → Cr','Bank / Mode','Amount','Cheque / Ref',''].map(h => (
                      <th key={h} style={{padding:'10px 12px',textAlign:h==='Amount'?'right':'left',fontWeight:700,color:T.muted,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',fontSize:10.5,textTransform:'uppercase',letterSpacing:.4}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v, i) => {
                    const isExp = expanded === v.id;
                    const tm = TYPE_META[v.voucher_type] || {};
                    const bills = Array.isArray(v.bill_allocations) ? v.bill_allocations : [];
                    const ledgers = Array.isArray(v.ledger_entries) ? v.ledger_entries : [];

                    return (<>
                      <tr key={v.id} onClick={()=>setExpanded(isExp?null:v.id)}
                        style={{borderBottom:`1px solid ${isExp?T.teal:T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer',transition:'background .12s'}}>
                        <td style={{padding:'9px 12px',fontWeight:700,color:T.blue,fontFamily:'monospace',whiteSpace:'nowrap'}}>{v.voucher_number}</td>
                        <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(v.voucher_date)}</td>
                        <td style={{padding:'9px 12px'}}>{typeChip(v.voucher_type)}</td>
                        <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.party_name||v.dr_ledger||'—'}</td>
                        <td style={{padding:'9px 12px',fontSize:11,color:T.muted}}>
                          <span style={{color:T.red,fontWeight:600}}>{v.dr_ledger?.substring(0,20)||'—'}</span>
                          <span style={{margin:'0 4px'}}>→</span>
                          <span style={{color:T.green,fontWeight:600}}>{v.cr_ledger?.substring(0,20)||'—'}</span>
                        </td>
                        <td style={{padding:'9px 12px',fontSize:11}}>
                          <div style={{fontWeight:500}}>{v.bank_ledger?.substring(0,22)||'—'}</div>
                          {v.payment_mode && <div style={{fontSize:10,color:T.muted}}>{v.payment_mode}{v.transfer_mode?` / ${v.transfer_mode}`:''}</div>}
                        </td>
                        <td style={{padding:'9px 12px',textAlign:'right',fontWeight:800,color:tm.accent||T.text,fontFamily:"'DM Mono',monospace"}}>{fmt(v.total_amount)}</td>
                        <td style={{padding:'9px 12px',fontSize:11}}>
                          {v.instrument_no ? (
                            <span style={{padding:'2px 8px',borderRadius:4,background:'#DBEAFE',color:'#1D4ED8',fontWeight:700,fontFamily:'monospace',fontSize:10}}>
                              #{v.instrument_no}
                            </span>
                          ) : v.urn ? (
                            <span style={{fontSize:10,color:T.muted,fontFamily:'monospace'}}>{v.urn.substring(0,12)}…</span>
                          ) : '—'}
                        </td>
                        <td style={{padding:'9px 12px',textAlign:'center',color:T.teal,fontWeight:700}}>{isExp?'▲':'▼'}</td>
                      </tr>

                      {/* ── Expanded Tally-Replica Detail ── */}
                      {isExp && (
                        <tr key={`${v.id}-exp`}>
                          <td colSpan={9} style={{padding:0,background:'#F8FFFE',borderBottom:`2px solid ${T.teal}`}}>
                            <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

                              {/* Col 1: Voucher Info */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.teal,textTransform:'uppercase',marginBottom:10,letterSpacing:.5}}>
                                  📄 Voucher Details
                                </div>
                                <InfoRow label="Voucher No" value={v.voucher_number} mono bold />
                                <InfoRow label="Type" value={v.voucher_type} />
                                <InfoRow label="Date" value={fmtD(v.voucher_date)} />
                                <InfoRow label="Party Name" value={v.party_name} bold />
                                <InfoRow label="Entered By" value={v.entered_by} />
                                <InfoRow label="Dr Ledger" value={v.dr_ledger} color={T.red} />
                                <InfoRow label="Dr Amount" value={fmt(v.dr_amount)} color={T.red} mono />
                                <InfoRow label="Cr Ledger" value={v.cr_ledger} color={T.green} />
                                <InfoRow label="Cr Amount" value={fmt(v.cr_amount)} color={T.green} mono />
                                <InfoRow label="Total Amount" value={fmt(v.total_amount)} bold color={T.gold} mono />
                                <InfoRow label="Narration" value={v.narration} />
                              </div>

                              {/* Col 2: Bank / Instrument Details */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.orange,textTransform:'uppercase',marginBottom:10,letterSpacing:.5}}>
                                  🏦 Bank & Instrument
                                </div>
                                <InfoRow label="Bank Ledger" value={v.bank_ledger} bold />
                                <InfoRow label="Payment Mode" value={v.payment_mode} />
                                <InfoRow label="Transfer Mode" value={v.transfer_mode} />
                                <InfoRow label="Cheque / Instrument No" value={v.instrument_no} mono bold color={T.blue} />
                                <InfoRow label="Instrument Date" value={fmtD(v.instrument_date)} />
                                <InfoRow label="Payment Favouring" value={v.payment_favouring} />
                                <InfoRow label="Cheque Cross Comment" value={v.cheque_cross_comment} />
                                <InfoRow label="URN" value={v.urn} mono />
                                <InfoRow label="Advice Status" value={v.advice_status} />
                                <InfoRow label="IFSC Code" value={v.ifsc_code} mono bold color={T.blue} />
                                <InfoRow label="Bank Name" value={v.bank_name} />
                                <InfoRow label="Account Number" value={v.account_number} mono />

                                {!v.bank_ledger && !v.payment_mode && !v.instrument_no && (
                                  <div style={{color:T.muted,fontSize:12,padding:'8px 0'}}>No bank/instrument details for this voucher</div>
                                )}
                              </div>

                              {/* Col 3: Bill Settlements + Ledger Entries */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.purple,textTransform:'uppercase',marginBottom:10,letterSpacing:.5}}>
                                  📑 Bill Settlements ({bills.length})
                                </div>
                                {bills.length > 0 ? (
                                  <>
                                    <div style={{display:'grid',gridTemplateColumns:'1fr 80px 100px',gap:4,padding:'4px 0',borderBottom:`2px solid ${T.purple}`,marginBottom:4}}>
                                      <div style={{fontSize:9,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4}}>Bill / Invoice Ref</div>
                                      <div style={{fontSize:9,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4,textAlign:'center'}}>Type</div>
                                      <div style={{fontSize:9,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4,textAlign:'right'}}>Amount</div>
                                    </div>
                                    <div style={{maxHeight:200,overflowY:'auto'}}>
                                      {bills.map((b,bi) => {
                                        const isNew = (b.bill_type||'').toLowerCase().includes('new');
                                        const isAgst = (b.bill_type||'').toLowerCase().includes('agst')||(b.bill_type||'').toLowerCase().includes('against');
                                        const amt = Number(b.amount||0);
                                        return (
                                          <div key={bi} style={{display:'grid',gridTemplateColumns:'1fr 80px 100px',gap:4,padding:'5px 0',borderBottom:`1px solid ${T.border}`,alignItems:'center'}}>
                                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:T.blue,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={b.name}>
                                              {b.name||'—'}
                                            </div>
                                            <div style={{textAlign:'center'}}>
                                              <span style={{padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:700,
                                                background:isNew?T.greenLight:isAgst?T.blueLight:'#F3F4F6',
                                                color:isNew?T.green:isAgst?T.blue:T.textMuted,whiteSpace:'nowrap'}}>
                                                {b.bill_type||'—'}
                                              </span>
                                            </div>
                                            <div style={{textAlign:'right',fontWeight:700,color:amt<0?T.red:T.green,fontFamily:"'DM Mono',monospace",fontSize:12}}>
                                              {amt<0?'(-)':''}{fmt(Math.abs(amt))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:`2px solid ${T.border}`,marginTop:4}}>
                                      <span style={{fontSize:11,fontWeight:700,color:T.text}}>Total Settled</span>
                                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,color:T.gold,fontSize:13}}>
                                        {fmt(Math.abs(bills.reduce((s,b)=>s+Number(b.amount||0),0)))}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{color:T.textMuted,fontSize:12,padding:'8px 0'}}>No bill allocations recorded</div>
                                )}

                                <div style={{fontSize:11,fontWeight:800,color:T.blue,textTransform:'uppercase',marginTop:14,marginBottom:8,letterSpacing:.5}}>
                                  📊 Ledger Entries ({ledgers.length})
                                </div>
                                {ledgers.length > 0 ? (
                                  <div style={{maxHeight:150,overflowY:'auto'}}>
                                    {ledgers.map((l,li) => (
                                      <div key={li} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:11.5,gap:6}}>
                                        <span style={{color:l.ispartyledger?T.text:T.textMuted,fontWeight:l.ispartyledger?700:400,flexShrink:0,maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={l.ledgername}>
                                          {l.ledgername||'—'}
                                        </span>
                                        <span style={{fontWeight:600,color:Number(l.amount||0)<0?T.red:T.green,fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>
                                          {Number(l.amount||0)<0?'(-) ':''}{fmt(Math.abs(Number(l.amount||0)))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{color:T.textMuted,fontSize:12}}>No ledger entries</div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </>);
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:`1px solid ${T.border}`}}>
              <span style={{fontSize:12,color:T.muted}}>
                {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)} of {totalCount.toLocaleString('en-IN')}
              </span>
              <div style={{display:'flex',gap:6}}>
                {[
                  {lbl:'«', pg:0, dis:page===0},
                  {lbl:'‹ Prev', pg:page-1, dis:page===0},
                  {lbl:`${page+1}/${totalPages}`, pg:null, dis:true, active:true},
                  {lbl:'Next ›', pg:page+1, dis:page>=totalPages-1},
                  {lbl:'»', pg:totalPages-1, dis:page>=totalPages-1},
                ].map((b,i) => (
                  <button key={i} disabled={b.dis && !b.active} onClick={b.pg!==null?()=>load(b.pg):undefined}
                    style={{padding:'6px 12px',borderRadius:8,border:'none',fontWeight:700,fontSize:12,cursor:b.dis&&!b.active?'not-allowed':'pointer',
                      background:b.active?T.teal:b.dis?'#f1f5f9':T.greenLight,
                      color:b.active?'#fff':b.dis?'#aaa':T.green}}>
                    {b.lbl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{fontSize:11,color:T.muted,textAlign:'center'}}>
          Click any row for full Tally detail — Bank, Cheque, IFSC, Bill Settlements, Dr/Cr Ledgers
        </div>
      </div>
    </div>
  );
}
