import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import StickyFormFooter from '@/components/admin/StickyFormFooter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileArchive, Cloud, AlertCircle, FileUp, Image as ImageIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import MediaMappingTable from '@/components/admin/media/MediaMappingTable';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from 'papaparse';

// Mock helper to generate random SKUs for auto-match demo
const generateMockSKU = (filename) => {
  const clean = filename.replace(/\.[^/.]+$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "-");
  return clean.substring(0, 10);
};

const MediaLibraryPage = () => {
  const [items, setItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  // Use unsaved changes hook
  const { 
    showUnsavedModal, 
    handleNavigation, 
    proceedNavigation, 
    stayOnPage 
  } = useUnsavedChanges(items.length > 0 && items.some(i => i.status !== 'success'));

  // Handlers for the Table
  const handleFilesAdded = (newFiles) => {
    const newItems = Array.from(newFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      sku: generateMockSKU(file.name),
      skuMatch: true,
      altText: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, " "),
      status: 'pending',
      selected: false
    }));
    setItems(prev => [...prev, ...newItems]);
    toast({ title: "Files Added", description: `${newItems.length} files queued for upload.` });
  };

  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleSelect = (id, checked) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: checked } : item
    ));
  };

  const handleSelectAll = (checked) => {
    setItems(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleProcessUpload = async () => {
    setIsUploading(true);
    // Simulate upload process
    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'error');
    
    for (const item of pendingItems) {
      handleUpdateItem(item.id, 'status', 'uploading');
      await new Promise(r => setTimeout(r, 800)); // Fake network delay
      
      // Random fail for demo
      const isSuccess = Math.random() > 0.1;
      handleUpdateItem(item.id, 'status', isSuccess ? 'success' : 'error');
    }
    
    setIsUploading(false);
    toast({ title: "Processing Complete", description: "Batch processing finished." });
  };

  const handleRetryFailed = () => {
    setItems(prev => prev.map(item => 
      item.status === 'error' ? { ...item, status: 'pending' } : item
    ));
    handleProcessUpload();
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const mapped = results.data
            .filter(row => row.filename) // Basic validation
            .map(row => ({
              id: Math.random().toString(36).substr(2, 9),
              name: row.filename,
              preview: null, // Can't preview from CSV only
              sku: row.sku || generateMockSKU(row.filename),
              skuMatch: !!row.sku,
              altText: row.alt_text || '',
              status: 'pending',
              selected: false
          }));
          setItems(prev => [...prev, ...mapped]);
          toast({ title: "CSV Parsed", description: `Imported ${mapped.length} records.` });
        }
      });
    }
  };

  const selectedCount = items.filter(i => i.selected).length;

  return (
    <>
      <Helmet><title>Media Library - Admin</title></Helmet>
      <div className="container py-6 max-w-7xl mx-auto pb-24">
        <AdminPageHeader 
          title="Media Library" 
          breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Media Library' }]}
          onBack={() => handleNavigation('/admin')}
        />

        <Tabs defaultValue="direct" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
            <TabsTrigger value="direct">Direct Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import (CSV/ZIP)</TabsTrigger>
            <TabsTrigger value="drive">Google Drive</TabsTrigger>
          </TabsList>

          {/* Tab: Direct Upload */}
          <TabsContent value="direct" className="space-y-4 animate-in fade-in-50">
             <Card>
               <CardHeader>
                 <CardTitle>Direct File Upload</CardTitle>
                 <CardDescription>Drag and drop images here or select files from your device.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div 
                    className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => document.getElementById('direct-upload').click()}
                 >
                    <div className="bg-primary/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium text-lg">Click to select files or drag them here</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, WEBP up to 10MB</p>
                    <input 
                      id="direct-upload" 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFilesAdded(e.target.files)}
                    />
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          {/* Tab: Bulk Import */}
          <TabsContent value="bulk" className="space-y-4 animate-in fade-in-50">
             <div className="grid md:grid-cols-2 gap-4">
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-base flex items-center gap-2"><FileArchive className="h-4 w-4"/> 1. Upload Assets (ZIP)</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="flex items-center gap-4">
                     <Button variant="outline" className="w-full h-24 border-dashed flex-col gap-2" onClick={() => toast({description: "Zip upload simulated"})}>
                        <FileArchive className="h-6 w-6 text-muted-foreground"/>
                        <span>Select ZIP File</span>
                     </Button>
                   </div>
                   <p className="text-xs text-muted-foreground mt-2">Structure: Root folder with images. No subfolders.</p>
                 </CardContent>
               </Card>
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-base flex items-center gap-2"><FileUp className="h-4 w-4"/> 2. Upload Mapping (CSV)</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="relative">
                     <Button variant="outline" className="w-full h-24 border-dashed flex-col gap-2" onClick={() => document.getElementById('csv-upload').click()}>
                        <FileUp className="h-6 w-6 text-muted-foreground"/>
                        <span>Select CSV File</span>
                     </Button>
                     <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                   </div>
                   <p className="text-xs text-muted-foreground mt-2">Columns: filename, sku, alt_text</p>
                 </CardContent>
               </Card>
             </div>
             <Alert>
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Bulk Import Tip</AlertTitle>
               <AlertDescription>
                 Ensure filenames in CSV match exactly with files in ZIP. System will attempt to auto-match if SKU is missing.
               </AlertDescription>
             </Alert>
          </TabsContent>

          {/* Tab: Google Drive */}
          <TabsContent value="drive" className="space-y-4 animate-in fade-in-50">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <Cloud className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Import from Google Drive</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Connect your Google Drive account to select multiple files or folders for import.
                </p>
                <Button onClick={() => toast({ title: "Google Drive", description: "Picker window would open here." })} className="gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4" alt="Drive" />
                  Launch Google Picker
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Mapping UI */}
          {items.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mt-8">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold tracking-tight">Media Mapping & Review</h2>
                  </div>
              </div>
              
              <MediaMappingTable 
                  items={items}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={(checked) => handleSelectAll(checked)}
                  selectedCount={selectedCount}
                  totalCount={items.length}
                  onRetryFailed={handleRetryFailed}
              />
            </div>
          )}
        </Tabs>

        <StickyFormFooter 
          onSave={handleProcessUpload}
          onCancel={() => handleNavigation('/admin')}
          isSaving={isUploading}
          saveLabel={`Upload ${items.filter(i => i.status === 'pending').length} Files`}
          disabled={items.filter(i => i.status === 'pending').length === 0}
        />
        
        <UnsavedChangesModal 
          open={showUnsavedModal} 
          onContinue={proceedNavigation} 
          onCancel={stayOnPage} 
        />
      </div>
    </>
  );
};

export default MediaLibraryPage;