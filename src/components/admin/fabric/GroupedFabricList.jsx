import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const GroupedFabricList = ({ 
    data, 
    groupBy, 
    columns, 
    renderRow, 
    onToggleStar, 
    selectedIds, 
    onSelectOne, 
    onSelectGroup 
}) => {
    const [expandedGroups, setExpandedGroups] = useState({});

    // Grouping Logic
    const grouped = data.reduce((acc, item) => {
        // Handle nested properties (e.g. 'base_fabrics.base_fabric_name')
        let key = 'Uncategorized';
        if (groupBy.includes('.')) {
            const parts = groupBy.split('.');
            key = item[parts[0]]?.[parts[1]] || 'Uncategorized';
        } else {
            key = item[groupBy] || 'Uncategorized';
        }
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const groupKeys = Object.keys(grouped).sort();

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Auto-expand if fewer groups
    useEffect(() => {
        if(groupKeys.length < 5) {
            const allExpanded = groupKeys.reduce((acc, k) => ({...acc, [k]: true}), {});
            setExpandedGroups(allExpanded);
        }
    }, [data.length, groupKeys.length]);

    return (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="w-[50px]"></TableHead>
                        {columns.map((col, i) => (
                            <TableHead key={i} className={cn("text-xs uppercase font-semibold text-slate-500", col.className)}>
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupKeys.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                                No items found matching your criteria.
                            </TableCell>
                        </TableRow>
                    ) : groupKeys.map(groupKey => {
                        const items = grouped[groupKey];
                        const isExpanded = expandedGroups[groupKey];
                        
                        // Sort favorites to top within group
                        const sortedItems = [...items].sort((a, b) => (b.is_starred === true) - (a.is_starred === true));
                        
                        const starredCount = items.filter(i => i.is_starred).length;
                        const allSelected = items.length > 0 && items.every(i => selectedIds.includes(i.id));
                        const someSelected = items.some(i => selectedIds.includes(i.id));

                        return (
                            <React.Fragment key={groupKey}>
                                {/* Group Header */}
                                <TableRow className="bg-slate-50/80 hover:bg-slate-100 transition-colors border-b border-slate-100">
                                    <TableCell className="p-2 text-center">
                                        <Checkbox 
                                            checked={allSelected} 
                                            onCheckedChange={(checked) => onSelectGroup(items, checked)}
                                            className={cn(someSelected && !allSelected && "opacity-50")}
                                        />
                                    </TableCell>
                                    <TableCell colSpan={columns.length} className="p-0">
                                        <div 
                                            className="flex items-center justify-between p-3 cursor-pointer select-none"
                                            onClick={() => toggleGroup(groupKey)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500"/> : <ChevronRight className="h-4 w-4 text-slate-500"/>}
                                                <span className="font-bold text-sm text-slate-800">{groupKey}</span>
                                                <Badge variant="secondary" className="rounded-full px-2 h-5 text-[10px] bg-slate-200 text-slate-700">
                                                    {items.length} items
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground pr-4">
                                                {starredCount > 0 && (
                                                    <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                        <Star className="h-3 w-3 mr-1 fill-current"/> {starredCount} Favorites
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* Group Items */}
                                {isExpanded && sortedItems.map((item, idx) => (
                                    <TableRow 
                                        key={item.id} 
                                        className={cn(
                                            "group hover:bg-slate-50/50 transition-colors",
                                            item.is_starred && "bg-amber-50/10"
                                        )}
                                    >
                                        <TableCell className="text-center py-3">
                                            <Checkbox 
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => onSelectOne(item.id, checked)}
                                            />
                                        </TableCell>
                                        {renderRow(item)}
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default GroupedFabricList;