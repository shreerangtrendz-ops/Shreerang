import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Smile, Paperclip, Loader2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { WhatsAppService } from '@/services/WhatsAppService';

const MessageInput = ({ conversation }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !conversation) return;
    
    setSending(true);
    try {
      await WhatsAppService.sendMessage(conversation.phone_number, text);
      setText('');
      // Optimistic update handles via subscription
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-white border-t flex items-center gap-2">
      <Button variant="ghost" size="icon" className="text-slate-500">
        <Paperclip className="h-5 w-5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-slate-500">
            <Smile className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-none" side="top" align="start">
          <EmojiPicker onEmojiClick={(emoji) => setText(prev => prev + emoji.emoji)} />
        </PopoverContent>
      </Popover>

      <Input 
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
        disabled={!conversation || sending}
      />

      <Button 
        onClick={handleSend} 
        disabled={!text.trim() || !conversation || sending}
        size="icon"
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
      </Button>
    </div>
  );
};

export default MessageInput;