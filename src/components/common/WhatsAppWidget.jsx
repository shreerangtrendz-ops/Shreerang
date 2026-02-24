import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WhatsAppWidget = () => {
  const phoneNumber = '917874200033';
  const defaultMessage = 'Hi! I am interested in your fabric collection.';
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg 
                       bg-gradient-to-br from-green-500 to-green-700 text-white 
                       flex items-center justify-center cursor-pointer 
                       transition-all duration-300 hover:scale-110 active:scale-95
                       lg:bottom-8 lg:right-8 group"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            whileHover={{ 
              scale: 1.1, 
              boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              transition: { duration: 0.2 } 
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Chat with us on WhatsApp"
          >
            <MessageCircle className="h-6 w-6 lg:h-8 lg:w-8" />
            
            {/* Pulse Animation Ring */}
            <motion.span
              className="absolute inset-0 rounded-full bg-green-500"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ 
                opacity: [0, 0.4, 0],
                scale: [1, 1.4, 1.8],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeOut",
                delay: 0.5,
              }}
            />
            
            {/* Tooltip text hidden visually but accessible */}
            <span className="sr-only">Chat with us on WhatsApp</span>
          </motion.a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-900 text-white font-medium border-slate-800 mr-2">
          Chat with us
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WhatsAppWidget;