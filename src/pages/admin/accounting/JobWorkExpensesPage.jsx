import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

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
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};

function typeChip(vtype) {
  const isJob = vtype === 'Jobwork';
  return (
    <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,whiteSpace:'nowrap',
      background:isJob?'#DBEAFE':'#FEF3C7',color:isJob?'#1D4ED8':'#B45309'}}>
      {isJob?'🏭':'🚛'} {vtype}
    </span>
  );
}


function ReconBadge({status}) {
  const map = {
    matched:     {label:'Matched',     color:'#1E9E5A', bg:'#E8FFF4'},
    mismatch:    {label:'Mismatch',    color:'#D93025', bg:'#FFF5F5'},
    missing_rec: {label:'Missing REC', color:'#E67E22', bg:'#FFF3E8'},
    pending:     {label:'Pending',     color:'#6A9B95', bg:'#EEF8F6'},
  };
  const s = map[status] || map['pending'];
  return <span style={{padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:700,background:s.bg,color:s.color,letterSpacing:.3}}>{s.label}</span>;
}

function InfoRow({label, value, color, mono, bold}) {
  if (!value && value !== 0) return null;
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
      <span style={{color:T.muted,flexShrink:0}}>{label}</span>
      <span style={{color:color||T.text,fontWeight:bold?700:500,fontFamily:mono?'monospace':'inherit',textAlign:'right',wordBreak:'break-word',maxWidth:220}}>{value}</span>
    </div>
  );
}

export default function JobWorkExpensesPage() {
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
    let q = supabase.from('jobwork_expenses')
      .select('*', { count: 'exact' })
      .order('voucher_date', { ascending: false })
      .range(from, to);
    if (dateFrom) q = q.gte('voucher_date', dateFrom);
    if (dateTo) q = q.lte('voucher_date', dateTo);
    if (typeFilter) q = q.eq('voucher_type', typeFilter);
    if (search) q = q.or(`party_name.ilike.%${search}%,voucher_number.ilike.%${search}%,expense_ledger.ilike.%${search}%,bill_ref.ilike.%${search}%`);
    const { data, error, count } = await q;
    if (!error) { setRows(data || []); setTotalCount(count || 0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, typeFilter, search]);

  useEffect(() => { load(0); }, [load]);
  const setFY = y => { setDateFrom(`${y}-04-01`); setDateTo(`${y+1}-03-31`); };

  const totalJobwork = rows.filter(v => v.voucher_type === 'Jobwork').reduce((s,v) => s + Number(v.total_amount||0), 0);
  const totalExpenses = rows.filter(v => v.voucher_type === 'Expenses').reduce((s,v) => s + Number(v.total_amount||0), 0);
  const totalTDS = rows.reduce((s,v) => s + Number(v.tds_amount||0), 0);
  const totalGST = rows.reduce((s,v) => s + Number(v.cgst_amount||0) + Number(v.sgst_amount||0) + Number(v.igst_amount||0), 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportCSV = () => {
    const hdr = ['Voucher No','Date','Type','Party','GSTIN','Expense Ledger','Amount','TDS','CGST','SGST','IGST','Total','Bill Ref','Narration'];
    const csv = rows.map(r => [r.voucher_number,r.voucher_date,r.voucher_type,r.party_name,r.party_gstin,r.expense_ledger,r.expense_amount,r.tds_amount,r.cgst_amount,r.sgst_amount,r.igst_amount,r.total_amount,r.bill_ref,r.narration].map(v=>`"${v||''}"`).join(','));
    const blob = new Blob([[hdr.join(','),...csv].join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `JobworkExpenses_${dateFrom}_to_${dateTo}.csv`; a.click();
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh'}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#1a3a5c,${T.navy})`,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#fff',margin:0,display:'flex',alignItems:'center',gap:8}}>
            🏭 Jobwork & Expenses
          </h1>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.55)',margin:'4px 0 0'}}>
            Mill Processing Charges · Transport · Misc Expenses — All Tally fields
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportCSV} style={{padding:'8px 14px',background:T.green,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>📥 CSV</button>
          <button onClick={()=>load(page)} style={{padding:'8px 14px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>🔄</button>
          <button onClick={()=>navigate(-1)} style={{padding:'8px 14px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>← Back</button>
        </div>
      </div>

      <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {label:'Jobwork Charges', val:fmt(totalJobwork), color:T.blue, icon:'🏭'},
            {label:'Expenses',        val:fmt(totalExpenses), color:T.orange, icon:'🚛'},
            {label:'TDS Deducted',    val:fmt(totalTDS),      color:T.red,    icon:'📉'},
            {label:'Total GST',       val:fmt(totalGST),      color:T.purple, icon:'📊'},
          ].map((c,i) => (
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
              <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{c.icon} {c.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.val}</div>
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
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Party, voucher no, expense type…"
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
                <option value="">All</option>
                <option value="Jobwork">Jobwork</option>
                <option value="Expenses">Expenses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{totalCount.toLocaleString('en-IN')} entries</span>
            <span style={{fontSize:12,color:T.teal,fontWeight:700}}>Page {page+1}/{totalPages||1}</span>
          </div>

          {loading ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>
              <div style={{fontSize:36,marginBottom:8}}>🏭</div>
              <div>No jobwork/expenses found. Run SQL migration, then sync.</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                <thead>
                  <tr style={{background:T.bg}}>
                    {['Voucher No','Date','Type','Party / Mill','Supplier Inv','Expense Ledger','Amount','TDS','GST','Total','GP No','Recon',''].map(h => (
                      <th key={h} style={{padding:'10px 12px',textAlign:['Amount','TDS','GST','Total'].includes(h)?'right':'left',fontWeight:700,color:T.muted,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',fontSize:10.5,textTransform:'uppercase',letterSpacing:.4}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v, i) => {
                    const isExp = expanded === v.id;
                    const ledgers = Array.isArray(v.ledger_entries) ? v.ledger_entries : [];

                    return (<>
                      <tr key={v.id} onClick={()=>setExpanded(isExp?null:v.id)}
                        style={{borderBottom:`1px solid ${isExp?T.teal:T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                        <td style={{padding:'9px 12px',fontWeight:700,color:T.blue,fontFamily:'monospace',whiteSpace:'nowrap'}}>{v.voucher_number}</td>
                        <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(v.voucher_date)}</td>
                        <td style={{padding:'9px 12px'}}>{typeChip(v.voucher_type)}</td>
                        <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.party_name||'—'}</td>
                        <td style={{padding:'9px 12px',fontSize:11,color:T.orange,fontWeight:600}}>{v.supplier_invoice_no||'—'}</td>
                        <td style={{padding:'9px 12px',fontSize:11,color:T.purple,fontWeight:500}}>{v.expense_ledger||'—'}</td>
                        <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:T.text}}>{fmt(v.expense_amount)}</td>
                        <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontSize:11,color:T.red}}>{v.tds_amount>0?fmt(v.tds_amount):'—'}</td>
                        <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontSize:11,color:T.muted}}>
                          {(Number(v.cgst_amount||0)+Number(v.sgst_amount||0)+Number(v.igst_amount||0))>0?fmt(Number(v.cgst_amount||0)+Number(v.sgst_amount||0)+Number(v.igst_amount||0)):'—'}
                        </td>
                        <td style={{padding:'9px 12px',textAlign:'right',fontWeight:800,color:T.gold,fontFamily:'monospace'}}>{fmt(v.total_amount)}</td>
                        <td style={{padding:'9px 12px',fontSize:11,color:T.blue,fontWeight:600}}>{v.bill_ref||'—'}</td>
                        <td style={{padding:'9px 12px',fontSize:11,color:'#6A9B95',fontFamily:'monospace'}}>{v.gp_number||v.supplier_invoice_no||'—'}</td>
                        <td style={{padding:'9px 12px'}}><ReconBadge status={v.recon_status}/></td>
                        <td style={{padding:'9px 12px',textAlign:'center',color:T.teal,fontWeight:700}}>{isExp?'▲':'▼'}</td>
                      </tr>

                      {isExp && (
                        <tr key={`${v.id}-exp`}>
                          <td colSpan={14} style={{padding:0,background:'#F8FFFE',borderBottom:`2px solid ${T.teal}`}}>
                            <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

                              {/* Col 1: Voucher Info */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.teal,textTransform:'uppercase',marginBottom:10}}>📄 Voucher Info</div>
                                <InfoRow label="Voucher No" value={v.voucher_number} mono bold />
                                <InfoRow label="Type" value={v.voucher_type} />
                                <InfoRow label="Date" value={fmtD(v.voucher_date)} />
                                <InfoRow label="Party / Mill" value={v.party_name} bold />
                                <InfoRow label="GSTIN" value={v.party_gstin} mono />
                                <InfoRow label="GST Reg Type" value={v.gst_reg_type} />
                                <InfoRow label="Place of Supply" value={v.place_of_supply} />
                                <InfoRow label="Entered By" value={v.entered_by} />
                                <InfoRow label="Narration" value={v.narration} />
                              </div>

                              {/* Col 2: Financial Breakdown */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.orange,textTransform:'uppercase',marginBottom:10}}>💰 Financial Detail</div>
                                <InfoRow label="Supplier Invoice No" value={v.supplier_invoice_no} mono bold color={T.orange} />
                                <InfoRow label="Supplier Invoice Date" value={fmtD(v.supplier_invoice_date)} />
                                <InfoRow label="Expense Ledger" value={v.expense_ledger} bold color={T.purple} />
                                <InfoRow label="Expense Amount" value={fmt(v.expense_amount)} mono bold />
                                <InfoRow label="TDS Deducted" value={v.tds_amount>0?fmt(v.tds_amount):null} color={T.red} mono />
                                <InfoRow label="CGST" value={v.cgst_amount>0?fmt(v.cgst_amount):null} mono />
                                <InfoRow label="SGST" value={v.sgst_amount>0?fmt(v.sgst_amount):null} mono />
                                <InfoRow label="IGST" value={v.igst_amount>0?fmt(v.igst_amount):null} mono />
                                <InfoRow label="Round Off" value={v.round_off?fmt(v.round_off):null} mono />
                                <InfoRow label="Party Amount" value={fmt(v.party_amount)} mono />
                                <InfoRow label="Total Amount" value={fmt(v.total_amount)} bold color={T.gold} mono />
                                <InfoRow label="Bill Ref" value={v.bill_ref} bold color={T.blue} />
                                <InfoRow label="GP Number" value={v.gp_number} mono color={T.teal} />
                                <InfoRow label="Recon Status" value={v.recon_status} bold color={v.recon_status==='matched'?'#1E9E5A':v.recon_status==='mismatch'?'#D93025':'#E67E22'} />
                                {v.recon_note&&<div style={{marginTop:4,padding:'5px 8px',background:'#FFF3E8',borderRadius:4,fontSize:11,color:'#E67E22'}}>{v.recon_note}</div>}
                                <InfoRow label="Bill Type" value={v.bill_type} />
                              </div>

                              {/* Col 3: Ledger Entries */}
                              <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                                <div style={{fontSize:11,fontWeight:800,color:T.blue,textTransform:'uppercase',marginBottom:10}}>📊 Ledger Entries ({ledgers.length})</div>
                                {ledgers.length > 0 ? ledgers.map((le,li) => (
                                  <div key={li} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:11.5}}>
                                    <span style={{fontWeight:500,color:T.text,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={le.ledger_name}>{le.ledger_name}</span>
                                    <span style={{fontWeight:700,color:le.is_party?T.green:T.text,fontFamily:'monospace'}}>{fmt(le.amount)}</span>
                                  </div>
                                )) : (
                                  <div style={{color:T.muted,fontSize:12}}>No ledger detail</div>
                                )}

                                <div style={{marginTop:16,fontSize:11,color:T.muted}}>
                                  Sync: <span style={{color:T.green,fontWeight:600}}>{v.tally_sync_status||'synced'}</span>
                                </div>
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
              <span style={{fontSize:12,color:T.muted}}>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)} of {totalCount.toLocaleString('en-IN')}</span>
              <div style={{display:'flex',gap:6}}>
                <button disabled={page===0} onClick={()=>load(page-1)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:page===0?'#f1f5f9':'#D1FAE5',color:page===0?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page===0?'not-allowed':'pointer'}}>‹ Prev</button>
                <span style={{padding:'6px 14px',background:T.teal,color:'#fff',borderRadius:8,fontSize:12,fontWeight:700}}>{page+1}/{totalPages}</span>
                <button disabled={page>=totalPages-1} onClick={()=>load(page+1)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:page>=totalPages-1?'#f1f5f9':'#D1FAE5',color:page>=totalPages-1?'#aaa':T.green,fontWeight:700,fontSize:12,cursor:page>=totalPages-1?'not-allowed':'pointer'}}>Next ›</button>
              </div>
            </div>
          )}
        </div>

        <div style={{fontSize:11,color:T.muted,textAlign:'center'}}>
          Mill Processing Charges · Transport · TDS · GST — Click any row for full breakup
        </div>
      </div>
    </div>
  );
}