import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', gold:'#E8A800', green:'#1E9E5A', red:'#E74C3C', blue:'#2468C8', navy:'#0B2E2B', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };

const WhatsAppDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ messages: 0, conversations: 0, unread: 0, botActive: true });

  useEffect(() => {
    const loadStats = async () => {
      const [msgsRes, convRes] = await Promise.all([
        supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
        supabase.from('whatsapp_conversations').select('id,status', { count: 'exact' })
      ]);
      setStats(s => ({
        ...s,
        messages: msgsRes.count || 0,
        conversations: convRes.count || 0,
      }));
    };
    loadStats();

    const ch = supabase.channel('wa-dash')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, () => loadStats())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const cards = [
    { icon: '💬', label: 'WhatsApp Inbox', sub: 'Live conversations', path: '/admin/whatsapp-inbox', color: '#25D366', stat: stats.conversations + ' active' },
    { icon: '🤖', label: 'WhatsApp Bot', sub: 'AI bot settings & logs', path: '/admin/whatsapp-bot', color: T.teal, stat: stats.botActive ? '● Active' : '○ Inactive' },
    { icon: '📣', label: 'Broadcast', sub: 'Mass messaging campaigns', path: '/admin/whatsapp-broadcast', color: T.blue, stat: '7,756 customers' },
    { icon: '📊', label: 'Analytics', sub: 'Delivery & engagement stats', path: '/admin/whatsapp-analytics', color: T.gold, stat: stats.messages + ' msgs today' },
  ];

  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: 24 }}>
      <Helmet><title>WhatsApp — Shreerang</title></Helmet>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: T.navy, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>💬</span> WhatsApp Business
          <span style={{ fontSize: 12, background: '#25D366', color: '#fff', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>LIVE</span>
        </h1>
        <p style={{ color: T.muted, fontSize: 14, margin: '6px 0 0' }}>Shreerang Trendz — +91 78742 00033</p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: '📥', label: "Today's Messages", value: stats.messages, color: T.teal },
          { icon: '🗣️', label: 'Active Conversations', value: stats.conversations, color: T.green },
          { icon: '🤖', label: 'Bot Status', value: 'Active', color: '#25D366' },
          { icon: '👥', label: 'Customer Base', value: '7,756', color: T.blue },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 12, padding: '14px 18px', border: `1px solid ${T.border}`, flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => navigate(c.path)}
            style={{ background: T.surface, borderRadius: 14, padding: 20, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{c.sub}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.color }}>{c.stat}</div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ background: c.color + '15', color: c.color, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>Open →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: T.surface, borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, margin: '0 0 14px' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '📩 Open Inbox', path: '/admin/whatsapp-inbox', color: '#25D366' },
            { label: '📣 New Broadcast', path: '/admin/whatsapp-broadcast', color: T.blue },
            { label: '📊 View Analytics', path: '/admin/whatsapp-analytics', color: T.gold },
            { label: '⚙️ Bot Settings', path: '/admin/whatsapp-bot', color: T.teal },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: a.color, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
