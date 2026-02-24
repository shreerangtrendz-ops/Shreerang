import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, Image as ImageIcon, Bot, ExternalLink, FileSpreadsheet } from 'lucide-react';

const BulkImportPage = () => {
  const { toast } = useToast();
  const [file, setFile] = useState(null);

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
    toast({ title: 'File loaded', description: 'Ready for pre-import validation.' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <Helmet><title>Bulk Import & Automation</title></Helmet>

      <div className="bg-slate-900 text-amber-500 p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold">Bulk Operations & Automation Center</h1>
        <p className="text-slate-300 mt-2">Manage bulk imports, image linking, and AI/n8n automations.</p>
      </div>

      {/* SECTION 1 */}
      <Card className="rounded-xl shadow-md border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-500"/> Section 1: Bulk Fabric Import</CardTitle>
          <CardDescription>Upload multiple fabrics at once using the standard Excel template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Download className="w-4 h-4 mr-2" /> Download Excel Template
            </Button>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-700">Drag & Drop Excel File Here</p>
            <p className="text-sm text-slate-500 mb-4">or click to browse (.xlsx, .xls only)</p>
            <Input type="file" accept=".xlsx,.xls" className="hidden" id="file-upload" onChange={handleFileUpload} />
            <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800">
              Browse Files
            </Label>
          </div>
          {file && (
            <div className="bg-slate-100 p-4 rounded-md flex justify-between items-center">
              <span>Selected: <strong>{file.name}</strong></span>
              <Button>Validate & Import</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2 */}
      <Card className="rounded-xl shadow-md border-t-4 border-t-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-500"/> Section 2: Bulk Image Upload & Linking</CardTitle>
          <CardDescription>Drop images, link to SKUs, and auto-generate AI descriptions.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl p-10 text-center">
             <p className="text-emerald-700 font-medium">Drag & Drop Images Here (JPG/PNG/WebP)</p>
             <p className="text-sm text-emerald-600 mt-2">Images will queue below for SKU linking and AI description generation.</p>
           </div>
           {/* Mock list */}
           <div className="mt-4 text-center text-sm text-slate-500 py-4">No images in queue.</div>
        </CardContent>
      </Card>

      {/* SECTION 3 */}
      <Card className="rounded-xl shadow-md border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500"/> Section 3: WhatsApp + n8n Automation</CardTitle>
          <CardDescription>System integration reference endpoints for external bots.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-bold text-purple-900 mb-2">Smart Customer Recognition</h3>
            <p className="text-sm text-purple-700 mb-3">Uses n8n to identify customer tier and display correct pricing via WhatsApp.</p>
            <code className="block bg-slate-900 text-purple-300 p-2 rounded text-xs mb-2">GET /api/fabric/cost-sheet/{'{sku}'}</code>
            <Button variant="outline" size="sm" className="w-full text-purple-700 border-purple-300 hover:bg-purple-100">View Documentation <ExternalLink className="w-3 h-3 ml-2"/></Button>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-bold text-purple-900 mb-2">Admin Price Update Bot</h3>
            <p className="text-sm text-purple-700 mb-3">Allows admins to update rates directly from WhatsApp message commands.</p>
            <code className="block bg-slate-900 text-purple-300 p-2 rounded text-xs mb-2">POST /api/rates/update</code>
            <code className="block bg-slate-900 text-purple-300 p-2 rounded text-xs mb-2">POST /api/fabric/price-refresh</code>
            <Button variant="outline" size="sm" className="w-full text-purple-700 border-purple-300 hover:bg-purple-100">View Documentation <ExternalLink className="w-3 h-3 ml-2"/></Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default BulkImportPage;