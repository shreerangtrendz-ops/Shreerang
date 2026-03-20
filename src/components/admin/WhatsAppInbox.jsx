import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, MessageCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || '';
const PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID || '868455029689394';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      setConversations(data);
      const unread = data.filter(c => c.unread_count > 0).length;
      setUnreadCount(unread);
      if (data.length > 0 && !selectedConv) setSelectedConv(data[0]);
    }
  }, [selectedConv]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (!error && data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConv?.id) loadMessages(selectedConv.id);
  }, [selectedConv?.id]);

  // Real-time subscription for new messages
  useEffect(() => {
    const msgChannel = supabase
      .channel('whatsapp-messages-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages'
      }, (payload) => {
        const newMsg = payload.new;
        // Add to messages if belongs to selected conversation
        if (newMsg.conversation_id === selectedConv?.id) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);
        }
        // Refresh conversation list for updated last_message
        loadConversations();
      })
      .subscribe();

    const convChannel = supabase
      .channel('whatsapp-convs-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [selectedConv?.id, loadConversations]);

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || !selectedConv || sending) return;
    setSending(true);
    const phone = selectedConv.customer_phone || selectedConv.phone;
    try {
      // Send via WhatsApp API
      const resp = await fetch(
        `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: messageText }
          })
        }
      );
      if (resp.ok) {
        // Insert outbound message to Supabase
        await supabase.from('whatsapp_messages').insert({
          conversation_id: selectedConv.id,
          direction: 'outbound',
          message_type: 'text',
          content: messageText,
          status: 'sent',
          created_at: new Date().toISOString()
        });
        setMessageText('');
      }
    } catch (err) {
      console.error('Send failed:', err);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvs = conversations.filter(c =>
    (c.customer_name || c.customer_phone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const diff = today.setHours(0,0,0,0) - d.setHours(0,0,0,0);
    if (diff === 0) return 'Today';
    if (diff === 86400000) return 'Yesterday';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <FormErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp Inbox
                {unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
                )}
              </h2>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live" />
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-9 bg-white text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-100">
              {filteredConvs.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">No conversations yet</div>
              )}
              {filteredConvs.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedConv?.id === conv.id ? 'bg-green-50 border-l-2 border-green-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-green-100 text-green-700 text-xs font-semibold">
                        {(conv.customer_name || conv.customer_phone || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {conv.customer_name || conv.customer_phone || 'Unknown'}
                        </h3>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {formatTime(conv.last_message_at || conv.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 truncate">{conv.last_message || ''}</p>
                        {conv.unread_count > 0 && (
                          <span className="bg-green-500 text-white text-[10px] rounded-full px-1.5 ml-1 shrink-0">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat area */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-green-100 text-green-700 text-xs font-semibold">
                  {(selectedConv.customer_name || selectedConv.customer_phone || '?').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-slate-900 text-sm">
                  {selectedConv.customer_name || selectedConv.customer_phone}
                </div>
                <div className="text-xs text-slate-400">{selectedConv.customer_phone}</div>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => loadMessages(selectedConv.id)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-[#f0f2f5]">
              <div className="space-y-2">
                {messages.map((msg, idx) => {
                  const isOut = msg.direction === 'outbound';
                  const showDate = idx === 0 || formatDate(messages[idx-1]?.created_at) !== formatDate(msg.created_at);
                  return (
                    <div key={msg.id || idx}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="bg-white text-slate-400 text-xs px-3 py-1 rounded-full shadow-sm">{formatDate(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm ${isOut ? 'bg-[#dcf8c6] text-slate-800' : 'bg-white text-slate-800'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content || msg.message_text || ''}</p>
                          <p className={`text-[10px] mt-1 ${isOut ? 'text-right text-slate-400' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="bg-green-500 hover:bg-green-600 text-white h-9 w-9 p-0 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </FormErrorBoundary>
  );
};

export default WhatsAppInbox;
