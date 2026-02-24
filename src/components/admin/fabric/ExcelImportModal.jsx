import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { ExcelImportService } from '@/services/ExcelImportService';
import { ScrollArea } from '@/components/ui/scroll-area';

const ExcelImportModal = ({ trigger, isOpen: controlledIsOpen, onClose, type }) => {
    const { toast } = useToast();
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    
    const [file, setFile] = useState(null);
    const [category, setCategory] = useState(type || 'base_fabric');
    const [status, setStatus] = useState('idle'); // idle, validating, importing, success, error
    const [validationResult, setValidationResult] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (type) setCategory(type);
    }, [type]);

    const handleOpenChange = (open) => {
        if (onClose) onClose(open);
        setInternalIsOpen(open);
        if (!open) resetState();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setValidationResult(null);
        }
    };

    const handleValidation = async () => {
        if (!file || !category) return;
        
        setStatus('validating');
        try {
            const result = await ExcelImportService.processImport(file, category, { dryRun: true });
            setValidationResult(result);
            setStatus(result.success ? 'validated' : 'error');
        } catch (error) {
            setStatus('error');
            setValidationResult({ success: false, error: error.message });
        }
    };

    const handleImport = async () => {
        if (!file || !category) return;

        setStatus('importing');
        try {
            const result = await ExcelImportService.processImport(file, category, { dryRun: false });
            if (result.success) {
                setStatus('success');
                toast({
                    title: "Import Successful",
                    description: `Imported ${result.importedCount} records successfully.`
                });
            } else {
                setStatus('error');
                setValidationResult(result);
            }
        } catch (error) {
            setStatus('error');
            toast({ variant: 'destructive', title: "Import Failed", description: error.message });
        }
    };

    const resetState = () => {
        setFile(null);
        if (!type) setCategory('base_fabric');
        setStatus('idle');
        setValidationResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Bulk Import: {category.replace('_', ' ').toUpperCase()}</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file (.xlsx) or CSV to bulk import data.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Category Selection - Disabled if passed as prop */}
                    <div className="space-y-2">
                        <Label>Import Type</Label>
                        <Select value={category} onValueChange={setCategory} disabled={status === 'importing' || !!type}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="base_fabric">Base Fabric (Griege)</SelectItem>
                                <SelectItem value="finish_fabric">Finish Fabric</SelectItem>
                                <SelectItem value="fancy_finish">Fancy Finish</SelectItem>
                                <SelectItem value="supplier">Supplier Master</SelectItem>
                                <SelectItem value="job_worker">Job Worker Master</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label>Upload File</Label>
                        <div className="flex gap-4 items-center">
                            <Input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".xlsx, .csv" 
                                onChange={handleFileChange} 
                                disabled={status === 'importing'}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .csv</p>
                    </div>

                    {/* Validation Results Area */}
                    {status === 'validated' && validationResult && (
                        <div className="space-y-4">
                            <Alert className="bg-blue-50 border-blue-200">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Validation Successful</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Found {validationResult.validCount} valid records out of {validationResult.total}.
                                    {validationResult.errors?.length > 0 && (
                                        <span className="block mt-1 font-medium text-red-600">
                                            Warning: {validationResult.errors.length} rows have errors and will be skipped.
                                        </span>
                                    )}
                                </AlertDescription>
                            </Alert>

                            {/* Data Preview */}
                            {validationResult.preview?.length > 0 && (
                                <div className="border rounded-md">
                                    <div className="bg-slate-50 px-4 py-2 border-b text-xs font-semibold text-slate-500 uppercase">
                                        Data Preview (First 5 Rows)
                                    </div>
                                    <div className="max-h-[200px] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {Object.keys(validationResult.preview[0]).slice(0, 4).map(key => (
                                                        <TableHead key={key} className="h-8 text-xs">{key}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {validationResult.preview.map((row, i) => (
                                                    <TableRow key={i}>
                                                        {Object.values(row).slice(0, 4).map((val, j) => (
                                                            <TableCell key={j} className="py-2 text-xs">{val}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Display */}
                    {(status === 'error' || (validationResult?.errors?.length > 0 && status === 'validated')) && (
                        <div className="space-y-2">
                             <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                                <AlertTriangle className="h-4 w-4" /> Import Errors
                             </div>
                            <ScrollArea className="h-[150px] w-full rounded-md border p-4 bg-red-50/50">
                                {validationResult?.errors?.map((err, idx) => (
                                    <div key={idx} className="text-sm text-red-600 mb-1 pb-1 border-b border-red-100 last:border-0">
                                        <span className="font-bold">Row {err.row}:</span> {err.message}
                                    </div>
                                ))}
                                {validationResult?.error && (
                                    <div className="text-sm text-red-600 font-bold">{validationResult.error}</div>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg text-green-700">
                            <CheckCircle2 className="h-12 w-12 mb-2" />
                            <h3 className="font-bold text-lg">Import Complete!</h3>
                            <p>Data has been successfully added to the database.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {status === 'success' ? (
                        <Button onClick={() => handleOpenChange(false)}>Close</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={status === 'importing'}>
                                Cancel
                            </Button>
                            {status === 'idle' || status === 'error' ? (
                                <Button onClick={handleValidation} disabled={!file || !category}>
                                    {status === 'validating' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Validate Data'}
                                </Button>
                            ) : (
                                <Button onClick={handleImport} disabled={status === 'importing' || (status === 'validated' && validationResult?.preview?.length === 0)}>
                                    {status === 'importing' ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                                        </>
                                    ) : (
                                        'Start Import'
                                    )}
                                </Button>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExcelImportModal;