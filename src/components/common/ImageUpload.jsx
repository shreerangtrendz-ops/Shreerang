import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function ImageUpload({ onUploadComplete, maxFiles = 10, bucketName = 'sales-order-attachments' }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    
    if (files.length + newFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed.`,
        variant: "destructive"
      });
      return;
    }

    const processedFiles = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending', // pending, uploading, success, error
      url: null,
      path: null
    }));

    setFiles(prev => [...prev, ...processedFiles]);
    
    // Auto upload
    processedFiles.forEach(fileObj => uploadFile(fileObj));
  };

  const uploadFile = async (fileObj) => {
    // Update status to uploading
    updateFileStatus(fileObj.id, { status: 'uploading', progress: 0 });

    try {
      const fileExt = fileObj.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === fileObj.id && f.progress < 90) {
            return { ...f, progress: f.progress + 10 };
          }
          return f;
        }));
      }, 200);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileObj.file);

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      updateFileStatus(fileObj.id, { 
        status: 'success', 
        progress: 100, 
        url: publicUrl,
        path: filePath
      });

      // Notify parent
      onUploadComplete({
        file_name: fileObj.file.name,
        file_path: filePath,
        file_size: fileObj.file.size,
        file_type: fileObj.file.type,
        public_url: publicUrl
      });

    } catch (error) {
      console.error('Upload failed:', error);
      updateFileStatus(fileObj.id, { status: 'error', progress: 0, error: error.message });
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${fileObj.file.name}`,
        variant: "destructive"
      });
    }
  };

  const updateFileStatus = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors bg-slate-50",
          isDragging ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept=".jpg,.jpeg,.png,.pdf" 
          onChange={handleFileSelect} 
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
             <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">SVG, PNG, JPG or PDF (max. 5MB)</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid gap-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-white border rounded-md shadow-sm">
              <div className="h-10 w-10 shrink-0 rounded bg-slate-100 flex items-center justify-center">
                {file.file.type.includes('image') ? (
                  file.url ? <img src={file.url} alt="Preview" className="h-full w-full object-cover rounded" /> : <Upload className="h-5 w-5 text-slate-400" />
                ) : (
                  <FileText className="h-5 w-5 text-slate-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.file.name}</p>
                  <span className="text-xs text-muted-foreground">{(file.file.size / 1024).toFixed(0)} KB</span>
                </div>
                <Progress value={file.progress} className="h-1.5" />
              </div>

              <div className="flex items-center gap-2">
                {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}