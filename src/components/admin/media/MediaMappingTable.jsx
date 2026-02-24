import React from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, RefreshCcw, X, FileImage as FileIcon, FileImage as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

const MediaMappingTable = ({ 
  items, 
  onUpdateItem, 
  onRemoveItem, 
  onToggleSelect, 
  onSelectAll, 
  selectedCount, 
  totalCount,
  onRetryFailed 
}) => {
  return (
    <div className="border rounded-md shadow-sm bg-white">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-3">
          <Checkbox 
            checked={totalCount > 0 && selectedCount === totalCount}
            onCheckedChange={onSelectAll}
            aria-label="Select all files"
          />
          <span className="text-sm font-medium text-muted-foreground">
            {selectedCount} of {totalCount} selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetryFailed}>
            <RefreshCcw className="h-3 w-3 mr-2" />
            Retry Failed
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[auto_60px_2fr_2fr_2fr_100px_50px] gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase border-b bg-gray-50/50">
        <div className="w-4"></div>
        <div>Preview</div>
        <div>Original Filename</div>
        <div>SKU Mapping</div>
        <div>Alt Text</div>
        <div>Status</div>
        <div></div>
      </div>

      <ScrollArea className="h-[400px]">
        {items.length === 0 ? (
           <div className="h-32 flex items-center justify-center text-muted-foreground">
             No files added yet.
           </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "grid grid-cols-[auto_60px_2fr_2fr_2fr_100px_50px] gap-4 p-4 items-center hover:bg-slate-50 transition-colors",
                  item.status === 'error' && "bg-red-50/50"
                )}
              >
                <Checkbox 
                  checked={item.selected} 
                  onCheckedChange={(checked) => onToggleSelect(item.id, checked)}
                />
                
                <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden border">
                  {item.preview ? (
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileIcon className="h-6 w-6 text-slate-300" />
                  )}
                </div>

                <div className="truncate text-sm font-medium" title={item.file?.name || item.name}>
                  {item.file?.name || item.name}
                </div>

                <div>
                  <Input 
                    value={item.sku} 
                    onChange={(e) => onUpdateItem(item.id, 'sku', e.target.value)}
                    placeholder="Enter SKU..."
                    className="h-8"
                  />
                  {item.skuMatch && (
                     <span className="text-[10px] text-green-600 flex items-center mt-1">
                       <CheckCircle className="h-3 w-3 mr-1" /> Auto-matched
                     </span>
                  )}
                </div>

                <div>
                  <Input 
                    value={item.altText} 
                    onChange={(e) => onUpdateItem(item.id, 'altText', e.target.value)}
                    placeholder="Describe image..."
                    className="h-8"
                  />
                </div>

                <div>
                  {item.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                  {item.status === 'success' && <Badge className="bg-green-500">Uploaded</Badge>}
                  {item.status === 'error' && <Badge variant="destructive">Failed</Badge>}
                  {item.status === 'uploading' && <Badge className="bg-blue-500">Uploading...</Badge>}
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveItem(item.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MediaMappingTable;