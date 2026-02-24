import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SelectedItemsList = ({ items, onUpdateItem, onRemoveItem }) => {
  const calculateTotal = (qty, rate) => (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

  const handleChange = (id, field, value) => {
    const item = items.find(i => i.tempId === id);
    if (!item) return;

    const updates = { [field]: value };
    if (field === 'qty' || field === 'rate') {
        const qty = field === 'qty' ? value : item.qty;
        const rate = field === 'rate' ? value : item.rate;
        updates.total = calculateTotal(qty, rate);
    }
    onUpdateItem(id, updates);
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Items in Order ({items.length})</h3>
            <div className="text-xs text-muted-foreground">
                Total Qty: <span className="font-medium text-slate-900">{items.reduce((sum, i) => sum + (parseFloat(i.qty)||0), 0)}</span>
            </div>
        </div>
        
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[250px]">Item Details</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead className="w-[100px] text-right">Rate</TableHead>
                    <TableHead className="w-[100px] text-right">Total</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            No items selected. Browse items on the left to add.
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((item) => (
                        <TableRow key={item.tempId}>
                            <TableCell>
                                <div className="font-medium text-sm">{item.itemName}</div>
                                <Badge variant="outline" className="text-[10px] mt-1 text-slate-500 font-normal">
                                    {item.type.replace(/_/g, ' ')}
                                </Badge>
                                {item.missingFields?.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-1">
                                         {item.missingFields.slice(0, 2).map((f, i) => (
                                             <span key={i} className="text-[9px] text-red-500 bg-red-50 px-1 rounded">Missing: {f.field}</span>
                                         ))}
                                         {item.missingFields.length > 2 && <span className="text-[9px] text-red-500">+{item.missingFields.length - 2} more</span>}
                                     </div>
                                )}
                            </TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    className="h-8 text-xs" 
                                    value={item.qty} 
                                    onChange={(e) => handleChange(item.tempId, 'qty', e.target.value)}
                                    min="1"
                                />
                            </TableCell>
                            <TableCell>
                                <Select value={item.unit} onValueChange={(v) => handleChange(item.tempId, 'unit', v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Mtr">Mtr</SelectItem>
                                        <SelectItem value="Kg">Kg</SelectItem>
                                        <SelectItem value="Pcs">Pcs</SelectItem>
                                        <SelectItem value="Yards">Yards</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                                <Input 
                                    type="number" 
                                    className="h-8 text-xs text-right" 
                                    value={item.rate} 
                                    onChange={(e) => handleChange(item.tempId, 'rate', e.target.value)}
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                                ₹{item.total.toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {item.isComplete ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                            <CheckCircle className="h-3 w-3" /> Complete
                                        </Badge>
                                    ) : (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 gap-1 cursor-help">
                                                        <AlertTriangle className="h-3 w-3" /> {item.completionPercentage}%
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">Item specs incomplete</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onRemoveItem(item.tempId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    </div>
  );
};

export default SelectedItemsList;