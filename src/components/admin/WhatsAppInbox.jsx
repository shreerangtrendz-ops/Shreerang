import React, { useState, useEffect } from 'react';
import { Search, Send, Paperclip, Phone, MoreVertical, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WhatsAppService } from '@/services/WhatsAppService';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await WhatsAppService.fetchConversations();
      setConversations(data);
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0]);
      }
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedChat) return;
    try {
      await WhatsAppService.sendMessage(selectedChat.phone, messageText);
      setMessageText("");
      // Ideally refresh messages here
    } catch (error) {
      console.error("Failed to send", error);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FormErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp Inbox
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search chats..." 
                className="pl-9 bg-white" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-100">
              {filteredConversations.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${chat.customerName}`} />
                      <AvatarFallback>{chat.customerName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-medium text-slate-900 truncate">{chat.customerName}</h3>
                        <span className="text-[10px] text-slate-400">
                          {new Date(chat.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <span className="bg-green-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {selectedChat ? (
            <>
              {/* Header */}
              <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedChat.customerName}`} />
                      <AvatarFallback>{selectedChat.customerName.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-slate-900">{selectedChat.customerName}</h3>
                      <p className="text-xs text-slate-500">{selectedChat.phone}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon"><Phone className="h-4 w-4 text-slate-500" /></Button>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4 text-slate-500" /></Button>
                </div>
              </div>

              {/* Messages - Placeholder for real messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-full">Today</span>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-3 max-w-[70%] shadow-sm">
                      <p className="text-sm text-slate-800">Hello, I am interested in the new Floral Print collection.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">10:00 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-green-100 border border-green-200 rounded-lg rounded-tr-none p-3 max-w-[70%] shadow-sm">
                      <p className="text-sm text-slate-800">Hi! Yes, we have new arrivals. Check our catalog link.</p>
                      <span className="text-[10px] text-green-700/60 mt-1 block text-right">10:05 AM</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2 items-center">
                  <Button variant="ghost" size="icon" className="shrink-0 text-slate-400">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input 
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-50"
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <Button onClick={handleSend} className="shrink-0 bg-green-600 hover:bg-green-700">
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
        </div>
      </div>
    </FormErrorBoundary>
  );
};

export default WhatsAppInbox;