import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const SKUPreview = ({ generatedName, generatedSKU, className }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!generatedSKU) return;
    navigator.clipboard.writeText(generatedSKU);
    setCopied(true);
    toast({ description: "SKU copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn("bg-slate-50 border-dashed border-2", className)}>
      <CardContent className="p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Name</label>
          <div className="text-sm font-medium text-slate-900 mt-1">
            {generatedName || <span className="text-slate-400 italic">Complete the form to generate name</span>}
          </div>
        </div>
        
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated SKU</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="bg-white px-3 py-1 rounded border font-mono text-lg text-blue-600 font-bold tracking-wide">
              {generatedSKU || "---"}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              disabled={!generatedSKU}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SKUPreview;