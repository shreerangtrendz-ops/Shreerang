import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { BulkDeleteService } from '@/services/BulkDeleteService';

const BulkDeleteModal = ({ isOpen, onClose, selectedIds, type, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [dependencies, setDependencies] = useState([]);
    const [confirmCascade, setConfirmCascade] = useState(false);
    const [step, setStep] = useState('check'); // check, confirm, deleting, done

    useEffect(() => {
        if (isOpen && selectedIds.length > 0) {
            checkDependencies();
        } else {
            setStep('check');
            setDependencies([]);
            setConfirmCascade(false);
        }
    }, [isOpen, selectedIds]);

    const checkDependencies = async () => {
        setLoading(true);
        try {
            let deps = [];
            if (type === 'base_fabric') {
                deps = await BulkDeleteService.checkBaseFabricDependencies(selectedIds);
            } else if (type === 'finish_fabric') {
                deps = await BulkDeleteService.checkFinishFabricDependencies(selectedIds);
            }
            setDependencies(deps);
            setStep('confirm');
        } catch (error) {
            console.error(error);
            setStep('confirm'); // proceed anyway
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setStep('deleting');
        try {
            if (type === 'base_fabric') {
                await BulkDeleteService.deleteBaseFabrics(selectedIds, confirmCascade);
            } else if (type === 'finish_fabric') {
                await BulkDeleteService.deleteFinishFabrics(selectedIds, confirmCascade);
            }
            if (onComplete) onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            // Handle error state if needed
        } finally {
            setLoading(false);
        }
    };

    const hasDependencies = dependencies.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" /> Bulk Delete {selectedIds.length} Items
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete these items? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                {step === 'check' && (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                )}

                {step === 'confirm' && (
                    <div className="space-y-4 py-4">
                        {hasDependencies ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Dependencies Detected</AlertTitle>
                                <AlertDescription>
                                    Some items have related records:
                                    <ul className="list-disc pl-5 mt-2 text-xs max-h-32 overflow-y-auto">
                                        {dependencies.map((d, i) => (
                                            <li key={i}>{d.message}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="text-sm text-slate-500">
                                No dependencies found. Safe to delete.
                            </div>
                        )}

                        {hasDependencies && (
                            <div className="flex items-start space-x-2 pt-2 bg-red-50 p-3 rounded-md">
                                <Checkbox 
                                    id="cascade" 
                                    checked={confirmCascade} 
                                    onCheckedChange={setConfirmCascade}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="cascade"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-900"
                                    >
                                        Delete all dependent items
                                    </label>
                                    <p className="text-xs text-red-700">
                                        This will permanently delete all related finish fabrics, designs, and fancy fabrics.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'deleting' && (
                    <div className="space-y-2 py-4">
                         <p className="text-sm text-center">Deleting records...</p>
                         <Progress value={66} className="w-full" />
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={loading || (hasDependencies && !confirmCascade)}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkDeleteModal;