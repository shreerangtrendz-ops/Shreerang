import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, RefreshCw, MessageSquare, Phone, Image, X, Check, CheckCheck, Edit2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || '';
const PHONE_ID = '868455029689394';
const WA_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
const WA_HEADERS = { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' };

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM');
};

const MsgTick = ({ status, direction }) => {
  if (direction !== 'outgoing') return null;
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-slate-400 flex-shrink-0" />;
  return <Check className="h-3 w-3 text-slate-400 flex-shrink-0" />;
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const messagesEndRef = useRef(null);
  const selectedConvIdRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Real-time subscriptions ──────────────────────────
  useEffect(() => {
    fetchConversations();

    const convChannel = supabase
      .channel('wa-convs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_conversations' }, ({ new: c }) => {
        setConversations(prev => {
          if (prev.find(x => x.id === c.id)) return prev;
          return [buildConv(c, '', '', null), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' }, ({ new: c }) => {
        setConversations(prev =>
          prev.map(x => x.id === c.id
            ? { ...x, last_time: c.last_message_at, customer_name: c.customer_name || x.customer_name, language: c.language || x.language }
            : x
          ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time))
        );
      })
      .subscribe();

    const msgChannel = supabase
      .channel('wa-msgs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, ({ new: msg }) => {
        setConversations(prev =>
          prev.map(c => c.id === msg.conversation_id
            ? { ...c, last_message: msg.message_text, last_time: msg.created_at, last_direction: msg.direction, unread: c.id !== selectedConvIdRef.current ? (c.unread || 0) + 1 : 0 }
            : c
          ).sort((a, b) => new Date(b.last_time) - new Date(a.last_time))
        );
        if (msg.conversation_id === selectedConvIdRef.current) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, ({ new: msg }) => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: msg.status } : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildConv = (c, lastMsg, lastDir, lastTime) => ({
    id: c.id,
    phone_number: c.phone_number,
    customer_name: c.customer_name || '',
    last_message: lastMsg,
    last_direction: lastDir,
    last_time: lastTime || c.last_message_at || c.created_at,
    language: c.language || 'en',
    status: c.status,
    unread: 0,
  });

  const fetchConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('id, phone_number, customer_name, language, last_message_at, status, created_at')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      const ids = data.map(c => c.id);
      let lastMsgs = {};
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, message_text, direction, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false });
        if (msgs) msgs.forEach(m => { if (!lastMsgs[m.conversation_id]) lastMsgs[m.conversation_id] = m; });
      }
      setConversations(data.map(c => buildConv(c, lastMsgs[c.id]?.message_text || '', lastMsgs[c.id]?.direction || '', null)));
    }
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    setMessages(data || []);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c));
  };

  const handleSelect = (conv) => {
    setSelectedConvId(conv.id);
    setSelectedPhone(conv.phone_number);
    setEditingName(false);
    setImageFile(null);
    setImagePreview(null);
    fetchMessages(conv.id);
  };

  // ── Save customer name ────────────────────────────────
  const handleSaveName = async () => {
    if (!nameInput.trim() || !selectedConvId) return;
    setSavingName(true);
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ customer_name: nameInput.trim() })
      .eq('id', selectedConvId);
    if (!error) {
      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, customer_name: nameInput.trim() } : c));
    }
    setSavingName(false);
    setEditingName(false);
  };

  // ── Image picker ──────────────────────────────────────
  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // ── Upload image to WhatsApp Media API ────────────────
  const uploadImageToMeta = async (file) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('type', file.type);
    form.append('messaging_product', 'whatsapp');
    const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
      body: form,
    });
    const d = await r.json();
    return d.id || null;
  };

  // ── Send message (text or image) ──────────────────────
  const handleSend = async () => {
    if ((!replyText.trim() && !imageFile) || !selectedPhone || !selectedConvId || sending) return;
    setSending(true);
    try {
      let waPayload, dbText, dbType = 'text', mediaUrl = null;

      if (imageFile) {
        // Upload image to Meta first
        const mediaId = await uploadImageToMeta(imageFile);
        if (!mediaId) throw new Error('Image upload failed');
        waPayload = {
          messaging_product: 'whatsapp', to: selectedPhone, type: 'image',
          image: { id: mediaId, caption: replyText.trim() || undefined }
        };
        dbText = replyText.trim() || '[Image]';
        dbType = 'image';
        mediaUrl = imagePreview;
      } else {
        waPayload = { messaging_product: 'whatsapp', to: selectedPhone, type: 'text', text: { body: replyText.trim() } };
        dbText = replyText.trim();
      }

      const waResp = await fetch(WA_API, { method: 'POST', headers: WA_HEADERS, body: JSON.stringify(waPayload) });
      const waData = await waResp.json();
      const waMsgId = waData?.messages?.[0]?.id || null;

      // Save to DB with correct direction 'outgoing' and status 'sent'
      const { data: inserted } = await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConvId,
        message_text: dbText,
        direction: 'outgoing',
        message_type: dbType,
        whatsapp_message_id: waMsgId,
        media_url: mediaUrl,
        status: 'sent',
        created_at: new Date().toISOString(),
      }).select().single();

      if (inserted) setMessages(prev => [...prev, inserted]);
      setReplyText('');
      clearImage();

      // Update conversation last_message_at
      await supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvId);
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

      {/* ── Conversation List ── */}
      <div className="w-80 flex flex-col bg-white border-r shadow-sm">
        <div className="p-4 border-b bg-green-600 text-white">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Inbox
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" title="Live" />
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
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(conv => {
                const lb = langBadge(conv.language);
                const displayName = conv.customer_name || `+${conv.phone_number}`;
                return (
                  <div key={conv.id} onClick={() => handleSelect(conv)}
                    className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedConvId === conv.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                        {(conv.customer_name || conv.phone_number).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm text-slate-900 truncate">{displayName}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-1">{formatTime(conv.last_time)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          {conv.last_direction === 'outgoing' && <Check className="h-3 w-3 text-slate-400 flex-shrink-0" />}
                          {conv.last_message || <span className="italic text-slate-300">No messages yet</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${lb.color}`}>{lb.label}</span>
                          {conv.unread > 0 && (
                            <span className="bg-green-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold ml-auto">{conv.unread}</span>
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

      {/* ── Chat Panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPhone ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                {(selectedConv?.customer_name || selectedPhone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      placeholder="Enter customer name..." className="h-7 text-sm w-48" />
                    <Button size="sm" onClick={handleSaveName} disabled={savingName} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs">
                      {savingName ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                    <button onClick={() => setEditingName(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900">
                      {selectedConv?.customer_name || `+${selectedPhone}`}
                    </h2>
                    <button onClick={() => { setNameInput(selectedConv?.customer_name || ''); setEditingName(true); }}
                      className="text-slate-300 hover:text-slate-500 transition-colors" title="Edit name">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="h-3 w-3" />
                  <span>+{selectedPhone}</span>
                  <span>•</span>
                  <span className={`${langBadge(selectedConv?.language).color} px-1.5 py-0.5 rounded-full text-[10px] font-medium`}>
                    {langBadge(selectedConv?.language).label} speaker
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-[#e5ddd5]">
              <div className="space-y-1.5 max-w-2xl mx-auto">
                {messages.map((msg, idx) => {
                  const isOut = msg.direction === 'outgoing' || msg.direction === 'outbound';
                  return (
                    <div key={msg.id || idx} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm text-sm ${isOut ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}`}>
                        {/* Image message */}
                        {msg.message_type === 'image' && msg.media_url && (
                          <img src={msg.media_url} alt="sent" className="rounded mb-1 max-w-full max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />
                        )}
                        {msg.message_text && msg.message_text !== '[Image]' && (
                          <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-slate-400">{msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}</span>
                          <MsgTick status={msg.status} direction={msg.direction} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Image preview strip */}
            {imagePreview && (
              <div className="px-3 pt-2 bg-white border-t flex items-center gap-2">
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded border" />
                  <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-500">{imageFile?.name}</span>
              </div>
            )}

            {/* Reply bar */}
            <div className="p-3 bg-white border-t">
              <div className="flex gap-2 items-center">
                {/* Image picker button */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-green-600 transition-colors flex-shrink-0" title="Send image from gallery">
                  <Image className="h-5 w-5" />
                </button>
                <Input
                  placeholder={imageFile ? 'Add a caption (optional)...' : 'Type a message...'}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1" disabled={sending}
                />
                <Button onClick={handleSend} disabled={(!replyText.trim() && !imageFile) || sending}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 flex-shrink-0">
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-10">Press Enter to send</p>
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
