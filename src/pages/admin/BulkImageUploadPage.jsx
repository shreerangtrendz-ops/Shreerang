import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, X, Loader2, Wand2, Image as ImageIcon, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DesignUploadIntegration } from '@/services/DesignUploadIntegration';

const BulkImageUploadPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [finishFabrics, setFinishFabrics] = useState([]);
    const [selectedFinishId, setSelectedFinishId] = useState('');

    useEffect(() => {
        const fetchFabrics = async () => {
            const { data } = await supabase.from('finish_fabrics').select('id, finish_fabric_name').eq('status', 'active');
            setFinishFabrics(data || []);
        };
        fetchFabrics();
    }, []);

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setUploading(true);
        try {
            const processedItems = await DesignUploadIntegration.processUploads(selectedFiles, (prog) => {
                setProgress(prog);
            });
            setFiles(prev => [...prev, ...processedItems]);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error processing files' });
        } finally {
            setUploading(false);
            setProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleUpdateFileData = (id, field, value) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, data: { ...f.data, [field]: value } } : f));
    };

    const handleBulkSave = async () => {
        if (!selectedFinishId) return toast({ variant: 'destructive', title: 'Error', description: 'Please select a Finish Fabric to attach these designs to.' });
        
        const toUpload = files.filter(f => f.data.selected);
        if (toUpload.length === 0) return;

        setUploading(true);
        try {
            for (const item of toUpload) {
                // 1. Upload
                const fileName = `${Date.now()}-${item.file.name}`;
                const { error: upErr } = await supabase.storage.from('design-images').upload(fileName, item.file);
                if (upErr) throw upErr;
                
                const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(fileName);

                // 2. Insert into finish_fabric_designs (linking designs to the fabric quality)
                await supabase.from('finish_fabric_designs').insert({
                    finish_fabric_id: selectedFinishId,
                    design_number: item.data.design_number,
                    design_photo_url: publicUrl,
                    color_name: item.data.color,
                    ai_description: item.data.description,
                    status: 'active'
                });
            }
            
            toast({ title: 'Success', description: `${toUpload.length} designs saved.` });
            setFiles(prev => prev.filter(f => !f.data.selected));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Bulk Design Upload</title></Helmet>
            <AdminPageHeader 
                title="Bulk Design Upload" 
                breadcrumbs={[{label: 'Fabric Master', href: '/admin/fabric-master'}, {label: 'Design Upload'}]}
                onBack={() => navigate('/admin/fabric-master')}
            />

            <Card className="bg-slate-50 border-blue-100">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <Label>Select Target Finish Fabric</Label>
                            <Select value={selectedFinishId} onValueChange={setSelectedFinishId}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Select Fabric Quality..." /></SelectTrigger>
                                <SelectContent>
                                    {finishFabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.finish_fabric_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div 
                            className="border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg h-10 flex items-center justify-center cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                            <span className="text-blue-600 font-medium flex items-center gap-2 text-sm">
                                <UploadCloud className="h-4 w-4" /> Select Images
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {uploading && <Progress value={progress} className="h-2" />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {files.map((file) => (
                    <Card key={file.id} className={file.data.selected ? 'ring-2 ring-blue-500' : 'opacity-75'}>
                        <div className="aspect-video relative bg-slate-100">
                            <img src={file.preview} className="w-full h-full object-contain" alt="preview" />
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => handleRemoveFile(file.id)}><X className="h-3 w-3" /></Button>
                            <Checkbox checked={file.data.selected} onCheckedChange={(c) => handleUpdateFileData(file.id, 'selected', c)} className="absolute top-2 left-2 bg-white" />
                        </div>
                        <CardContent className="p-3 space-y-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] flex items-center gap-1"><Wand2 className="h-3 w-3"/> Design No (AI)</Label>
                                <Input value={file.data.design_number} onChange={(e) => handleUpdateFileData(file.id, 'design_number', e.target.value)} className="h-8 text-sm font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">Color</Label>
                                <Input value={file.data.color} onChange={(e) => handleUpdateFileData(file.id, 'color', e.target.value)} className="h-8 text-sm" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {files.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-lg">
                    <Button onClick={handleBulkSave} disabled={uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Designs
                    </Button>
                </div>
            )}
        </div>
    );
};

export default BulkImageUploadPage;