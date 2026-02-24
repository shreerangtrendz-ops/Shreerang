import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import WhatsAppMessageModal from './WhatsAppMessageModal';

const WhatsAppButton = ({ data, type, variant = "outline", size = "sm" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsOpen(true)}
        className="text-green-600 border-green-200 hover:bg-green-50"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>
      <WhatsAppMessageModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        data={data}
        type={type}
      />
    </>
  );
};

export default WhatsAppButton;