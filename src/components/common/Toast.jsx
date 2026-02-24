// Using Shadcn UI Toaster instead as requested in file list context but implementing wrapper if needed.
// However, the prompt asked to CREATE Toast.jsx. Since Shadcn uses Toaster in App.jsx and useToast hook,
// creating a separate standalone Toast component might conflict or be redundant if not integrated.
// I will create a simple visual component that COULD be used, but primarily rely on existing UI.
// Actually, let's strictly follow the request to create the component structure.

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-orange-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  return (
    <div className={cn("fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all animate-in slide-in-from-right", styles[type])}>
      {icons[type]}
      <p className="font-medium text-sm">{message}</p>
      <button onClick={onClose} className="ml-auto hover:bg-white/20 rounded-full p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;