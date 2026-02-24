import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CompletionChecklist = ({ orderDetails, items, isSubmitting }) => {
  const requirements = [
    { label: "Customer Selected", met: !!orderDetails.customerId },
    { label: "Delivery Date Set", met: !!orderDetails.deliveryDate },
    { label: "At least one item added", met: items.length > 0 },
    { label: "All items have specs completed", met: items.every(i => i.isComplete) },
    { label: "All quantities valid (> 0)", met: items.length > 0 && items.every(i => parseFloat(i.qty) > 0) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const progress = Math.round((metCount / requirements.length) * 100);
  const isReady = metCount === requirements.length;

  return (
    <Card>
        <CardHeader className="py-3 bg-slate-50 border-b">
            <CardTitle className="text-sm font-medium">Order Readiness</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                    <span>Completion</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className={`h-2 ${isReady ? 'bg-green-100' : 'bg-slate-100'}`} indicatorClassName={isReady ? 'bg-green-500' : 'bg-primary'} />
            </div>

            <div className="space-y-2">
                {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                            <XCircle className="h-4 w-4 text-slate-300" />
                        )}
                        <span className={req.met ? 'text-slate-700' : 'text-slate-400'}>{req.label}</span>
                    </div>
                ))}
            </div>

            {items.some(i => !i.isComplete) && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                    Warning: Some fabric items have missing specification fields. You can draft this order, but confirmation requires full specs.
                </div>
            )}
        </CardContent>
    </Card>
  );
};

export default CompletionChecklist;