import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Eye } from 'lucide-react';

const DesignSetCard = ({ set, onEdit, onDelete, onView }) => {
    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video bg-slate-100">
                {set.set_photo_url ? (
                    <img src={set.set_photo_url} alt={set.master_design_number} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-300">No Image</div>
                )}
                <Badge className="absolute top-2 right-2 bg-white text-black hover:bg-white">{set.type}</Badge>
            </div>
            <CardContent className="p-4">
                <div className="mb-2">
                    <h3 className="font-bold text-lg">{set.master_design_number}</h3>
                    {set.design_name && <p className="text-sm text-muted-foreground">{set.design_name}</p>}
                </div>
                
                <div className="space-y-1 mb-4">
                     <p className="text-xs font-semibold text-slate-500">COMPONENTS:</p>
                     {/* We assume components might be joined or passed as count if simple card, 
                         but normally we'd pass full object. For display: */}
                     <div className="flex flex-wrap gap-1">
                         {set.components && set.components.slice(0, 3).map((c, i) => (
                             <Badge key={i} variant="secondary" className="text-[10px]">{c.component_type}: {c.design_number}</Badge>
                         ))}
                         {set.components && set.components.length > 3 && (
                             <Badge variant="secondary" className="text-[10px]">+{set.components.length - 3}</Badge>
                         )}
                     </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                    {onView && <Button size="icon" variant="ghost" onClick={() => onView(set)}><Eye className="h-4 w-4"/></Button>}
                    {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(set)}><Edit2 className="h-4 w-4"/></Button>}
                    {onDelete && <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(set)}><Trash2 className="h-4 w-4"/></Button>}
                </div>
            </CardContent>
        </Card>
    );
};

export default DesignSetCard;