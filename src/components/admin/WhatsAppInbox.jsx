import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, MessageCircle, RefreshCw, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const PHONE_ID = '868455029689394';
const WA_TOKEN = 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';

// Language flag emoji map
const LANG_FLAGS = {
  'hi': '🇮🇳', 'gu': '🇮🇳', 'mr': '🇮🇳', 'pa': '🇮🇳', 'bn': '🇧🇩',
  'ar': '🇸🇦', 'fa': '🇮🇷', 'ur': '🇵🇰', 'tr': '🇹🇷', 'fr': '🇫🇷',
  'es': '🇪🇸', 'de': '🇩🇪', 'pt': '🇵🇹', 'it': '🇮🇹', 'ru': '🇷🇺',
  'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷', 'nl': '🇳🇱', 'sv': '🇸🇪',
  'en': '🇬🇧', 'ms': '🇲🇾', 'id': '🇮🇩', 'th': '🇹🇭', 'vi': '🇻🇳',
};

function LangBadge({ lang }) {
  if (!lang || lang === 'English') return null;
  return (
    <span style={{ fontSize: 10, background: '#EEF2FF', color: '#4F46E5', padding: '1px 6px', borderRadius: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Globe size={9} /> {lang}
    </span>
  );
}

// Message bubble component with translation toggle
function MessageBubble({ msg }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const isOut = msg.direction === 'outgoing';
  const hasTranslation = msg.translated_text && msg.translated_text !== msg.message_text && msg.language_detected !== 'English';

  // For dashboard: show English translation by default for incoming non-English messages
  const displayText = isOut
    ? msg.message_text  // outgoing: always English (team sees what bot sent in English)
    : (showOriginal ? msg.message_text : (msg.translated_text || msg.message_text)); // incoming: English translation default

  const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div style={{ maxWidth: '72%' }}>
        {/* Language badge for incoming non-English */}
        {!isOut && msg.language_detected && msg.language_detected !== 'English' && (
          <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LangBadge lang={msg.language_detected} />
            {hasTranslation && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                style={{ fontSize: 10, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                {showOriginal ? 'Show English' : 'Show original'}
              </button>
            )}
          </div>
        )}

        <div style={{
          background: isOut ? '#DCF8C6' : '#fff',
          padding: '8px 12px', borderRadius: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          fontSize: 13, color: '#111'
        }}>
          {/* Translation indicator */}
          {!isOut && hasTranslation && !showOriginal && (
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4, fontStyle: 'italic' }}>
              🌐 Translated from {msg.language_detected}
            </div>
          )}

          <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayText}</p>

          {/* For outgoing: show note that customer received in their language */}
          {isOut && msg.metadata?.sent_in_lang && msg.metadata.sent_in_lang !== 'English' && (
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
              📤 Sent to customer in {msg.metadata.sent_in_lang}
            </div>
          )}

          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, textAlign: 'right' }}>
            {fmt(msg.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(50);
    if (data) {
      setConversations(data);
      if (data.length > 0 && !selectedConv) setSelectedConv(data[0]);
    }
  }, []);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) { setMessages(data); setTimeout(scrollToBottom, 100); }
  }, []);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (selectedConv?.id) loadMessages(selectedConv.id); }, [selectedConv?.id]);

  useEffect(() => {
    const ch = supabase.channel('wa-inbox-live-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const msg = payload.new;
        if (msg.conversation_id === selectedConv?.id) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(scrollToBottom, 100);
        }
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => loadConversations())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedConv?.id, loadConversations]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedConv || sending) return;
    setSending(true);
    const phone = selectedConv.phone_number;
    try {
      const resp = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: messageText } })
      });
      if (resp.ok) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: selectedConv.id,
          direction: 'outgoing',
          message_type: 'text',
          message_text: messageText,
          translated_text: messageText,
          language_detected: 'English',
          status: 'sent',
          created_at: new Date().toISOString(),
          metadata: { sent_by: 'agent', dashboard_view: 'english' }
        });
        setMessageText('');
      }
    } catch (err) { console.error('Send failed:', err); }
    setSending(false);
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const filtered = conversations.filter(c =>
    (c.customer_name || c.phone_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FormErrorBoundary>
      <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 300, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={16} color="#25D366" /> WhatsApp Inbox
                <span style={{ fontSize: 10, background: '#25D366', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>LIVE</span>
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{conversations.length} chats</span>
            </div>
            {/* Team notice */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#1D4ED8' }}>
              🇬🇧 Dashboard shows <strong>English translations</strong> — bot replies in customer's language
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input placeholder="Search..." style={{ paddingLeft: 28, fontSize: 12 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <ScrollArea style={{ flex: 1 }}>
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No conversations yet</div>}
            {filtered.map(conv => (
              <div key={conv.id} onClick={() => setSelectedConv(conv)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selectedConv?.id === conv.id ? '#F0FDF4' : 'transparent', borderLeft: selectedConv?.id === conv.id ? '3px solid #25D366' : '3px solid transparent' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                    {(conv.customer_name || conv.phone_number || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.customer_name || conv.phone_number}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{fmt(conv.last_message_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.phone_number}</span>
                      {conv.language && conv.language !== 'English' && conv.language !== 'EN' && (
                        <span style={{ fontSize: 9, background: '#EEF2FF', color: '#4F46E5', padding: '1px 5px', borderRadius: 8, fontWeight: 600, flexShrink: 0 }}>{conv.language}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Chat area */}
        {selectedConv ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#059669' }}>
                {(selectedConv.customer_name || selectedConv.phone_number || '?').substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{selectedConv.customer_name || selectedConv.phone_number}</div>
                <div style={{ fontSize: 11, color: '#25D366', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ● {selectedConv.phone_number}
                  {selectedConv.language && selectedConv.language !== 'EN' && selectedConv.language !== 'English' && (
                    <span style={{ color: '#6B7280' }}>· Speaks {selectedConv.language}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>
                🇬🇧 English view
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadMessages(selectedConv.id)}>
                <RefreshCw size={14} />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea style={{ flex: 1, padding: 16, background: '#F0F2F5' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>No messages yet</div>
              )}
              {messages.map((msg, idx) => <MessageBubble key={msg.id || idx} msg={msg} />)}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Type in English — customer will receive it as-is (Enter to send)"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  style={{ fontSize: 13 }}
                  disabled={sending}
                />
              </div>
              <Button onClick={handleSend} disabled={!messageText.trim() || sending}
                style={{ background: '#25D366', color: '#fff', width: 36, height: 36, padding: 0, borderRadius: 8, flexShrink: 0 }}>
                <Send size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <MessageCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </FormErrorBoundary>
  );
};

export default WhatsAppInbox;
