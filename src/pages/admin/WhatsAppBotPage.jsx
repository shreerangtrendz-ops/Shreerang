import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const WA_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;
const WA_PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID || '868455029689394';
const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://shreerangtrendz.app.n8n.cloud/webhook/whatsapp-incoming';

export default function WhatsAppBotPage() {
  const [tab, setTab] = useState('inbox');
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTo, setBroadcastTo] = useState('all');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const [botConfig, setBotConfig] = useState({ greeting: 'Namaskar! Welcome to Shreerang Trendz. How can we help you?', auto_reply: true, business_hours: '9AM-7PM' });
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '', category: 'marketing' });
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { if (selectedConv) fetchMessages(selectedConv.id); }, [selectedConv]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchConversations() {
    const { data } = await supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false }).limit(50);
    setConversations(data || []);
  }

  async function fetchMessages(convId) {
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', convId).order('created_at');
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedConv) return;
    setLoading(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: selectedConv.phone, type: 'text', text: { body: newMsg } })
      });
      if (res.ok) {
        await supabase.from('whatsapp_messages').insert([{ conversation_id: selectedConv.id, direction: 'outbound', message: newMsg, phone: selectedConv.phone }]);
        setNewMsg('');
        fetchMessages(selectedConv.id);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) return;
    setBroadcastStatus('Sending...');
    let contacts = [];
    if (broadcastTo === 'all') {
      const { data } = await supabase.from('customers').select('phone, name').not('phone', 'is', null).limit(100);
      contacts = data || [];
    }
    let sent = 0;
    for (const c of contacts) {
      if (!c.phone) continue;
      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: c.phone.replace(/[^0-9]/g,''), type: 'text', text: { body: broadcastMsg } })
        });
        if (res.ok) sent++;
        await new Promise(r => setTimeout(r, 200));
      } catch(e) {}
    }
    setBroadcastStatus(`Sent to ${sent}/${contacts.length} contacts`);
  }

  const tabs = [
    { id: 'inbox', label: 'Live Inbox', icon: '💬' },
    { id: 'broadcast', label: 'Broadcast', icon: '📢' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'bot', label: 'Bot Config', icon: '🤖' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bot Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage conversations, broadcasts, and bot configuration</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="w-80 border-r flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm text-gray-700">Conversations ({conversations.length})</h3>
            </div>
            <div className="overflow-y-auto flex-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">No conversations yet</div>
              ) : conversations.map(conv => (
                <div key={conv.id} onClick={() => setSelectedConv(conv)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedConv?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-sm text-gray-900">{conv.customer_name || conv.phone}</div>
                    <div className="text-xs text-gray-400">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}</div>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message || 'No messages'}</p>
                  {conv.unread_count > 0 && (
                    <span className="inline-block bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 mt-1">{conv.unread_count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-3 border-b bg-gray-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                    {(selectedConv.customer_name || selectedConv.phone || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{selectedConv.customer_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{selectedConv.phone}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {msg.message}
                        <div className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..." className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={sendMessage} disabled={loading || !newMsg.trim()}
                    className="bg-green-500 text-white px-4 py-2 rounded-full text-sm hover:bg-green-600 disabled:opacity-50">Send</button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-5xl mb-3">💬</div>
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'broadcast' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Send Broadcast Message</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Send To</label>
              <select value={broadcastTo} onChange={e => setBroadcastTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="all">All Customers</option>
                <option value="active">Active Customers</option>
                <option value="overdue">Overdue Payments</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Type your broadcast message here..." rows={5}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              <p className="text-xs text-gray-400 mt-1">{broadcastMsg.length}/1024 characters</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700">⚠️ Only send to customers who have opted in to receive WhatsApp messages. Ensure compliance with WhatsApp Business policies.</p>
            </div>
            <button onClick={sendBroadcast} disabled={!broadcastMsg.trim()}
              className="w-full bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50">
              Send Broadcast
            </button>
            {broadcastStatus && <p className="text-sm text-center text-gray-600">{broadcastStatus}</p>}
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Message Templates</h3>
            <div className="space-y-3">
              {[
                { name: 'Order Confirmation', msg: 'Dear {name}, your order #{order_id} has been confirmed. Expected delivery: {date}.', cat: 'transactional' },
                { name: 'Payment Reminder', msg: 'Dear {name}, your payment of ₹{amount} is due on {date}. Please clear at earliest.', cat: 'utility' },
                { name: 'New Collection', msg: 'Hi {name}! Check our latest fabric collection. Visit shreerangtrendz.com for details.', cat: 'marketing' },
                { name: 'Delivery Update', msg: 'Your order #{order_id} is out for delivery. Expected arrival today between 10AM-6PM.', cat: 'transactional' },
              ].map((t, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-gray-900">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.cat === 'marketing' ? 'bg-purple-100 text-purple-700' : t.cat === 'transactional' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{t.cat}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{t.msg}</p>
                  <button className="mt-2 text-xs text-green-600 hover:underline">Use Template</button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create New Template</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Template Name</label>
                <input value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g. Festival Offer" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                <select value={newTemplate.category} onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="marketing">Marketing</option>
                  <option value="utility">Utility</option>
                  <option value="transactional">Transactional</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Message (use {'{name}'}, {'{amount}'} etc.)</label>
                <textarea value={newTemplate.message} onChange={e => setNewTemplate({...newTemplate, message: e.target.value})}
                  placeholder="Template message..." rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <button className="w-full bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'bot' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Bot Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Greeting Message</label>
              <textarea value={botConfig.greeting} onChange={e => setBotConfig({...botConfig, greeting: e.target.value})}
                rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto Reply</p>
                <p className="text-xs text-gray-500">Automatically reply to new messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={botConfig.auto_reply} onChange={e => setBotConfig({...botConfig, auto_reply: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Business Hours</label>
              <input value={botConfig.business_hours} onChange={e => setBotConfig({...botConfig, business_hours: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium">N8N Webhook URL:</p>
              <p className="text-xs text-blue-600 font-mono mt-1 break-all">{N8N_WEBHOOK}</p>
            </div>
            <button className="w-full bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600">Save Bot Settings</button>
          </div>
        </div>
      )}
    </div>
  );
}
