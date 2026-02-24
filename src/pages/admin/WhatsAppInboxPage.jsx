import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ConversationList from '@/components/admin/whatsapp/ConversationList';
import MessageThread from '@/components/admin/whatsapp/MessageThread';
import MessageInput from '@/components/admin/whatsapp/MessageInput';
import CustomerInfo from '@/components/admin/whatsapp/CustomerInfo';

const WhatsAppInboxPage = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100 border rounded-lg shadow-sm">
      <Helmet><title>WhatsApp Inbox - Admin</title></Helmet>
      
      <ConversationList 
        onSelectConversation={setSelectedConversation}
        selectedId={selectedConversation?.id}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MessageThread conversation={selectedConversation} />
        <MessageInput conversation={selectedConversation} />
      </div>

      <CustomerInfo conversation={selectedConversation} />
    </div>
  );
};

export default WhatsAppInboxPage;