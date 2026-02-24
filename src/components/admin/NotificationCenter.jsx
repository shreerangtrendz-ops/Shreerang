import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const sub = supabase
        .channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
        payload => {
           setNotifications(prev => [payload.new, ...prev]);
           setUnreadCount(prev => prev + 1);
        })
        .subscribe();
        
      return () => supabase.removeChannel(sub);
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(20);
    if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
                <Button variant="ghost" size="xs" onClick={markAllRead} className="h-auto px-2 py-1 text-xs">
                    Mark all read
                </Button>
            )}
        </div>
        <ScrollArea className="h-[300px]">
           {notifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                   <Bell className="h-8 w-8 mb-2 opacity-20"/>
                   <p className="text-sm">No notifications yet</p>
               </div>
           ) : (
               <div className="divide-y">
                   {notifications.map(n => (
                       <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                           <div className="flex justify-between items-start gap-2">
                               <div className="flex-1 space-y-1">
                                   <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                                   <p className="text-xs text-muted-foreground">{n.message}</p>
                                   <p className="text-[10px] text-muted-foreground pt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                               </div>
                               {!n.is_read && (
                                   <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-blue-500" onClick={() => markRead(n.id)}>
                                       <Check className="h-3 w-3" />
                                   </Button>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;