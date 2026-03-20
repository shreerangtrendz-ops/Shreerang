import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, MessageCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const PHONE_ID = '868455029689394';
const WA_TOKEN = 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';

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

  // Real-time: new messages
  useEffect(() => {
    const ch = supabase.channel('wa-inbox-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const msg = payload.new;
        if (msg.conversation_id === selectedConv?.id) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(scrollToBottom, 100);
        }
        loadConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        loadConversations();
      })
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
          status: 'sent',
          created_at: new Date().toISOString(),
          metadata: {}
        });
        setMessageText('');
      }
    } catch (err) { console.error('Send failed:', err); }
    setSending(false);
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const fmtDate = (ts) => {
    if (!ts) return '';
    const diff = new Date().setHours(0,0,0,0) - new Date(ts).setHours(0,0,0,0);
    if (diff === 0) return 'Today'; if (diff === 86400000) return 'Yesterday';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const filtered = conversations.filter(c =>
    (c.customer_name || c.phone_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FormErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp Inbox
                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />LIVE
                </span>
              </h2>
              <span className="text-xs text-slate-400">{conversations.length} chats</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search..." className="pl-9 bg-white text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No conversations yet</div>}
              {filtered.map(conv => (
                <div key={conv.id} onClick={() => setSelectedConv(conv)}
                  className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedConv?.id === conv.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                        {(conv.customer_name || conv.phone_number || '?').substring(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-900 truncate">{conv.customer_name || conv.phone_number}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{fmt(conv.last_message_at)}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{conv.phone_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b bg-white flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                  {(selectedConv.customer_name || selectedConv.phone_number || '?').substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium text-slate-900 text-sm">{selectedConv.customer_name || selectedConv.phone_number}</div>
                <div className="text-xs text-green-600">● {selectedConv.phone_number}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadMessages(selectedConv.id)} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-[#f0f2f5]">
              <div className="space-y-1">
                {messages.map((msg, idx) => {
                  const isOut = msg.direction === 'outgoing';
                  const showDate = idx === 0 || fmtDate(messages[idx-1]?.created_at) !== fmtDate(msg.created_at);
                  return (
                    <div key={msg.id || idx}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="bg-white text-slate-400 text-xs px-3 py-1 rounded-full shadow-sm">{fmtDate(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm ${isOut ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                          <p className="whitespace-pre-wrap break-words text-slate-800">{msg.message_text || ''}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 text-right">{fmt(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t bg-white flex gap-2">
              <Input
                placeholder="Type a message... (Enter to send)"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                className="flex-1 text-sm"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!messageText.trim() || sending}
                className="bg-green-500 hover:bg-green-600 text-white h-9 w-9 p-0 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </FormErrorBoundary>
  );
};

export default WhatsAppInbox;
