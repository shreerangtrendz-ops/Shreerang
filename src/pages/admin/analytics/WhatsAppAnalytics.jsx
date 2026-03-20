import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', gold:'#E8A800', green:'#1E9E5A', red:'#E74C3C', blue:'#2468C8', navy:'#0B2E2B', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };

function StatCard({ icon, label, value, sub, color = T.teal }) {
  return (
    <div style={{ background: T.surface, borderRadius: 12, padding: '16px 20px', border: `1px solid ${T.border}`, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: T.text }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ background: T.border, borderRadius: 4, height: 6 }}>
        <div style={{ background: color, borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

const WhatsAppAnalytics = () => {
  const [stats, setStats] = useState({ total: 0, inbound: 0, outbound: 0, conversations: 0, leads: 0, delivered: 0, read: 0 });
  const [daily, setDaily] = useState([]);
  const [topContacts, setTopContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - period * 86400000).toISOString();

    const [msgsRes, convRes, leadsRes] = await Promise.all([
      supabase.from('whatsapp_messages').select('direction,status,created_at').gte('created_at', since),
      supabase.from('whatsapp_conversations').select('id,customer_name,phone_number,last_message_at').order('last_message_at', { ascending: false }).limit(10),
      supabase.from('user_profiles').select('id').eq('status', 'active').gte('created_at', since)
    ]);

    const msgs = msgsRes.data || [];
    const inbound = msgs.filter(m => m.direction === 'incoming').length;
    const outbound = msgs.filter(m => m.direction === 'outgoing').length;
    const delivered = msgs.filter(m => m.status === 'delivered' || m.status === 'read').length;
    const read = msgs.filter(m => m.status === 'read').length;

    // Daily breakdown
    const dayMap = {};
    msgs.forEach(m => {
      const day = m.created_at?.split('T')[0];
      if (!day) return;
      if (!dayMap[day]) dayMap[day] = { in: 0, out: 0 };
      if (m.direction === 'incoming') dayMap[day].in++;
      else dayMap[day].out++;
    });
    const dailyArr = Object.entries(dayMap).sort().slice(-7).map(([date, d]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      in: d.in, out: d.out, total: d.in + d.out
    }));

    setStats({ total: msgs.length, inbound, outbound, conversations: convRes.data?.length || 0, leads: leadsRes.data?.length || 0, delivered, read });
    setDaily(dailyArr);
    setTopContacts(convRes.data || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel('wa-analytics-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, () => loadStats())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadStats]);

  const maxDay = Math.max(...daily.map(d => d.total), 1);

  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: 24 }}>
      <Helmet><title>WhatsApp Analytics — Shreerang</title></Helmet>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.navy, margin: 0 }}>📊 WhatsApp Analytics</h1>
          <p style={{ color: T.muted, fontSize: 13, margin: '4px 0 0' }}>Live message & engagement stats</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: period === d ? T.teal : T.surface, color: period === d ? '#fff' : T.text, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              {d}d
            </button>
          ))}
          <button onClick={loadStats} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: 'pointer', fontSize: 13 }}>
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading analytics...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard icon="💬" label="TOTAL MESSAGES" value={stats.total} sub={`Last ${period} days`} color={T.teal} />
            <StatCard icon="📥" label="RECEIVED" value={stats.inbound} sub="From customers" color={T.green} />
            <StatCard icon="📤" label="SENT" value={stats.outbound} sub="Bot + manual" color={T.blue} />
            <StatCard icon="🤝" label="CONVERSATIONS" value={stats.conversations} sub="Active chats" color={T.gold} />
            <StatCard icon="✅" label="READ RATE" value={stats.total > 0 ? `${Math.round(stats.read/Math.max(stats.outbound,1)*100)}%` : '0%'} sub={`${stats.read} read`} color={T.green} />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Daily Activity */}
            <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, margin: '0 0 16px' }}>📈 Daily Activity</h3>
              {daily.length === 0 ? (
                <p style={{ color: T.muted, fontSize: 13 }}>No data for this period</p>
              ) : (
                daily.map(d => <MiniBar key={d.date} label={d.date} value={d.total} max={maxDay} color={T.teal} />)
              )}
            </div>

            {/* Top Contacts */}
            <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, margin: '0 0 16px' }}>👥 Recent Conversations</h3>
              {topContacts.length === 0 ? (
                <p style={{ color: T.muted, fontSize: 13 }}>No conversations yet</p>
              ) : (
                topContacts.slice(0, 8).map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < topContacts.length-1 ? `1px solid ${T.border}` : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.teal+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.teal }}>
                      {(c.customer_name || c.phone_number || '?').substring(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customer_name || c.phone_number}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted }}>{c.phone_number}</div>
                    </div>
                    <div style={{ fontSize: 10, color: T.muted }}>
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Delivery Stats */}
          <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, margin: '0 0 16px' }}>📬 Message Delivery Stats</h3>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.green }}>{stats.total > 0 ? `${Math.round(stats.delivered/Math.max(stats.outbound,1)*100)}%` : '–'}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Delivery Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.blue }}>{stats.read}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Messages Read</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.teal }}>{stats.delivered}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Delivered</div>
              </div>
              <div style={{ flex: 1 }}>
                <MiniBar label="Delivered" value={stats.delivered} max={Math.max(stats.outbound,1)} color={T.green} />
                <MiniBar label="Read" value={stats.read} max={Math.max(stats.outbound,1)} color={T.blue} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsAppAnalytics;
