import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const DropzoneComponent = ({ onFilesDropped, maxFiles = 10 }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const processedFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    onFilesDropped(processedFiles);
  }, [onFilesDropped]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles
  });

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive 
            ? "border-blue-500 bg-blue-50 scale-[1.01]" 
            : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-4 bg-slate-100 rounded-full text-slate-500">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-slate-900">
              {isDragActive ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-sm text-slate-500">
              SVG, PNG, JPG or GIF (max. 5MB)
            </p>
          </div>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Some files were rejected:</p>
            <ul className="list-disc list-inside mt-1">
              {fileRejections.map(({ file, errors }) => (
                <li key={file.path}>
                  {file.path} - {errors.map(e => e.message).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropzoneComponent;