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

const fmtAmt = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:`₹${Math.round(v).toLocaleString('en-IN')}`; };
const fmtN = (n,d=1) => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:d});
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', blue:'#2468C8',
  gold:'#E8A800', goldLight:'#FFF8E8',
  purple:'#9B59B6', purpleLight:'#F5EFF9',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const TYPE_COLORS = {
  Receipt:      { bg:'#D1FAE5', col:'#065F46', icon:'📥' },
  Payment:      { bg:'#FEF3C7', col:'#B45309', icon:'📤' },
  Contra:       { bg:'#DBEAFE', col:'#1D4ED8', icon:'🔄' },
  'Credit Note': { bg:'#FCE7F3', col:'#9D174D', icon:'📋' },
  'Debit Note':  { bg:'#FEE2E2', col:'#991B1B', icon:'📝' },
  Journal:      { bg:'#E0E7FF', col:'#3730A3', icon:'📒' },
};

function typeChip(vtype) {
  const c = TYPE_COLORS[vtype] || { bg:'#F3F4F6', col:'#374151', icon:'📄' };
  return (
    <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.col,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
      {c.icon} {vtype}
    </span>
  );
}

export default function FinancialVouchersPage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(fy.from);
  const [dateTo, setDateTo] = useState(fy.to);
  const [typeFilter, setTypeFilter] = useState('');

  const activeFY = FY_YEARS.find(y => dateFrom === `${y}-04-01` && dateTo === `${y+1}-03-31`);

  const fetchVouchers = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase.from('financial_vouchers')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (dateFrom) q = q.gte('date', dateFrom);
    if (dateTo) q = q.lte('date', dateTo);
    if (typeFilter) q = q.eq('voucher_type', typeFilter);
    if (search) q = q.or(`party_name.ilike.%${search}%,voucher_number.ilike.%${search}%,narration.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (!error) { setVouchers(data || []); setTotalCount(count || 0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, typeFilter, search]);

  useEffect(() => { fetchVouchers(0); }, [fetchVouchers]);

  // KPIs
  const kpiReceipts = vouchers.filter(v => v.voucher_type === 'Receipt').reduce((s,v) => s + Number(v.amount||0), 0);
  const kpiPayments = vouchers.filter(v => v.voucher_type === 'Payment').reduce((s,v) => s + Number(v.amount||0), 0);
  const kpiContras = vouchers.filter(v => v.voucher_type === 'Contra').reduce((s,v) => s + Number(v.amount||0), 0);
  const kpiNotes = vouchers.filter(v => v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note').reduce((s,v) => s + Number(v.amount||0), 0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const setFY = (y) => { setDateFrom(`${y}-04-01`); setDateTo(`${y+1}-03-31`); setPage(0); };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh'}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.navy},#143F3C)`,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',gap:8}}>
            💰 Financial Vouchers — Daybook View
          </div>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.6)',margin:'4px 0 0'}}>
            Receipts · Payments · Contras · Debit Notes · Credit Notes — Tally synced
          </p>
        </div>
        <button onClick={()=>navigate(-1)} style={{padding:'8px 14px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>
          ← Back
        </button>
      </div>

      <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPI Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            { label:'Receipts (Page)', value: fmtAmt(kpiReceipts), color:T.green, icon:'📥' },
            { label:'Payments (Page)', value: fmtAmt(kpiPayments), color:T.orange, icon:'📤' },
            { label:'Contras (Page)', value: fmtAmt(kpiContras), color:T.blue, icon:'🔄' },
            { label:'Credit/Debit Notes', value: fmtAmt(kpiNotes), color:T.purple, icon:'📋' },
          ].map((c,i) => (
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{c.icon} {c.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          {/* FY Buttons */}
          <div style={{display:'flex',gap:4,marginBottom:12,background:T.bg,padding:'4px',borderRadius:8,border:`1px solid ${T.border}`,width:'fit-content'}}>
            {FY_YEARS.map(y => (
              <button key={y} onClick={()=>setFY(y)}
                style={{padding:'5px 11px',fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:6,border:'none',transition:'all .15s',
                  background:activeFY===y?T.teal:'transparent',color:activeFY===y?'#fff':T.textMuted}}>
                FY {y.toString().slice(2)}-{(y+1).toString().slice(2)}
              </button>
            ))}
          </div>

          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:'2 1 200px'}}>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Search</div>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
                placeholder="Party name, voucher no, narration…"
                style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>From</div>
              <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(0);}}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>To</div>
              <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(0);}}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Type</div>
              <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(0);}}
                style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,background:'#fff',outline:'none',minWidth:130}}>
                <option value="">All Types</option>
                {['Receipt','Payment','Contra','Credit Note','Debit Note','Journal'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>fetchVouchers(0)} style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>Apply</button>
              <button onClick={()=>{setSearch('');setTypeFilter('');setDateFrom(fy.from);setDateTo(fy.to);setPage(0);setTimeout(()=>fetchVouchers(0),0);}}
                style={{padding:'8px 14px',background:'#f1f5f9',color:T.text,border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>Reset</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{totalCount.toLocaleString('en-IN')} total vouchers</span>
            <span style={{fontSize:12,color:T.teal,fontWeight:700}}>Page {page+1} of {totalPages || 1}</span>
          </div>

          {loading ? (
            <div style={{padding:40,textAlign:'center',color:T.textMuted}}>Loading vouchers…</div>
          ) : vouchers.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:T.textMuted}}>
              <div style={{fontSize:36,marginBottom:8}}>💰</div>
              <div>No financial vouchers found. Run the SQL migration first, then sync from Tally.</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:T.bg}}>
                    {['Voucher No','Date','Type','Party Name','Amount','Narration',''].map(h => (
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:T.text,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',fontSize:11,textTransform:'uppercase',letterSpacing:.4}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v, i) => {
                    const isExp = expanded === v.id;
                    const ledgers = Array.isArray(v.ledger_entries) ? v.ledger_entries : [];
                    const inst = v.instrument_details || {};
                    return (
                      <>
                        <tr key={v.id} onClick={()=>setExpanded(isExp?null:v.id)}
                          style={{borderBottom:`1px solid ${isExp?T.teal:T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer',transition:'background .15s'}}>
                          <td style={{padding:'9px 14px',fontWeight:700,color:T.blue,fontFamily:'monospace',whiteSpace:'nowrap'}}>{v.voucher_number}</td>
                          <td style={{padding:'9px 14px',color:T.textMuted,whiteSpace:'nowrap'}}>{fmtD(v.date)}</td>
                          <td style={{padding:'9px 14px'}}>{typeChip(v.voucher_type)}</td>
                          <td style={{padding:'9px 14px',fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.party_name||'—'}</td>
                          <td style={{padding:'9px 14px',textAlign:'right',fontWeight:800,color:v.voucher_type==='Receipt'?T.green:v.voucher_type==='Payment'?T.orange:T.text,fontFamily:"'DM Mono',monospace"}}>{fmtAmt(v.amount)}</td>
                          <td style={{padding:'9px 14px',color:T.textMuted,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.narration||'—'}</td>
                          <td style={{padding:'9px 14px',textAlign:'center'}}>
                            <span style={{fontSize:12,color:T.teal,fontWeight:700}}>{isExp?'▲':'▼'}</span>
                          </td>
                        </tr>

                        {/* Expanded Detail */}
                        {isExp && (
                          <tr key={`${v.id}-exp`}>
                            <td colSpan={7} style={{padding:0,background:T.tealLight,borderBottom:`2px solid ${T.teal}`}}>
                              <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

                                {/* Voucher Info */}
                                <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                                  <div style={{fontSize:11,fontWeight:700,color:T.teal,textTransform:'uppercase',marginBottom:8}}>Voucher Info</div>
                                  {[
                                    {l:'Voucher No',v:v.voucher_number,mono:true},
                                    {l:'Type',v:v.voucher_type},
                                    {l:'Date',v:fmtD(v.date)},
                                    {l:'Party',v:v.party_name},
                                    {l:'Amount',v:fmtAmt(v.amount),bold:true,color:T.green},
                                    {l:'Narration',v:v.narration},
                                  ].filter(f=>f.v).map((f,i) => (
                                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
                                      <span style={{color:T.textMuted,flexShrink:0}}>{f.l}</span>
                                      <span style={{color:f.color||T.text,fontWeight:f.bold?700:500,fontFamily:f.mono?'monospace':'inherit',textAlign:'right',wordBreak:'break-word'}}>{f.v}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Ledger Entries */}
                                <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                                  <div style={{fontSize:11,fontWeight:700,color:T.purple,textTransform:'uppercase',marginBottom:8}}>Ledger Entries ({ledgers.length})</div>
                                  {ledgers.length > 0 ? ledgers.map((le,i) => (
                                    <div key={i} style={{padding:'5px 0',borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                                      <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                                        <span style={{fontWeight:600,color:T.text}}>{le.ledger_name}</span>
                                        <span style={{fontWeight:700,color:le.is_debit?T.red:T.green,fontFamily:'monospace',whiteSpace:'nowrap'}}>
                                          {le.is_debit?'Dr ':'Cr '}{fmtAmt(le.amount)}
                                        </span>
                                      </div>
                                      {le.bills?.map((b,bi) => (
                                        <div key={bi} style={{fontSize:10,color:T.textMuted,marginLeft:12,marginTop:2}}>
                                          Bill: {b.name} → {fmtAmt(b.amount)}
                                        </div>
                                      ))}
                                    </div>
                                  )) : (
                                    <div style={{color:T.textMuted,fontSize:12}}>No ledger detail available</div>
                                  )}
                                </div>

                                {/* Instrument / Bank Details */}
                                <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                                  <div style={{fontSize:11,fontWeight:700,color:T.orange,textTransform:'uppercase',marginBottom:8}}>Bank / Instrument</div>
                                  {inst && Object.keys(inst).length > 0 ? (
                                    [{l:'Instrument No',v:inst.instrument_no},
                                     {l:'Instrument Date',v:inst.instrument_date},
                                     {l:'Bank Name',v:inst.bank_name},
                                    ].filter(f=>f.v).map((f,i) => (
                                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                                        <span style={{color:T.textMuted}}>{f.l}</span>
                                        <span style={{fontWeight:600,color:T.text}}>{f.v}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{color:T.textMuted,fontSize:12}}>No bank/cheque detail</div>
                                  )}

                                  <div style={{marginTop:16,fontSize:11,fontWeight:700,color:T.blue,textTransform:'uppercase',marginBottom:8}}>Sync Info</div>
                                  {[
                                    {l:'Sync Status',v:v.tally_sync_status},
                                    {l:'Created',v:v.created_at?new Date(v.created_at).toLocaleString('en-IN'):null},
                                  ].filter(f=>f.v).map((f,i) => (
                                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                                      <span style={{color:T.textMuted}}>{f.l}</span>
                                      <span style={{fontWeight:500,color:T.text}}>{f.v}</span>
                                    </div>
                                  ))}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:`1px solid ${T.border}`}}>
              <span style={{fontSize:12,color:T.textMuted}}>
                {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)} of {totalCount.toLocaleString('en-IN')}
              </span>
              <div style={{display:'flex',gap:6}}>
                <button disabled={page===0} onClick={()=>fetchVouchers(0)}
                  style={{padding:'6px 12px',borderRadius:8,border:'none',background:page===0?'#f1f5f9':T.greenLight,color:page===0?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page===0?'not-allowed':'pointer'}}>«</button>
                <button disabled={page===0} onClick={()=>fetchVouchers(page-1)}
                  style={{padding:'6px 14px',borderRadius:8,border:'none',background:page===0?'#f1f5f9':T.greenLight,color:page===0?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page===0?'not-allowed':'pointer'}}>‹ Prev</button>
                <span style={{padding:'6px 14px',background:T.teal,color:'#fff',borderRadius:8,fontSize:12,fontWeight:700}}>
                  {page+1} / {totalPages}
                </span>
                <button disabled={page>=totalPages-1} onClick={()=>fetchVouchers(page+1)}
                  style={{padding:'6px 14px',borderRadius:8,border:'none',background:page>=totalPages-1?'#f1f5f9':T.greenLight,color:page>=totalPages-1?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page>=totalPages-1?'not-allowed':'pointer'}}>Next ›</button>
                <button disabled={page>=totalPages-1} onClick={()=>fetchVouchers(totalPages-1)}
                  style={{padding:'6px 14px',borderRadius:8,border:'none',background:page>=totalPages-1?'#f1f5f9':T.greenLight,color:page>=totalPages-1?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page>=totalPages-1?'not-allowed':'pointer'}}>»</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
