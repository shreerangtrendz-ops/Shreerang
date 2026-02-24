import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { AppsmithService } from '@/services/AppsmithService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const AppsmithDashboard = ({ type = 'inventory' }) => {
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0); // Force iframe reload

  const embedUrl = AppsmithService.getEmbedUrl(type);

  if (!embedUrl) {
    return (
      <Card className="p-8 text-center text-red-500 bg-red-50">
        Error: Appsmith Embed URL not configured. Please check .env file.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="font-semibold capitalize text-slate-700">{type} Dashboard</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); setKey(prev => prev + 1); }}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(embedUrl, '_blank')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative w-full h-[800px] bg-slate-50">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
            <LoadingSpinner text="Loading Analytics..." />
          </div>
        )}
        <iframe
          key={key}
          src={embedUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          title="Appsmith Dashboard"
        />
      </div>
    </Card>
  );
};

export default AppsmithDashboard;