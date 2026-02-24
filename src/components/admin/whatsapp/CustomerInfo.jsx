import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CustomerInfo = ({ conversation }) => {
  if (!conversation) return null;

  return (
    <div className="w-80 bg-white border-l h-full flex flex-col hidden lg:flex">
      <div className="p-6 flex flex-col items-center border-b">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conversation.customers?.name || conversation.phone_number}`} />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-semibold text-center">{conversation.customers?.name || 'Unknown Customer'}</h3>
        <p className="text-slate-500 text-sm mt-1">{conversation.phone_number}</p>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-slate-900">Contact Details</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Phone className="h-4 w-4" />
              <span>{conversation.phone_number}</span>
            </div>
            {conversation.customers?.email && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                <span>{conversation.customers.email}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-slate-900">Recent Orders</h4>
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-indigo-600">View All</Button>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="h-4 w-4 text-slate-400" />
              <span className="font-medium">No recent orders found</span>
            </div>
            <p className="text-xs text-slate-500 pl-6">Link orders to this customer to see them here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfo;