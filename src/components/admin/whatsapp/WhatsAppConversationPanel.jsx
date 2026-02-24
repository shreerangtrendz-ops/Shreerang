import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { MetaWhatsAppService } from '@/services/MetaWhatsAppService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Send, Paperclip, Image as ImageIcon, MoreVertical, Phone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const WhatsAppConversationPanel = ({ customerId }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
      loadMessages();
      subscribeToMessages();
    }
  }, [customerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCustomer = async () => {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', customerId).single();
    setCustomer(data);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });
      
    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${customerId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'whatsapp_messages',
        filter: `customer_id=eq.${customerId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !customer?.phone_number) return;

    setSending(true);
    try {
      // 1. Send via WhatsApp API
      await MetaWhatsAppService.sendMessage(customer.phone_number, newMessage);
      
      // 2. Store in DB (Optimistic update or wait for webhook/response)
      // Note: MetaWhatsAppService usually invokes an edge function which handles DB insertion if configured.
      // If we insert manually here, we assume the service doesn't auto-insert or we handle duplication.
      // Let's insert manually for immediate feedback:
      
      await MetaWhatsAppService.storeMessage({
        customerId: customer.id,
        phoneNumber: customer.phone_number,
        direction: 'outgoing',
        text: newMessage,
        status: 'sent'
      });

      setNewMessage('');
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to send", description: error.message });
    } finally {
      setSending(false);
    }
  };

  if (!customer) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{customer.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-slate-900">{customer.full_name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {customer.phone_number}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-slate-500" /></Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isOutgoing = msg.direction === 'outgoing';
            return (
              <div 
                key={msg.id || index} 
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                    isOutgoing 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-900 rounded-bl-none border'
                  }`}
                >
                  <p className="text-sm">{msg.message_text}</p>
                  <div className={`text-[10px] mt-1 flex justify-end ${isOutgoing ? 'text-blue-100' : 'text-slate-400'}`}>
                    {format(new Date(msg.created_at), 'hh:mm a')}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSend} className="flex gap-2">
          <Button type="button" variant="ghost" size="icon" className="text-slate-500">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppConversationPanel;