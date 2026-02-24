import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DropzoneComponent from '@/components/common/DropzoneComponent';
import DynamicDropdown from '@/components/common/DynamicDropdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Save, FileImage, Sparkles, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const BulkUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // upload | review
  const { user } = useAuth();
  const { toast } = useToast();
  const [fabricOptions, setFabricOptions] = useState([]);

  // Fetch fabric options for dropdown reference (if needed directly, otherwise DynamicDropdown handles it)
  // We'll use DynamicDropdown for "Fabric Name" mapping if the user wants to categorize these designs
  
  const handleFilesDropped = (newFiles) => {
    const processed = newFiles.map(f => {
      // Auto-name: remove extension
      const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
      return {
        ...f,
        designNumber: nameWithoutExt,
        fabricId: '', // To be selected
        alias: '',
        description: '',
        status: 'pending'
      };
    });
    setFiles(prev => [...prev, ...processed]);
    if (processed.length > 0) setActiveTab('review');
    toast({ title: 'Files Added', description: `${processed.length} images ready for review.` });
  };

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const updateFile = (id, field, value) => {
    setFiles(files.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const generateAIDescription = (id) => {
    // Simulated AI generation
    updateFile(id, 'description', 'Elegant floral pattern with intricate detailing, suitable for premium ethnic wear. High-resolution print quality.');
    toast({ title: 'AI Magic', description: 'Description generated successfully!' });
  };

  const handleSaveAll = async () => {
    // Validation
    const invalidFiles = files.filter(f => !f.designNumber);
    if (invalidFiles.length > 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'All designs must have a Design Number.' });
      return;
    }
    
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of files) {
        if (item.status === 'uploaded') continue;

        try {
          // 1. Upload Image
          const fileExt = item.file.name.split('.').pop();
          const fileName = `${item.designNumber}-${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('design-images')
            .upload(filePath, item.file);
            
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('design-images').getPublicUrl(filePath);
          const imageUrl = publicUrlData.publicUrl;

          // 2. Insert Record
          const { error: dbError } = await supabase.from('designs').insert([{
            design_number: item.designNumber,
            // fabric_id: item.fabricId || null, // Optional if we select fabric
            alias: item.alias,
            description: item.description,
            image_url: imageUrl,
            created_by: user?.id
          }]);

          if (dbError) throw dbError;

          updateFile(item.id, 'status', 'uploaded');
          successCount++;
        } catch (error) {
          console.error(error);
          updateFile(item.id, 'status', 'error');
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({ title: 'Upload Complete', description: `Successfully saved ${successCount} designs.` });
        // Clear successfully uploaded files after a delay
        setTimeout(() => {
          setFiles(prev => prev.filter(f => f.status !== 'uploaded'));
          if (failCount === 0) setActiveTab('upload');
        }, 1500);
      }
      
      if (failCount > 0) {
        toast({ variant: 'destructive', title: 'Upload Issues', description: `Failed to save ${failCount} designs. Please check and retry.` });
      }

    } catch (error) {
       toast({ variant: 'destructive', title: 'System Error', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Bulk Upload | Admin</title></Helmet>
      <AdminPageHeader 
        title="Bulk Design Upload" 
        description="Upload multiple design images, auto-generate metadata, and organize efficiently." 
        breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Bulk Upload'}]}
      />

      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          1. Upload Files
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          disabled={files.length === 0}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          2. Review & Edit ({files.length})
        </button>
      </div>

      {activeTab === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Images</CardTitle>
            <CardDescription>Drag and drop design files here. We'll automatically extract design numbers from filenames.</CardDescription>
          </CardHeader>
          <CardContent>
            <DropzoneComponent onFilesDropped={handleFilesDropped} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'review' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Review Items</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFiles([])} disabled={uploading}>Clear All</Button>
              <Button onClick={handleSaveAll} disabled={uploading} className="bg-slate-900 text-white">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Designs
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {files.map((item, index) => (
              <Card key={item.id} className={`overflow-hidden transition-all ${item.status === 'uploaded' ? 'opacity-50 border-green-200 bg-green-50' : item.status === 'error' ? 'border-red-200 bg-red-50' : ''}`}>
                <CardContent className="p-4 flex flex-col md:flex-row gap-6">
                  {/* Image Preview */}
                  <div className="w-full md:w-48 shrink-0 flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden h-48 md:h-auto border">
                    <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Form Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase">Design Number *</label>
                      <Input 
                        value={item.designNumber} 
                        onChange={(e) => updateFile(item.id, 'designNumber', e.target.value)}
                        placeholder="e.g. D-1001"
                        className="font-mono font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase">Alias / Name</label>
                      <Input 
                        value={item.alias} 
                        onChange={(e) => updateFile(item.id, 'alias', e.target.value)}
                        placeholder="e.g. Red Floral"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex justify-between">
                         <label className="text-xs font-medium text-slate-500 uppercase">Description</label>
                         <button onClick={() => generateAIDescription(item.id)} className="text-xs text-purple-600 flex items-center gap-1 hover:underline">
                            <Sparkles className="w-3 h-3" /> Auto-Generate
                         </button>
                      </div>
                      <Textarea 
                        value={item.description} 
                        onChange={(e) => updateFile(item.id, 'description', e.target.value)}
                        placeholder="Enter design details..."
                        className="h-20"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col justify-between items-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 gap-2">
                    <Badge variant={item.status === 'uploaded' ? 'success' : item.status === 'error' ? 'destructive' : 'outline'}>
                      {item.status.toUpperCase()}
                    </Badge>
                    
                    {item.status !== 'uploaded' && (
                        <Button variant="ghost" size="icon" onClick={() => removeFile(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-5 h-5" />
                        </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUploadPage;