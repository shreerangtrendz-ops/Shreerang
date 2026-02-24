import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, User, MessageSquare, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';

const WhatsAppConversationDashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    fetchConversations();
    
    // Realtime subscription
    const channel = supabase
      .channel('public:conversations_extended')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations_extended' }, (payload) => {
          fetchConversations(); // Refresh list on new message
          if (selectedConversation && payload.new.customer_id === selectedConversation.customer_id) {
             setMessages(prev => [...prev, payload.new]);
          }
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [selectedConversation]);

  const fetchConversations = async () => {
    // Determine unique customers from conversations table and get last message
    // Simplified: fetch all distinct customers who have messages
    const { data, error } = await supabase
      .from('customers')
      .select('*, conversations_extended(id, message_text, direction, timestamp, status)')
      .order('last_contact', { ascending: false });

    if (!error) {
       // Process to get last message for preview
       const processed = data.map(c => ({
         ...c,
         last_message: c.conversations_extended?.[c.conversations_extended.length - 1] || {}
       })).filter(c => c.conversations_extended?.length > 0); // Only showing active
       setConversations(processed);
    }
    setLoading(false);
  };
  
  const handleSelectConversation = async (customer) => {
    setSelectedConversation(customer);
    // Fetch full history
    const { data } = await supabase
       .from('conversations_extended')
       .select('*')
       .eq('customer_id', customer.id)
       .order('timestamp', { ascending: true });
    setMessages(data || []);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    
    // Insert outbound message
    const { error } = await supabase.from('conversations_extended').insert({
       customer_id: selectedConversation.id,
       phone_number: selectedConversation.phone,
       message_text: replyText,
       direction: 'outbound',
       status: 'sent',
       timestamp: new Date().toISOString()
    });

    if (!error) {
       setReplyText('');
       // Update local state immediately for UX
       setMessages(prev => [...prev, {
          message_text: replyText,
          direction: 'outbound',
          timestamp: new Date().toISOString()
       }]);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4 bg-slate-100">
      {/* Sidebar List */}
      <Card className="w-1/3 flex flex-col">
        <div className="p-4 border-b space-y-4">
           <h2 className="font-bold text-lg flex items-center gap-2">
             <MessageSquare className="h-5 w-5" /> Inbox
           </h2>
           <div className="relative">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
             <Input placeholder="Search customers..." className="pl-8" />
           </div>
        </div>
        <ScrollArea className="flex-1">
           <div className="divide-y">
             {conversations.map(conv => (
               <div 
                 key={conv.id} 
                 className={`p-4 cursor-pointer hover:bg-slate-50 ${selectedConversation?.id === conv.id ? 'bg-blue-50' : ''}`}
                 onClick={() => handleSelectConversation(conv)}
               >
                 <div className="flex justify-between items-start mb-1">
                   <span className="font-semibold text-slate-900">{conv.name || conv.phone}</span>
                   <span className="text-xs text-slate-500">
                      {conv.last_message.timestamp ? format(new Date(conv.last_message.timestamp), 'HH:mm') : ''}
                   </span>
                 </div>
                 <p className="text-sm text-slate-600 truncate">{conv.last_message.message_text}</p>
                 <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-xs">{conv.tier}</Badge>
                    {conv.company_name && <Badge variant="secondary" className="text-xs">{conv.company_name}</Badge>}
                 </div>
               </div>
             ))}
           </div>
        </ScrollArea>
      </Card>

      {/* Conversation View */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-lg">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                     {selectedConversation.name?.[0] || 'C'}
                  </div>
                  <div>
                     <h3 className="font-bold">{selectedConversation.name}</h3>
                     <p className="text-xs text-slate-500">{selectedConversation.phone} • {selectedConversation.business_type}</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm">Archive</Button>
                  <Button variant="outline" size="sm">Customer Profile</Button>
               </div>
            </div>
            
            <ScrollArea className="flex-1 p-4 bg-slate-50">
               <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          msg.direction === 'outbound' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white border shadow-sm rounded-bl-none'
                       }`}>
                          <p>{msg.message_text}</p>
                          <span className={`text-[10px] block mt-1 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-slate-400'}`}>
                             {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                       </div>
                    </div>
                  ))}
               </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-white rounded-b-lg">
               <div className="flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <Button onClick={handleSendReply}>
                     <Send className="h-4 w-4" />
                  </Button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
             Select a conversation to start messaging
          </div>
        )}
      </Card>
      
      {/* Right Sidebar (Customer Info) */}
      {selectedConversation && (
        <Card className="w-80 p-4 border-l">
           <CardHeader className="px-0 pt-0"><CardTitle>Customer Details</CardTitle></CardHeader>
           <div className="space-y-4 text-sm">
              <div>
                 <label className="text-xs text-slate-500">Business</label>
                 <p className="font-medium">{selectedConversation.company_name || '-'}</p>
              </div>
              <div>
                 <label className="text-xs text-slate-500">Tier</label>
                 <Badge className={selectedConversation.tier === 'VIP' ? 'bg-amber-500' : 'bg-blue-500'}>
                    {selectedConversation.tier}
                 </Badge>
              </div>
              <div>
                 <label className="text-xs text-slate-500">Email</label>
                 <p>{selectedConversation.email}</p>
              </div>
              <div>
                 <label className="text-xs text-slate-500">GST</label>
                 <p>{selectedConversation.gst_number || '-'}</p>
              </div>
              <div>
                 <label className="text-xs text-slate-500">Location</label>
                 <p>{selectedConversation.location || '-'}</p>
              </div>
           </div>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppConversationDashboard;