import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const DesignUploadComponent = ({ designData, setDesignData }) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('design-images') // Assuming this bucket exists as per prompt context
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('design-images')
        .getPublicUrl(fileName);

      setDesignData(prev => ({ ...prev, design_image_url: publicUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setDesignData(prev => ({ ...prev, design_image_url: '' }));
  };

  return (
    <Card className="border-dashed border-2 bg-slate-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4"/> Design Details (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-start">
          <div className="w-32 h-32 bg-white rounded-lg border flex items-center justify-center relative overflow-hidden flex-shrink-0">
            {designData.design_image_url ? (
              <>
                <img src={designData.design_image_url} alt="Design" className="w-full h-full object-cover" />
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-1 right-1 h-6 w-6 rounded-full" 
                  onClick={removeImage}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <div className="text-center p-2">
                {uploading ? (
                    <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>
                ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="h-6 w-6 text-slate-300 mb-1" />
                        <span className="text-[10px] text-blue-600 font-medium">Upload Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
             <div className="space-y-1">
                <Label className="text-xs">Design Number</Label>
                <Input 
                    value={designData.design_number || ''} 
                    onChange={e => setDesignData(prev => ({ ...prev, design_number: e.target.value }))}
                    placeholder="e.g. D-101"
                    className="h-8"
                />
             </div>
             <div className="space-y-1">
                <Label className="text-xs">Design Information</Label>
                <Textarea 
                    value={designData.design_information || ''} 
                    onChange={e => setDesignData(prev => ({ ...prev, design_information: e.target.value }))}
                    placeholder="Details about color, pattern, etc."
                    className="min-h-[60px] text-sm"
                />
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DesignUploadComponent;