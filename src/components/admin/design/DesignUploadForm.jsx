import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, X, Save, Image as ImageIcon } from 'lucide-react';
import { FabricService } from '@/services/FabricService';
import { DesignService } from '@/services/DesignService';
import { validateRequired } from '@/lib/validationHelpers';

const DesignUploadForm = ({ onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    try {
      const data = await FabricService.listFabrics();
      setFabrics(data || []);
    } catch (error) {
      console.error("Failed to load fabrics", error);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      design_number: file.name.split('.')[0], // Auto-populate from filename
      sku_id: '',
      ai_description: 'Generating description...', // Placeholder
      manual_description: ''
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Simulate AI generation for new files
    newFiles.forEach(async (f, index) => {
      try {
        const desc = await DesignService.generateAIDescription(f.preview, f.design_number);
        setFiles(currentFiles => 
          currentFiles.map(cf => cf.preview === f.preview ? { ...cf, ai_description: desc } : cf)
        );
      } catch (e) {
        console.error(e);
      }
    });

  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {'image/*': []} 
  });

  const removeFile = (index) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileField = (index, field, value) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], [field]: value };
      return newFiles;
    });
  };

  const handleSaveAll = async () => {
    // Validate
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!validateRequired(f.design_number)) {
        toast({ variant: "destructive", title: "Validation Error", description: `Design #${i+1} missing Design Number.` });
        return;
      }
      if (!validateRequired(f.sku_id)) {
        toast({ variant: "destructive", title: "Validation Error", description: `Design #${i+1} missing SKU selection.` });
        return;
      }
    }

    setLoading(true);
    try {
      let savedCount = 0;
      for (const fileData of files) {
        // 1. Upload Image
        // Assuming DesignService handles storage. If not, we implement it here.
        // We'll use the service method `uploadImagesToStorage` which handles array, 
        // but here we process one by one to link correctly.
        
        // Mocking the SKU string needed for folder path
        const fabric = fabrics.find(f => f.id === fileData.sku_id);
        const skuString = fabric ? fabric.sku : 'UNKNOWN';

        const imageUrl = await DesignService.uploadImagesToStorage([fileData.file], skuString, fileData.design_number);

        // 2. Save DB Record
        await DesignService.saveDesign({
          design_number: fileData.design_number,
          sku_id: fileData.sku_id,
          image_url: imageUrl,
          ai_description: fileData.ai_description,
          manual_description: fileData.manual_description
        });
        savedCount++;
      }
      
      toast({ title: "Success", description: `Saved ${savedCount} designs successfully.` });
      setFiles([]); // Clear
      onSuccess?.();
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-lg font-medium text-slate-700">Drag & Drop designs here</p>
        <p className="text-sm text-slate-500 mt-1">or click to select files</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upload Queue ({files.length})</h3>
            <Button onClick={handleSaveAll} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save All
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {files.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col md:flex-row gap-6">
                  {/* Image Preview */}
                  <div className="w-full md:w-48 h-48 bg-slate-100 rounded-lg flex-shrink-0 relative group">
                    <img 
                      src={file.preview} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Design Number <span className="text-red-500">*</span></Label>
                      <Input 
                        value={file.design_number} 
                        onChange={(e) => updateFileField(index, 'design_number', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Fabric SKU <span className="text-red-500">*</span></Label>
                      <Select 
                        value={file.sku_id} 
                        onValueChange={(val) => updateFileField(index, 'sku_id', val)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                        <SelectContent>
                          {fabrics.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.sku} - {f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>AI Description (Auto-generated)</Label>
                      <Textarea 
                        value={file.ai_description} 
                        onChange={(e) => updateFileField(index, 'ai_description', e.target.value)}
                        className="bg-slate-50 min-h-[60px]"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Manual Description (Optional)</Label>
                      <Input 
                        value={file.manual_description} 
                        onChange={(e) => updateFileField(index, 'manual_description', e.target.value)}
                        placeholder="Additional details..."
                      />
                    </div>
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

export default DesignUploadForm;