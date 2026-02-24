import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { FabricService } from '@/services/FabricService';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const BulkDeleteModal = ({ isOpen, onClose, selectedIds, onSuccess }) => {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [result, setResult] = useState(null);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await FabricService.bulkDelete(selectedIds);
            setResult(res);
            if (res.success > 0) {
                toast({ title: "Deletion Complete", description: `Deleted ${res.success} items.` });
                onSuccess(selectedIds.filter(id => !res.errors.length)); // Pass deleted
            } else if (res.failed > 0 && res.success === 0) {
                 toast({ variant: 'destructive', title: "Deletion Failed", description: "Could not delete selected items due to dependencies." });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.length} items?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. Items with dependencies (e.g. Finish Fabrics) will NOT be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {result && (
                    <div className="bg-slate-50 p-4 rounded-md space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-green-600 font-semibold">Deleted: {result.success}</span>
                            <span className="text-red-600 font-semibold">Failed: {result.failed}</span>
                        </div>
                        
                        {(result.dependencies?.length > 0 || result.errors?.length > 0) && (
                            <div className="border rounded bg-white mt-2">
                                <div className="bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border-b">
                                    Issues ({result.dependencies.length + result.errors.length})
                                </div>
                                <ScrollArea className="h-[100px] p-2">
                                    {result.dependencies?.map((dep, i) => (
                                        <div key={`dep-${i}`} className="text-red-500 text-xs mb-1">
                                            ID {dep.id}: {dep.reason}
                                        </div>
                                    ))}
                                    {result.errors?.map((err, i) => (
                                        <div key={`err-${i}`} className="text-red-500 text-xs mb-1">
                                            {err.message}
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        {result ? 'Close' : 'Cancel'}
                    </AlertDialogCancel>
                    {!result && (
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default BulkDeleteModal;