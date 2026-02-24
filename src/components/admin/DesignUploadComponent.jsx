import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { BunnyNetService } from '@/services/BunnyNetService';
import DesignDescriptionSelector from './DesignDescriptionSelector';

const DesignUploadComponent = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedDesign, setUploadedDesign] = useState(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({ variant: "destructive", title: "File too large", description: "Max file size is 10MB" });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Direct upload to Bunny.net
      const result = await BunnyNetService.uploadFile(file);
      setProgress(100);
      
      const designData = {
        ...result,
        design_number: file.name.split('.')[0].replace(/[^a-zA-Z0-9-]/g, ''), // Initial guess
        original_name: file.name,
        uploaded_at: new Date().toISOString(),
        tags: []
      };

      setUploadedDesign(designData);
      if (onUploadComplete) onUploadComplete(designData);
      
      toast({ title: "Upload Complete", description: "Design image uploaded successfully." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: uploading || uploadedDesign
  });

  const handleDelete = async () => {
    if (uploadedDesign?.fileName) {
      await BunnyNetService.deleteFile(uploadedDesign.fileName);
    }
    setUploadedDesign(null);
    if (onUploadComplete) onUploadComplete(null);
  };

  const handleTagsChange = (tags) => {
    const updated = { ...uploadedDesign, tags };
    setUploadedDesign(updated);
    if (onUploadComplete) onUploadComplete(updated);
  };

  const handleDesignNumberChange = (e) => {
    const updated = { ...uploadedDesign, design_number: e.target.value };
    setUploadedDesign(updated);
    if (onUploadComplete) onUploadComplete(updated);
  };

  return (
    <div className="space-y-6">
      {!uploadedDesign ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-slate-100">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> : <Upload className="h-6 w-6 text-slate-600" />}
            </div>
            <p className="text-sm font-medium text-slate-700">
              {uploading ? "Uploading to CDN..." : "Click or drag image here"}
            </p>
            <p className="text-xs text-slate-500">JPG, PNG, WebP up to 10MB</p>
          </div>
          {progress > 0 && <Progress value={progress} className="mt-4 h-2 w-full max-w-xs mx-auto" />}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="flex items-start gap-4 p-4">
            <div className="h-24 w-24 rounded-md border overflow-hidden flex-shrink-0 bg-slate-100">
              <img src={uploadedDesign.cdnUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-sm text-slate-900">Design Uploaded</h4>
                  <p className="text-xs text-slate-500">{(uploadedDesign.fileSize / 1024).toFixed(1)} KB • {new Date(uploadedDesign.uploaded_at).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Input 
                  value={uploadedDesign.design_number}
                  onChange={handleDesignNumberChange}
                  placeholder="Enter Design Number"
                  className="max-w-xs font-mono font-medium"
                />
                <span className="text-xs text-slate-400">Auto-detected from filename</span>
              </div>
            </div>
          </div>
          
          <div className="border-t p-4 bg-slate-50/50">
            <DesignDescriptionSelector 
              visible={true} 
              selectedTags={uploadedDesign.tags} 
              onChange={handleTagsChange} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignUploadComponent;