import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { syncCustomersFromTally } from '@/services/TallySyncService';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});

export default function AgentCommissionPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [agents, setAgents] = useState([]);
  const [bills, setBills] = useState([]);
  const [commRate, setCommRate] = useState(2); // default 2%
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [selectedAgent, setSelectedAgent] = useState('');
  const [stats, setStats] = useState({totalSales:0, totalComm:0, agentCount:0});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [agentsRes, billsRes] = await Promise.all([
      supabase.from('agents').select('*').order('name'),
      supabase.from('sales_bills').select('*').gte('bill_date', month+'-01').lte('bill_date', month+'-31').order('bill_date', {ascending:false})
    ]);
    const agentList = agentsRes.data || [];
    const billList = billsRes.data || [];
    setAgents(agentList);
    setBills(billList);

    const totalSales = billList.reduce((s,b) => s+(b.total_amount||0), 0);
    setStats({
      totalSales,
      totalComm: totalSales * commRate / 100,
      agentCount: agentList.length,
      billCount: billList.length
    });
    setLoading(false);
  }, [month, commRate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSyncAgents = async () => {
    setSyncing(true);
    try {
      const result = await syncCustomersFromTally();
      await loadData();
      alert(`Agents synced! Found: ${result.agents||0} agents`);
    } catch(e) { alert('Sync failed: '+e.message); }
    setSyncing(false);
  };

  // Calculate per-agent commission from bills (using agent_name field or commission fields)
  const agentBills = {};
  bills.forEach(b => {
    const agent = b.agent_name || b.notes?.match(/agent[:\s]+([^,|]+)/i)?.[1] || 'Unassigned';
    if (!agentBills[agent]) agentBills[agent] = {bills:[], total:0};
    agentBills[agent].bills.push(b);
    agentBills[agent].total += b.total_amount||0;
  });

  const agentRows = Object.entries(agentBills).map(([name, data]) => ({
    name,
    bills: data.bills.length,
    sales: data.total,
    commission: data.total * commRate / 100
  })).sort((a,b) => b.sales-a.sales);

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Agent Commission — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>🏆 Agent Commission</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Monthly sales commission calculation</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={handleSyncAgents} disabled={syncing}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>
            {syncing?'⏳ Syncing...':'🔄 Sync Agents'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{background:T.surface,borderRadius:10,padding:14,border:`1px solid ${T.border}`,marginBottom:20,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>MONTH</div>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>COMMISSION RATE (%)</div>
          <input type="number" value={commRate} onChange={e=>setCommRate(parseFloat(e.target.value)||0)} min={0} max={20} step={0.5}
            style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none',width:80}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.gold,fontWeight:600,marginBottom:2}}>ℹ️ Note</div>
          <div style={{fontSize:12,color:T.muted}}>Commission is calculated as % of total sales. Agent name is pulled from Tally sales voucher data.</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {label:`${month} Sales`,value:fmt(stats.totalSales),color:T.teal,icon:'📦'},
          {label:'Total Commission',value:fmt(stats.totalComm),color:T.gold,icon:'💰'},
          {label:'Agents',value:stats.agentCount||'0',color:T.blue,icon:'👤',sub:'Click "Sync Agents" to import'},
          {label:'Bills',value:stats.billCount||'0',color:T.green,icon:'📋'},
        ].map(s=>(
          <div key={s.label} style={{background:T.surface,borderRadius:12,padding:'14px 18px',border:`1px solid ${T.border}`,flex:1,minWidth:130}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            {s.sub && <div style={{fontSize:10,color:T.muted,marginTop:2}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Agent Commission Table */}
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',marginBottom:20}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700,color:T.navy}}>Commission Breakdown</span>
          <span style={{fontSize:12,color:T.muted}}>{agentRows.length} agents/groups</span>
        </div>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading...</div>
        ) : agentRows.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>🏆</div>
            <div>No sales data for {month}. Sync from Tally first.</div>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['#','Agent','Bills','Sales Amount',`Commission (${commRate}%)','Payable'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentRows.map((row,i)=>(
                <tr key={row.name} style={{background:i%2===0?T.surface:T.bg}}>
                  <td style={{padding:'10px 14px',fontSize:13,color:T.muted}}>{i+1}</td>
                  <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:T.text}}>{row.name}</td>
                  <td style={{padding:'10px 14px',fontSize:13}}>{row.bills}</td>
                  <td style={{padding:'10px 14px',fontSize:14,fontWeight:700,color:T.teal}}>{fmt(row.sales)}</td>
                  <td style={{padding:'10px 14px',fontSize:13,color:T.muted}}>{commRate}%</td>
                  <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:T.gold}}>{fmt(row.commission)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:T.navy}}>
                <td colSpan={3} style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#fff'}}>TOTAL</td>
                <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:'#99F6E4'}}>{fmt(agentRows.reduce((s,r)=>s+r.sales,0))}</td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#fff'}}>—</td>
                <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:'#FDE68A'}}>{fmt(agentRows.reduce((s,r)=>s+r.commission,0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* All Agents Master */}
      {agents.length > 0 && (
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>👤 Agent Master ({agents.length})</h3>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {agents.map(a=>(
              <div key={a.id} style={{background:T.bg,borderRadius:8,padding:'10px 14px',border:`1px solid ${T.border}`,minWidth:160}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>{a.name}</div>
                {a.phone && <div style={{fontSize:11,color:T.muted,marginTop:2}}>📱 {a.phone}</div>}
                {a.state && <div style={{fontSize:11,color:T.muted}}>📍 {a.state}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
