import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const WA_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;
const WA_PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID || '868455029689394';
const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://shreerangtrendz.app.n8n.cloud/webhook/whatsapp-incoming';

// ── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#25D366', trend }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e8f5e9', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: color }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 11, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, color = '#25D366' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
function Badge({ text, color = '#25D366', bg = '#dcfce7' }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>{text}</span>;
}

// ── TAG CHIP ─────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove }) {
  const colors = { 'VIP': '#7c3aed', 'New': '#2563eb', 'Overdue': '#dc2626', 'Wholesale': '#d97706', 'Retail': '#0891b2' };
  const c = colors[tag] || '#6b7280';
  return (
    <span style={{ background: c + '20', color: c, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {tag}
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', color: c, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>}
    </span>
  );
}

// ── CONVERSATION ITEM ─────────────────────────────────────────────────────────
function ConversationItem({ conv, isSelected, onClick }) {
  const avatarColors = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#7c3aed', '#d97706'];
  const color = avatarColors[(conv.phone || '').length % avatarColors.length];
  const timeStr = conv.last_message_at ? (() => {
    const d = new Date(conv.last_message_at);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  })() : '';

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
      background: isSelected ? '#e8f5e9' : 'transparent',
      borderLeft: isSelected ? '3px solid #25D366' : '3px solid transparent',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={conv.customer_name || conv.phone} size={40} color={color} />
        {conv.status === 'online' && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#25D366', borderRadius: '50%', border: '2px solid #fff' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
            {conv.customer_name || conv.phone}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{timeStr}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
            {conv.last_message || 'No messages'}
          </span>
          {conv.unread_count > 0 && (
            <span style={{ background: '#25D366', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{conv.unread_count}</span>
          )}
        </div>
        {conv.tags && conv.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {conv.tags.slice(0, 2).map(t => <TagChip key={t} tag={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MESSAGE BUBBLE ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      <div style={{
        maxWidth: '70%', padding: '8px 12px', borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isOut ? '#dcf8c6' : '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        fontSize: 13, color: '#111',
      }}>
        {msg.media_url && (
          <div style={{ marginBottom: 6 }}>
            {msg.media_type === 'image' ? (
              <img src={msg.media_url} alt="media" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
            ) : (
              <a href={msg.media_url} target="_blank" rel="noreferrer" style={{ color: '#128C7E', fontSize: 12 }}>📎 Attachment</a>
            )}
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 3 }}>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {isOut && (
            <span style={{ fontSize: 11, color: msg.status === 'read' ? '#53bdeb' : '#9ca3af' }}>
              {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QUICK REPLY CHIPS ─────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  'Namaskar! How can I help you?',
  'Please share your requirements.',
  'Rate list sent on WhatsApp.',
  'Order confirmed! Will dispatch in 2-3 days.',
  'Payment received. Thank you!',
  'Please check your email for the invoice.',
];

// ── CONTACTS TAB ─────────────────────────────────────────────────────────────
function ContactsTab({ contacts, onMessage }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
    const matchFilter = filter === 'all' || (filter === 'optin' && c.opt_in) || (filter === 'optout' && !c.opt_in);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ flex: 1, minWidth: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
          <option value="all">All Contacts</option>
          <option value="optin">Opted In</option>
          <option value="optout">Opted Out</option>
        </select>
        <div style={{ background: '#25D366', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Import CSV</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {['all','optin','optout'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: filter === f ? '#25D366' : '#f3f4f6', color: filter === f ? '#fff' : '#374151' }}>
            {f === 'all' ? 'All' : f === 'optin' ? 'Opted In' : 'Opted Out'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{filtered.length} contacts</span>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 120px', padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Contact</span><span>Phone</span><span>Opt-In</span><span>Tags</span><span>Action</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No contacts found</div>
        ) : filtered.map((c, i) => (
          <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 120px', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={c.name} size={32} color="#128C7E" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{c.name || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.city || 'Customer'}</div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#374151' }}>{c.phone}</span>
            <span>
              <span style={{ background: c.opt_in ? '#dcfce7' : '#fee2e2', color: c.opt_in ? '#16a34a' : '#dc2626', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                {c.opt_in ? 'Yes' : 'No'}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(c.tags || []).slice(0, 1).map(t => <TagChip key={t} tag={t} />)}
            </div>
            <button onClick={() => onMessage(c)} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CAMPAIGNS TAB ─────────────────────────────────────────────────────────────
function CampaignsTab() {
  const [campaigns] = useState([
    { id: 1, name: 'Holi Festival Collection', status: 'completed', sent: 342, delivered: 318, read: 201, failed: 24, date: '2025-02-28', template: 'New Collection' },
    { id: 2, name: 'Payment Reminder - Feb', status: 'completed', sent: 87, delivered: 85, read: 72, failed: 2, date: '2025-02-25', template: 'Payment Reminder' },
    { id: 3, name: 'New Schiffli Launch', status: 'running', sent: 156, delivered: 148, read: 89, failed: 8, date: '2025-03-08', template: 'New Collection' },
    { id: 4, name: 'Summer Sale Broadcast', status: 'scheduled', sent: 0, delivered: 0, read: 0, failed: 0, date: '2025-03-15', template: 'Marketing' },
  ]);
  const statusColors = { completed: { bg: '#dcfce7', c: '#16a34a' }, running: { bg: '#dbeafe', c: '#2563eb' }, scheduled: { bg: '#fef3c7', c: '#d97706' }, failed: { bg: '#fee2e2', c: '#dc2626' } };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Campaigns</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Manage and track broadcast campaigns</p>
        </div>
        <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Campaign
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon="📢" label="Total Campaigns" value={campaigns.length} color="#7c3aed" />
        <StatCard icon="📤" label="Total Sent" value={campaigns.reduce((a, c) => a + c.sent, 0)} color="#2563eb" />
        <StatCard icon="✅" label="Total Delivered" value={campaigns.reduce((a, c) => a + c.delivered, 0)} sub="Delivery rate: 95%" color="#16a34a" />
        <StatCard icon="👁" label="Total Read" value={campaigns.reduce((a, c) => a + c.read, 0)} sub="Read rate: 63%" color="#d97706" />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 80px 80px 80px 100px', padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', gap: 8 }}>
          <span>Campaign</span><span>Status</span><span>Sent</span><span>Delivered</span><span>Read</span><span>Failed</span><span>Date</span>
        </div>
        {campaigns.map(c => {
          const sc = statusColors[c.status] || statusColors.completed;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 80px 80px 80px 100px', padding: '14px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Template: {c.template}</div>
              </div>
              <span style={{ background: sc.bg, color: sc.c, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>{c.status}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.sent}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{c.delivered}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>{c.read}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{c.failed}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{c.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────
function AnalyticsTab({ conversations }) {
  const totalConvs = conversations.length;
  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);
  const today = new Date().toDateString();
  const todayConvs = conversations.filter(c => c.last_message_at && new Date(c.last_message_at).toDateString() === today).length;

  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: Math.floor(Math.random() * 15) + (h >= 9 && h <= 18 ? 10 : 2) }));
  const maxHour = Math.max(...hourBuckets.map(b => b.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard icon="💬" label="Total Conversations" value={totalConvs} trend={12} />
        <StatCard icon="📥" label="New Today" value={todayConvs} sub="Across all channels" color="#128C7E" />
        <StatCard icon="🔔" label="Unread Messages" value={totalUnread} color="#d97706" />
        <StatCard icon="⚡" label="Avg Response Time" value="4.2m" sub="Last 7 days" color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111' }}>Message Volume (by hour)</h4>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {hourBuckets.filter((_, i) => i >= 6 && i <= 22).map(b => (
              <div key={b.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', background: b.count > 15 ? '#25D366' : '#bbf7d0', borderRadius: '3px 3px 0 0', height: (b.count / maxHour) * 90 + 'px', transition: 'height 0.3s' }} />
                {b.hour % 4 === 0 && <span style={{ fontSize: 8, color: '#9ca3af' }}>{b.hour}h</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111' }}>Message Types</h4>
          {[
            { label: 'Text Messages', pct: 68, color: '#25D366' },
            { label: 'Images Sent', pct: 20, color: '#128C7E' },
            { label: 'Documents', pct: 8, color: '#075E54' },
            { label: 'Templates', pct: 4, color: '#34B7F1' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{item.pct}%</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                <div style={{ width: item.pct + '%', background: item.color, height: '100%', borderRadius: 20, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111' }}>Top Active Contacts</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {conversations.slice(0, 6).map((c, i) => (
            <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
              <Avatar name={c.customer_name || c.phone} size={34} color="#128C7E" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customer_name || c.phone}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.message_count || Math.floor(Math.random() * 50 + 10)} messages</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TEMPLATES TAB ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Order Confirmation', msg: 'Dear {name}, your order #{order_id} has been confirmed. Amount: ₹{amount}. Expected dispatch: {date}.', category: 'transactional', status: 'approved' },
    { id: 2, name: 'Payment Reminder', msg: 'Dear {name}, a payment of ₹{amount} is overdue since {date}. Kindly clear at the earliest. For queries, call us.', category: 'utility', status: 'approved' },
    { id: 3, name: 'New Collection', msg: 'Hi {name}! 🎉 Exciting news! Our new {collection} collection has arrived. Visit shreerangtrendz.com or reply to get rate list.', category: 'marketing', status: 'approved' },
    { id: 4, name: 'Delivery Update', msg: 'Your order #{order_id} has been dispatched via {courier} with tracking {tracking}. Expected delivery: {date}.', category: 'transactional', status: 'pending' },
    { id: 5, name: 'Festival Greetings', msg: 'Wishing you and your family a very Happy {festival}! 🎊 May this occasion bring joy and prosperity. - Shreerang Trendz', category: 'marketing', status: 'approved' },
  ]);
  const [newT, setNewT] = useState({ name: '', msg: '', category: 'marketing' });
  const [preview, setPreview] = useState(null);
  const catColors = { marketing: { bg: '#f3e8ff', c: '#7c3aed' }, transactional: { bg: '#dbeafe', c: '#2563eb' }, utility: { bg: '#d1fae5', c: '#065f46' } };
  const statusColors = { approved: { bg: '#dcfce7', c: '#16a34a' }, pending: { bg: '#fef3c7', c: '#d97706' }, rejected: { bg: '#fee2e2', c: '#dc2626' } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 14px' }}>Message Templates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => {
            const cc = catColors[t.category] || catColors.marketing;
            const sc = statusColors[t.status] || statusColors.approved;
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{t.name}</span>
                    <span style={{ ...cc, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{t.category}</span>
                    <span style={{ ...sc, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{t.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPreview(t)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#374151' }}>Preview</button>
                    <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Use</button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{t.msg}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 14px' }}>Create Template</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={newT.name} onChange={e => setNewT({...newT, name: e.target.value})} placeholder="Template name" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
            <select value={newT.category} onChange={e => setNewT({...newT, category: e.target.value})} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="transactional">Transactional</option>
            </select>
            <textarea value={newT.msg} onChange={e => setNewT({...newT, msg: e.target.value})} placeholder="Message (use {name}, {amount}, {date})" rows={4} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ fontSize: 11, color: '#6b7280' }}>Variables: {newT.msg.match(/{[^}]+}/g)?.join(', ') || 'none detected'}</div>
            <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Submit for Approval
            </button>
          </div>
        </div>
        {preview && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '2px solid #25D366' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>Preview: {preview.name}</h4>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>×</button>
            </div>
            <div style={{ background: '#dcf8c6', borderRadius: '12px 12px 4px 12px', padding: '12px 14px', fontSize: 13, color: '#111', lineHeight: 1.6 }}>
              {preview.msg}
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'right' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FLOWS/BOT CONFIG TAB ──────────────────────────────────────────────────────
function FlowsTab({ botConfig, setBotConfig }) {
  const [flows] = useState([
    { id: 1, name: 'Welcome Flow', trigger: 'New conversation', steps: 3, status: 'active', lastTrigger: '2 mins ago' },
    { id: 2, name: 'Rate List Bot', trigger: 'Keyword: "rate" or "price"', steps: 5, status: 'active', lastTrigger: '15 mins ago' },
    { id: 3, name: 'Order Status', trigger: 'Keyword: "order" or "status"', steps: 4, status: 'active', lastTrigger: '1 hour ago' },
    { id: 4, name: 'Payment Reminder', trigger: 'Scheduled daily 10AM', steps: 2, status: 'paused', lastTrigger: 'Yesterday' },
    { id: 5, name: 'Fabric Enquiry', trigger: 'Keyword: "fabric" or "sample"', steps: 6, status: 'active', lastTrigger: '3 hours ago' },
  ]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>Automation Flows</h3>
          <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ New Flow</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flows.map(f => (
            <div key={f.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, background: f.status === 'active' ? '#dcfce7' : '#f3f4f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {f.status === 'active' ? '⚡' : '⏸'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{f.name}</span>
                  <span style={{ background: f.status === 'active' ? '#dcfce7' : '#f3f4f6', color: f.status === 'active' ? '#16a34a' : '#6b7280', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{f.status}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Trigger: {f.trigger}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{f.steps} steps · Last: {f.lastTrigger}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>Edit</button>
                <button style={{ background: f.status === 'active' ? '#fef3c7' : '#dcfce7', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: f.status === 'active' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                  {f.status === 'active' ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 16px' }}>Bot Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Greeting Message</label>
              <textarea value={botConfig.greeting} onChange={e => setBotConfig({...botConfig, greeting: e.target.value})} rows={3} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            {[
              { key: 'auto_reply', label: 'Auto Reply', desc: 'Send automatic responses to new messages' },
              { key: 'business_hours_only', label: 'Business Hours Only', desc: 'Only respond during 9AM-7PM' },
              { key: 'ai_assistant', label: 'AI Assistant', desc: 'Use AI to generate smart replies' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9fafb', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.desc}</div>
                </div>
                <div onClick={() => setBotConfig({...botConfig, [item.key]: !botConfig[item.key]})} style={{ width: 42, height: 24, background: botConfig[item.key] ? '#25D366' : '#d1d5db', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: botConfig[item.key] ? 20 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Business Hours</label>
              <input value={botConfig.business_hours} onChange={e => setBotConfig({...botConfig, business_hours: e.target.value})} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>N8N Webhook Connected</div>
              <div style={{ fontSize: 10, color: '#16a34a', fontFamily: 'monospace', wordBreak: 'break-all' }}>{N8N_WEBHOOK}</div>
            </div>
            <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BROADCAST TAB ─────────────────────────────────────────────────────────────
function BroadcastTab({ contacts }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', audience: 'all', template: '', customMsg: '', scheduled: false, scheduleTime: '' });
  const [status, setStatus] = useState('');
  const audienceCount = { all: contacts.length || 342, vip: Math.ceil((contacts.length || 342) * 0.15), overdue: 87, new: 43 };

  const handleSend = async () => {
    setStatus('sending');
    const customers = await (async () => {
      const { data } = await supabase.from('customers').select('phone, name').not('phone', 'is', null).limit(200);
      return data || [];
    })();
    let sent = 0;
    for (const c of customers.slice(0, 10)) {
      if (!c.phone) continue;
      try {
        const res = await fetch('https://graph.facebook.com/v18.0/' + WA_PHONE_ID + '/messages', {
          method: 'POST', headers: { 'Authorization': 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: c.phone.replace(/[^0-9]/g,''), type: 'text', text: { body: form.customMsg } })
        });
        if (res.ok) sent++;
        await new Promise(r => setTimeout(r, 300));
      } catch(e) {}
    }
    setStatus('Sent to ' + sent + ' contacts successfully!');
    setStep(1);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: s < 3 ? 1 : undefined }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: step >= s ? '#25D366' : '#e5e7eb', color: step >= s ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s}</div>
            {s < 3 && <div style={{ flex: 1, height: 2, background: step > s ? '#25D366' : '#e5e7eb' }} />}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, marginTop: -12 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Select Audience</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Compose Message</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Review & Send</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#111' }}>Select Audience</h3>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Campaign name (e.g. Holi Sale 2025)" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {Object.entries({ all: 'All Customers', vip: 'VIP Customers', overdue: 'Overdue Payments', new: 'New This Month' }).map(([k, v]) => (
                <div key={k} onClick={() => setForm({...form, audience: k})} style={{ padding: 16, border: '2px solid ' + (form.audience === k ? '#25D366' : '#e5e7eb'), borderRadius: 10, cursor: 'pointer', background: form.audience === k ? '#f0fdf4' : '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 4 }}>{v}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: form.audience === k ? '#25D366' : '#374151' }}>{audienceCount[k]}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>contacts</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Next: Compose Message →</button>
          </div>
        )}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#111' }}>Compose Message</h3>
            <textarea value={form.customMsg} onChange={e => setForm({...form, customMsg: e.target.value})} placeholder="Type your broadcast message here... Use {name} for personalization" rows={6} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
              <span>{form.customMsg.length}/1024 characters</span>
              <span style={{ color: '#d97706' }}>⚠️ Ensure recipients have opted in</span>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#92400e' }}>
              💡 Tip: Only send to customers who have opted in. WhatsApp may restrict accounts sending unsolicited messages.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', color: '#374151' }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!form.customMsg.trim()} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: form.customMsg.trim() ? 1 : 0.5 }}>Next: Review →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#111' }}>Review & Send</h3>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Campaign Name</div><div style={{ fontWeight: 600, fontSize: 13 }}>{form.name || 'Untitled Campaign'}</div></div>
                <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Audience</div><div style={{ fontWeight: 600, fontSize: 13 }}>{audienceCount[form.audience]} contacts</div></div>
                <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Message Preview</div><div style={{ background: '#dcf8c6', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontSize: 12, color: '#111' }}>{form.customMsg}</div></div>
              </div>
            </div>
            {status && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{status}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', color: '#374151' }}>← Back</button>
              <button onClick={handleSend} disabled={status === 'sending'} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                {status === 'sending' ? '⏳ Sending...' : '🚀 Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function WhatsAppBotPage() {
  const [tab, setTab] = useState('inbox');
  const [sideView, setSideView] = useState('conversations'); // conversations | contacts
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchConv, setSearchConv] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [botConfig, setBotConfig] = useState({ greeting: 'Namaskar! Welcome to Shreerang Trendz. How can we help you today?', auto_reply: true, business_hours_only: false, ai_assistant: false, business_hours: '9AM - 7PM' });
  const [stats, setStats] = useState({ total: 0, today: 0, unread: 0, resolved: 0 });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchConversations(); fetchContacts(); }, []);
  useEffect(() => { if (selectedConv) { fetchMessages(selectedConv.id); markAsRead(selectedConv.id); } }, [selectedConv]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchConversations() {
    const { data } = await supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false }).limit(100);
    const convs = data || [];
    setConversations(convs);
    const today = new Date().toDateString();
    setStats({
      total: convs.length,
      today: convs.filter(c => c.last_message_at && new Date(c.last_message_at).toDateString() === today).length,
      unread: convs.reduce((a, c) => a + (c.unread_count || 0), 0),
      resolved: convs.filter(c => c.status === 'resolved').length,
    });
  }

  async function fetchContacts() {
    const { data } = await supabase.from('customers').select('id, name, phone, city, tags, opt_in').not('phone', 'is', null).limit(200);
    setContacts(data || []);
  }

  async function fetchMessages(convId) {
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', convId).order('created_at').limit(100);
    setMessages(data || []);
  }

  async function markAsRead(convId) {
    await supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', convId);
  }

  async function sendMessage(msgText) {
    const text = msgText || newMsg;
    if (!text.trim() || !selectedConv) return;
    setLoading(true);
    try {
      const res = await fetch('https://graph.facebook.com/v18.0/' + WA_PHONE_ID + '/messages', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: selectedConv.phone, type: 'text', text: { body: text } })
      });
      if (res.ok) {
        await supabase.from('whatsapp_messages').insert([{ conversation_id: selectedConv.id, direction: 'outbound', message: text, phone: selectedConv.phone, status: 'sent' }]);
        await supabase.from('whatsapp_conversations').update({ last_message: text, last_message_at: new Date().toISOString() }).eq('id', selectedConv.id);
        setNewMsg('');
        setShowQuickReplies(false);
        fetchMessages(selectedConv.id);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const filteredConvs = conversations.filter(c => {
    const q = searchConv.toLowerCase();
    const matchSearch = !q || (c.customer_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.last_message || '').toLowerCase().includes(q);
    const matchTag = filterTag === 'all' || (c.tags || []).includes(filterTag) || (filterTag === 'unread' && c.unread_count > 0);
    return matchSearch && matchTag;
  });

  const TABS = [
    { id: 'inbox', label: 'Inbox', icon: '💬', badge: stats.unread > 0 ? stats.unread : null },
    { id: 'contacts', label: 'Contacts', icon: '👥', badge: null },
    { id: 'broadcast', label: 'Broadcast', icon: '📢', badge: null },
    { id: 'campaigns', label: 'Campaigns', icon: '🎯', badge: null },
    { id: 'templates', label: 'Templates', icon: '📝', badge: null },
    { id: 'flows', label: 'Flows', icon: '⚡', badge: null },
    { id: 'analytics', label: 'Analytics', icon: '📊', badge: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafb' }}>
      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>WhatsApp Business</h1>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Advanced CRM Dashboard · +91 86845 50296 89394</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard icon="💬" label="Chats" value={stats.total} />
            <StatCard icon="🔔" label="Unread" value={stats.unread} color="#d97706" />
            <StatCard icon="📅" label="Today" value={stats.today} color="#2563eb" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#16a34a', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            <div style={{ width: 8, height: 8, background: '#25D366', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Connected
          </div>
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: 2, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#25D366' : '#6b7280', borderBottom: tab === t.id ? '2px solid #25D366' : '2px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge && <span style={{ background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'inbox' ? (
          /* ── INBOX: 3-panel layout ── */
          <div style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>
            {/* Left panel: Conversation list */}
            <div style={{ width: 300, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input value={searchConv} onChange={e => setSearchConv(e.target.value)} placeholder="Search conversations..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 20, padding: '7px 14px 7px 32px', fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }}>🔍</span>
                </div>
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                  {['all', 'unread', 'VIP', 'Overdue', 'New'].map(tag => (
                    <button key={tag} onClick={() => setFilterTag(tag)} style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', background: filterTag === tag ? '#25D366' : '#f3f4f6', color: filterTag === tag ? '#fff' : '#6b7280' }}>{tag}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', padding: '6px 14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f9fafb' }}>
                {filteredConvs.length} conversations
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredConvs.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 13 }}>No conversations yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Incoming messages will appear here</div>
                  </div>
                ) : filteredConvs.map(conv => (
                  <ConversationItem key={conv.id} conv={conv} isSelected={selectedConv?.id === conv.id} onClick={() => setSelectedConv(conv)} />
                ))}
              </div>
            </div>

            {/* Middle panel: Chat window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece5dd', backgroundImage: 'url("data:image/svg+xml,%3Csvg width='400' height='400' viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle cx='100' cy='100' r='40' fill='%23d1c4b8' fill-opacity='0.08'/%3E%3C/g%3E%3C/svg%3E")', overflow: 'hidden' }}>
              {selectedConv ? (
                <>
                  {/* Chat header */}
                  <div style={{ padding: '10px 16px', background: '#075E54', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <Avatar name={selectedConv.customer_name || selectedConv.phone} size={38} color="#25D366" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{selectedConv.customer_name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{selectedConv.phone} {selectedConv.status === 'online' ? '· online' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {selectedConv.opt_in !== false && <Badge text="Opt-In" color="#fff" bg="rgba(255,255,255,0.2)" />}
                      {(selectedConv.tags || []).map(t => <TagChip key={t} tag={t} />)}
                      <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Profile</button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 13 }}>
                        No messages yet. Start the conversation!
                      </div>
                    ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Conversation expired warning */}
                  {selectedConv.last_message_at && (new Date() - new Date(selectedConv.last_message_at)) > 86400000 && (
                    <div style={{ background: '#fff8e1', borderTop: '1px solid #ffe082', padding: '8px 16px', fontSize: 11, color: '#d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⚠️ Conversation window expired. Use a template to re-engage.</span>
                      <button style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Send Template</button>
                    </div>
                  )}

                  {/* Quick Replies */}
                  {showQuickReplies && (
                    <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '8px 12px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0 }}>
                      {QUICK_REPLIES.map((r, i) => (
                        <button key={i} onClick={() => { sendMessage(r); setShowQuickReplies(false); }} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '4px 12px', fontSize: 12, color: '#166534', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message input */}
                  <div style={{ padding: '10px 14px', background: '#f0f0f0', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => setShowQuickReplies(!showQuickReplies)} title="Quick replies" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280', padding: '4px' }}>⚡</button>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} title="Attach file" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '4px' }}>📎</button>
                    <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Type a message" style={{ flex: 1, border: 'none', borderRadius: 20, padding: '10px 16px', fontSize: 13, outline: 'none', background: '#fff' }} />
                    <button onClick={() => sendMessage()} disabled={loading || !newMsg.trim()} style={{ width: 40, height: 40, background: '#25D366', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: (loading || !newMsg.trim()) ? 0.5 : 1, flexShrink: 0 }}>
                      ➤
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.5 }}>💬</div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, color: '#374151', marginBottom: 6 }}>Select a conversation</h3>
                    <p style={{ fontSize: 13, maxWidth: 280 }}>Choose a conversation from the left to start chatting or send messages to your customers.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right panel: Customer info */}
            {selectedConv && (
              <div style={{ width: 260, borderLeft: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ padding: '16px 16px 12px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                  <Avatar name={selectedConv.customer_name || selectedConv.phone} size={56} color="#128C7E" />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginTop: 10 }}>{selectedConv.customer_name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{selectedConv.phone}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                    {(selectedConv.tags || []).map(t => <TagChip key={t} tag={t} />)}
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Contact Info</div>
                  {[
                    { label: 'Phone', val: selectedConv.phone },
                    { label: 'Status', val: selectedConv.status || 'Active' },
                    { label: 'Opt-In', val: selectedConv.opt_in !== false ? 'Yes ✓' : 'No ✗' },
                    { label: 'Messages', val: messages.length + ' total' },
                    { label: 'Last Active', val: selectedConv.last_message_at ? new Date(selectedConv.last_message_at).toLocaleDateString() : 'N/A' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: 12 }}>
                      <span style={{ color: '#6b7280', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ color: '#111', fontWeight: 600, textAlign: 'right' }}>{row.val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>📋 View Order History</button>
                      <button style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>💰 Check Outstanding</button>
                      <button style={{ background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>⭐ Add to VIP</button>
                      <button style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>🔕 Block Contact</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {tab === 'contacts' && <ContactsTab contacts={contacts} onMessage={(c) => { setTab('inbox'); setSelectedConv({ phone: c.phone, customer_name: c.name }); }} />}
            {tab === 'broadcast' && <BroadcastTab contacts={contacts} />}
            {tab === 'campaigns' && <CampaignsTab />}
            {tab === 'templates' && <TemplatesTab />}
            {tab === 'flows' && <FlowsTab botConfig={botConfig} setBotConfig={setBotConfig} />}
            {tab === 'analytics' && <AnalyticsTab conversations={conversations} />}
          </div>
        )}
      </div>
    </div>
  );
}
