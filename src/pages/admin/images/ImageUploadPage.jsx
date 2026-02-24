import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DesignImageService } from '@/services/DesignImageService';
import { useToast } from '@/components/ui/use-toast';

const ImageUploadPage = () => {
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ design_number: '', sku: '', image_url: 'https://placehold.co/400' });
  const { toast } = useToast();

  useEffect(() => { loadImages(); }, []);
  const loadImages = async () => { setImages(await DesignImageService.getAll()); };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      await DesignImageService.create({ ...form, ai_description: 'AI Generated Mock Description for ' + form.design_number });
      toast({ title: 'Uploaded successfully' });
      loadImages();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Image Upload (Mock)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <Input placeholder="Design Number" value={form.design_number} onChange={e=>setForm({...form, design_number: e.target.value})} />
            <Input placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} />
            <Button type="submit">Mock Upload</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default ImageUploadPage;