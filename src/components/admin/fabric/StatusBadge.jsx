import React from 'react';
import { Badge } from '@/components/ui/badge';

const StatusBadge = ({ status }) => {
  const getStatusColor = (s) => {
    switch (String(s).toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive': return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Badge variant="outline" className={`border-0 ${getStatusColor(status || 'active')}`}>
      {status || 'Active'}
    </Badge>
  );
};

export default StatusBadge;