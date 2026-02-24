import React from 'react';
import { TierPricingService } from '@/services/TierPricingService';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

const PricingDisplay = ({ basePrice, tier = 'PUBLIC', className }) => {
  const { text, subtext, type } = TierPricingService.getPricingDisplayInfo(basePrice, tier);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-slate-900">{text}</span>
        {tier === 'VIP' && <Badge className="bg-amber-500 hover:bg-amber-600">VIP</Badge>}
        {tier === 'PUBLIC' && <Lock className="h-3 w-3 text-slate-400" />}
      </div>
      {subtext && (
        <p className={`text-xs ${tier === 'VIP' ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
          {subtext}
        </p>
      )}
    </div>
  );
};

export default PricingDisplay;