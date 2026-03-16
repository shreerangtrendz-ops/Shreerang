import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, RefreshCw, MessageSquare, Phone, Clock } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const WHATSAPP_TOKEN = 'EAAKigiKCL4gBQwTbZCZCZAGKoyMkvLWZBGW91JowEdRqhZAAgJmr0oAFsmklZB0cEZC9BIx8bQ4MkWoZCmNE6Gpcubom3zEsyicNByu2wiE35LujumllbekSySFSms9yl77uvAX83ntx7oUqj9paZBZAbtrnQeqgUl3SudiGS90hspkPaGXjYeXZAwfUb2Uhd4xjL2cxwZDZD';
const PHONE_ID = '868455029689394';

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM');
};

const WhatsAppInboxPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const selectedConvIdRef = useRef(null);

  useEffect(() => {
    fetchConversations();

    const convChannel = supabase
      .channel('whatsapp-conversations-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_conversations' }, (payload) => {
        const conv = payload.new;
        setConversations(prev => {
          if (prev.find(c => c.id === conv.id)) return prev;
          return [{
            id: conv.id,
            phone_number: conv.phone_number,
            customer_name: conv.customer_name || conv.phone_number,
            last_message: '',
            last_time: conv.last_message_at || conv.created_at,
            language: conv.language || 'en',
            unread: 1,
          }, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' }, (payload) => {
        const conv = payload.new;
        setConversations(prev =>
          prev.map(c => c.id === conv.id
            ? { ...c, last_time: conv.last_message_at, customer_name: conv.customer_name || c.customer_name }
            : c
          ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time))
        );
      })
      .subscribe();

    const msgChannel = supabase
      .channel('whatsapp-messages-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const msg = payload.new;
        setConversations(prev =>
          prev.map(c => c.id === msg.conversation_id
            ? { ...c, last_message: msg.message_text, last_time: msg.created_at, unread: c.id !== selectedConvIdRef.current ? (c.unread || 0) + 1 : 0 }
            : c
          ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time))
        );
        if (msg.conversation_id === selectedConvIdRef.current) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('id, phone_number, customer_name, language, last_message_at, status, created_at')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      const convIds = data.map(c => c.id);
      let lastMessages = {};
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, message_text, direction, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });
        if (msgs) {
          for (const m of msgs) {
            if (!lastMessages[m.conversation_id]) lastMessages[m.conversation_id] = m;
          }
        }
      }

      setConversations(data.map(c => ({
        id: c.id,
        phone_number: c.phone_number,
        customer_name: c.customer_name || c.phone_number,
        last_message: lastMessages[c.id]?.message_text || '',
        last_direction: lastMessages[c.id]?.direction || '',
        last_time: c.last_message_at || c.created_at,
        language: c.language || 'en',
        unread: 0,
      })));
    }
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c));
  };

  const handleSelect = (conv) => {
    setSelectedConvId(conv.id);
    setSelectedPhone(conv.phone_number);
    fetchMessages(conv.id);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone || !selectedConvId || sending) return;
    setSending(true);
    try {
      await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: selectedPhone, type: 'text', text: { body: replyText } })
      });

      await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConvId,
        message_text: replyText,
        direction: 'outbound',
        message_type: 'text',
        created_at: new Date().toISOString(),
      });

      setMessages(prev => [...prev, {
        conversation_id: selectedConvId,
        message_text: replyText,
        direction: 'outbound',
        created_at: new Date().toISOString(),
      }]);
      setReplyText('');
    } catch (e) {
      console.error('Send error', e);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter(c =>
    c.phone_number.includes(search) || (c.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const langBadge = (lang) => {
    if (lang === 'hi') return { label: 'Hindi', color: 'bg-orange-100 text-orange-700' };
    if (lang === 'gu') return { label: 'Gujarati', color: 'bg-purple-100 text-purple-700' };
    return { label: 'English', color: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50">
      <Helmet><title>WhatsApp Inbox — Shreerang</title></Helmet>

      <div className="w-80 flex flex-col bg-white border-r shadow-sm">
        <div className="p-4 border-b bg-green-600 text-white">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Inbox
            </h1>
            <button onClick={fetchConversations} className="p-1 hover:bg-green-700 rounded">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-green-100 text-xs mt-1">{conversations.length} conversations</p>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by phone or name..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Messages will appear here once customers WhatsApp you</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(conv => {
                const lb = langBadge(conv.language);
                return (
                  <div key={conv.id} onClick={() => handleSelect(conv)}
                    className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedConvId === conv.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                        {conv.phone_number.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {conv.customer_name !== conv.phone_number ? conv.customer_name : `+${conv.phone_number}`}
                          </span>
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-1">{formatTime(conv.last_time)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.last_direction === 'outbound' ? '✓ ' : ''}{conv.last_message}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${lb.color}`}>{lb.label}</span>
                          {conv.unread > 0 && (
                            <span className="bg-green-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{conv.unread}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedPhone ? (
          <>
            <div className="px-4 py-3 bg-white border-b shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                {selectedPhone.slice(-2)}
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  {selectedConv?.customer_name && selectedConv.customer_name !== selectedPhone ? selectedConv.customer_name : `+${selectedPhone}`}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="h-3 w-3" />
                  <span>{selectedConv?.language === 'hi' ? 'Hindi' : selectedConv?.language === 'gu' ? 'Gujarati' : 'English'} speaker</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-[#e5ddd5]">
              <div className="space-y-2 max-w-2xl mx-auto">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm text-sm ${
                      msg.direction === 'outbound' ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message_text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">{msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}</span>
                        {msg.direction === 'outbound' && <span className="text-[10px] text-blue-400">✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 bg-white border-t">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." value={replyText} onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} className="flex-1" disabled={sending} />
                <Button onClick={handleSend} disabled={!replyText.trim() || sending} className="bg-green-600 hover:bg-green-700 text-white px-4">
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-1">Press Enter to send</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-[#f0f2f5]">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-600">Shreerang WhatsApp Inbox</h3>
            <p className="text-sm mt-1">Select a conversation to view messages</p>
            <p className="text-xs mt-2 text-slate-300">+91 78742 00033 • Live</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInboxPage;
