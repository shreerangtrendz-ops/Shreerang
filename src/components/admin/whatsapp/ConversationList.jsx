import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Circle } from 'lucide-react';

const ConversationList = ({ onSelectConversation, selectedId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConversations();
    
    // Real-time subscription
    const channel = supabase
      .channel('public:whatsapp_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, 
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customers ( name, id )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(c => 
    c.customers?.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone_number?.includes(search)
  );

  return (
    <div className="flex flex-col h-full border-r bg-white w-full md:w-80 lg:w-96">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search chat..." 
            className="pl-9 bg-slate-50" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-slate-500">Loading chats...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No conversations found</div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50
                  ${selectedId === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}
                `}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conv.customers?.name || conv.phone_number}`} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-medium truncate ${selectedId === conv.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {conv.customers?.name || conv.phone_number}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500 truncate pr-2">{conv.last_message || 'Attachment'}</p>
                    {conv.unread_count > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;