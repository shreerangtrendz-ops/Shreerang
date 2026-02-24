import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, MessageSquare, Save, Loader2 } from 'lucide-react';
import { ImageCompressionService } from '@/lib/ImageCompressionService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';

const WhatsAppImageUploadHandler = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [designNumber, setDesignNumber] = useState('');
    const [finishFabrics, setFinishFabrics] = useState([]);
    const [selectedFinish, setSelectedFinish] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchFinishes = async () => {
            const { data } = await supabase.from('finish_fabrics').select('id, finish_fabric_name');
            if (data) setFinishFabrics(data);
        };
        fetchFinishes();
    }, []);

    const handleFileSelect = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
            // Auto-guess design number from filename (e.g. "IMG-2024-WA0001.jpg" -> "WA0001")
            // Or just allow user to type
            setDesignNumber(f.name.split('.')[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedFinish || !designNumber) {
            return toast({ variant: 'destructive', title: "Required", description: "Please fill all fields." });
        }

        setUploading(true);
        try {
            // 1. Compress
            const compressed = await ImageCompressionService.compressImage(file);
            
            // 2. Upload
            const fileName = `whatsapp/${Date.now()}_${designNumber}`;
            const { error: uploadError } = await supabase.storage.from('design-images').upload(fileName, compressed);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(fileName);

            // 3. Insert
            const { error: dbError } = await supabase.from('finish_fabric_designs').insert({
                finish_fabric_id: selectedFinish,
                design_number: designNumber,
                design_photo_url: publicUrl,
                upload_source: 'whatsapp_manual',
                original_size: file.size,
                compressed_size: compressed.size
            });

            if (dbError) throw dbError;

            toast({ title: "Success", description: "WhatsApp image processed successfully." });
            setFile(null);
            setPreview(null);
            setDesignNumber('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <Helmet><title>WhatsApp Upload</title></Helmet>
            <AdminPageHeader 
                title="WhatsApp Image Handler" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'WhatsApp Upload'}]}
                onBack={() => navigate('/admin')}
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600"/> Manual Processing</CardTitle>
                    <CardDescription>Upload images received from customers via WhatsApp to add them to inventory.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">1. Select Image</label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 cursor-pointer relative h-48">
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect}/>
                                {preview ? (
                                    <img src={preview} alt="Preview" className="h-full object-contain"/>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-slate-400 mb-2"/>
                                        <span className="text-sm text-muted-foreground">Click to upload</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">2. Assign to Fabric</label>
                                <Select value={selectedFinish} onValueChange={setSelectedFinish}>
                                    <SelectTrigger><SelectValue placeholder="Select Finish Fabric" /></SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {finishFabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.finish_fabric_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">3. Design Number</label>
                                <Input value={designNumber} onChange={e => setDesignNumber(e.target.value)} placeholder="Enter Design No." />
                            </div>

                            <Button className="w-full gap-2" onClick={handleUpload} disabled={uploading}>
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                Save to Inventory
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppImageUploadHandler;