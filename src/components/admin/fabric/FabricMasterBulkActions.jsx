import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, FileDown, Edit2, MoreVertical } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { FabricService } from '@/services/FabricService';

const FabricMasterBulkActions = ({ selectedIds, onActionComplete, fabrics }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setProcessing(true);
    try {
      await FabricService.bulkDeleteFabrics(selectedIds);
      toast({ title: 'Bulk Delete', description: `Successfully deleted ${selectedIds.length} items.` });
      onActionComplete();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExport = () => {
    const selectedFabrics = fabrics.filter(f => selectedIds.includes(f.id));
    FabricService.exportFabricsToExcel(selectedFabrics, 'Selected_Fabrics.xlsx');
    toast({ title: 'Export Started', description: 'Your file is downloading.' });
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
      <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
      
      <div className="h-4 w-px bg-indigo-200 mx-2" />
      
      <Button size="sm" variant="ghost" className="text-indigo-700 hover:bg-indigo-100" onClick={handleExport}>
        <FileDown className="h-4 w-4 mr-2" /> Export
      </Button>

      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setShowDeleteDialog(true)}>
        <Trash2 className="h-4 w-4 mr-2" /> Delete
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} selected fabrics. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {processing ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FabricMasterBulkActions;