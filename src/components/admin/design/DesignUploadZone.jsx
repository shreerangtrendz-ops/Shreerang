import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileImage, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DesignUploadZone = ({ onFilesSelected }) => {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const onDrop = useCallback(acceptedFiles => {
    // Filter for images only just in case
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length < acceptedFiles.length) {
        setErrors(prev => [...prev, "Some files were rejected because they are not images."]);
    }

    const newFiles = imageFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    onFilesSelected([...files, ...newFiles]);
    setErrors([]);
  }, [files, onFilesSelected]);

  const removeFile = (file) => {
    const newFiles = [...files];
    const index = newFiles.indexOf(file);
    if (index > -1) {
        newFiles.splice(index, 1);
        setFiles(newFiles);
        onFilesSelected(newFiles);
    }
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(file.preview);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-4 bg-white rounded-full shadow-sm">
             <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">
            {isDragActive ? "Drop files here..." : "Drag & Drop design images here"}
          </h3>
          <p className="text-sm text-slate-500">
            or click to browse from your computer
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Supports JPG, PNG, WEBP up to 10MB
          </p>
        </div>
      </div>

      {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                {errors.map((e, i) => <div key={i}>{e}</div>)}
            </AlertDescription>
          </Alert>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {files.map((file, index) => (
            <Card key={index} className="relative group overflow-hidden border-slate-200">
              <button 
                onClick={(e) => { e.stopPropagation(); removeFile(file); }}
                className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="aspect-square bg-slate-100 relative">
                <img 
                  src={file.preview} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                  onLoad={() => { URL.revokeObjectURL(file.preview) }}
                />
              </div>
              <div className="p-2 bg-white">
                <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DesignUploadZone;