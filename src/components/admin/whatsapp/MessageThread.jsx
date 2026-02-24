import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, CheckCheck, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const MessageThread = ({ conversation }) => {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (conversation?.id) {
      fetchMessages(conversation.id);
      
      const channel = supabase
        .channel(`public:whatsapp_messages:conversation_id=eq.${conversation.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversation.id}`
        }, (payload) => {
          setMessages(current => [...current, payload.new]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (convId) => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-center">
          <p className="text-lg font-medium">WhatsApp Inbox</p>
          <p className="text-sm">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EFEAE2]">
      {/* Header */}
      <div className="h-16 px-4 flex items-center bg-white border-b shadow-sm z-10">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conversation.customers?.name || conversation.phone_number}`} />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-slate-900">{conversation.customers?.name || conversation.phone_number}</h3>
          <p className="text-xs text-slate-500">{conversation.phone_number}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="bg-white/60 text-slate-600 text-xs px-2 py-1 rounded shadow-sm">
                {format(new Date(date), 'MMMM d, yyyy')}
              </span>
            </div>
            {msgs.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div key={msg.id} className={`flex mb-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative group
                    ${isOutbound ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'}
                  `}>
                    {msg.message_type === 'image' && msg.media_url && (
                      <div className="mb-2 rounded overflow-hidden">
                        <img src={msg.media_url} alt="Shared" className="max-h-60 object-cover" />
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                    
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                      {isOutbound && (
                        <span className={`text-[10px] ${msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`}>
                          {msg.status === 'read' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>
    </div>
  );
};

export default MessageThread;