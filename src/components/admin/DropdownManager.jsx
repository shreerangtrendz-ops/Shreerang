import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { DropdownService } from '@/services/DropdownService';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const DropdownManager = ({ isOpen, onClose, category, title }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOption, setNewOption] = useState({ value: '', label: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ value: '', label: '' });
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && category) {
      fetchOptions();
    }
  }, [isOpen, category]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const data = await DropdownService.getOptions(category);
      setOptions(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load options' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newOption.value || !newOption.label) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Value and Label are required' });
      return;
    }
    try {
      await DropdownService.addOption(category, newOption.value, newOption.label);
      setNewOption({ value: '', label: '' });
      fetchOptions();
      toast({ title: 'Success', description: 'Option added successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const startEdit = (option) => {
    setEditingId(option.id);
    setEditForm({ value: option.value, label: option.label });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ value: '', label: '' });
  };

  const handleUpdate = async () => {
    try {
      await DropdownService.updateOption(editingId, editForm);
      setEditingId(null);
      fetchOptions();
      toast({ title: 'Success', description: 'Option updated successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const confirmDelete = async () => {
    try {
      await DropdownService.deleteOption(deleteId);
      setDeleteId(null);
      fetchOptions();
      toast({ title: 'Success', description: 'Option deleted successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage {title} Options</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="flex gap-2 mb-6 items-end border-b pb-4">
              <div className="space-y-2 flex-1">
                <Label>New Value</Label>
                <Input 
                  placeholder="e.g. cotton_60" 
                  value={newOption.value} 
                  onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>New Label</Label>
                <Input 
                  placeholder="e.g. Cotton 60x60" 
                  value={newOption.label} 
                  onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <Button onClick={handleAdd} className="mb-0.5"><Plus className="w-4 h-4 mr-2" /> Add</Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell>
                        {editingId === option.id ? (
                          <Input value={editForm.value} onChange={(e) => setEditForm(prev => ({...prev, value: e.target.value}))} />
                        ) : option.value}
                      </TableCell>
                      <TableCell>
                         {editingId === option.id ? (
                          <Input value={editForm.label} onChange={(e) => setEditForm(prev => ({...prev, label: e.target.value}))} />
                        ) : option.label}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === option.id ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={handleUpdate}><Save className="w-4 h-4 text-green-600" /></Button>
                              <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4 text-slate-500" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => startEdit(option)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteId(option.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {options.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-500">No options found</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this option.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DropdownManager;