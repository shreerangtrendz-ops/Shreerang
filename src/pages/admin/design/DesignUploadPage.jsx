import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DesignUploadService } from '@/services/DesignUploadService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import WhatsAppButton from '@/components/admin/whatsapp/WhatsAppButton';

const DesignUploadPage = () => {
  const [file, setFile] = useState(null);
  const [designNumber, setDesignNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('5');
  const [gsm, setGsm] = useState('');
  const [weight, setWeight] = useState('');
  const [handfeel, setHandfeel] = useState('');
  const [construction, setConstruction] = useState('');
  const [width, setWidth] = useState('');
  const [colorVariants, setColorVariants] = useState('');
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Max 10MB allowed' });
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file || !designNumber) return;

    setUploading(true);
    try {
      // 1. Upload to CDN
      const url = await DesignUploadService.uploadToBunnyNet(file, designNumber);

      // 2. Generate AI Description
      const aiDesc = await DesignUploadService.generateAIDescription(file);

      // 3. Save to design_batch_master
      await DesignUploadService.saveToDesignMaster({
        design_no: designNumber,
        url,
        fabric_type: fabricType,
        hsn_code: hsnCode,
        gst_rate: parseFloat(gstRate),
        item_name: itemName,
        gsm,
        weight: weight ? parseFloat(weight) : null,
        handfeel,
        construction,
        width,
        color_variants: colorVariants
      });

      const designData = { design_number: designNumber, url, description: aiDesc };
      setResult(designData);

      toast({ title: 'Success', description: 'Design master record created and image uploaded!' });
      setFile(null);
      setDesignNumber('');
      setItemName('');
      setFabricType('');
      setHsnCode('');
      setGsm('');
      setWeight('');
      setHandfeel('');
      setConstruction('');
      setWidth('');
      setColorVariants('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>Design Upload | Admin</title></Helmet>
      <AdminPageHeader
        title="Upload Design"
        description="Upload new designs to Bunny.net CDN with AI analysis."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Upload Configuration</CardTitle>
            <CardDescription>Enter details and select file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="d_num">Design Number *</Label>
                <Input
                  id="d_num"
                  placeholder="e.g. 5059"
                  value={designNumber}
                  onChange={e => setDesignNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_name">Item Name / Description</Label>
                <Input
                  id="item_name"
                  placeholder="e.g. 14 Kg Capsule Discharge Foil Mill Print Design"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fabric_type">Fabric Type</Label>
                <Input
                  id="fabric_type"
                  placeholder="e.g. 14 Kg Capsule Discharge"
                  value={fabricType}
                  onChange={e => setFabricType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  placeholder="e.g. 540824"
                  value={hsnCode}
                  onChange={e => setHsnCode(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_rate">GST Rate (%)</Label>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger id="gst_rate" className="bg-white">
                  <SelectValue placeholder="Select GST Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Nil)</SelectItem>
                  <SelectItem value="5">5% (Textile)</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>GSM</Label>
                <Input
                  type="number"
                  value={gsm}
                  onChange={e => setGsm(e.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg/meter)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 0.125"
                />
              </div>
              <div className="space-y-2">
                <Label>Handfeel</Label>
                <Select value={handfeel} onValueChange={setHandfeel}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Handfeel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soft">Soft</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Stiff">Stiff</SelectItem>
                    <SelectItem value="Silky">Silky</SelectItem>
                    <SelectItem value="Rough">Rough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Width (inches)</Label>
                <Select value={width} onValueChange={setWidth}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Width" />
                  </SelectTrigger>
                  <SelectContent>
                    {['36', '38', '40', '42', '44', '48', '54', '58', '60', '72', '78'].map(w => (
                      <SelectItem key={w} value={w}>{w}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Construction</Label>
                <Input
                  type="text"
                  value={construction}
                  onChange={e => setConstruction(e.target.value)}
                  placeholder="e.g. Plain Weave, Twill"
                />
              </div>
              <div className="space-y-2">
                <Label>Color Variants</Label>
                <Input
                  type="text"
                  value={colorVariants}
                  onChange={e => setColorVariants(e.target.value)}
                  placeholder="e.g. Red, Blue, Green (comma separated)"
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              {preview ? (
                <div className="relative h-48 w-full">
                  <img src={preview} alt="Preview" className="h-full mx-auto object-contain rounded-md shadow-sm" />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm"
                    onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null); }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <div className="bg-slate-100 p-3 rounded-full">
                    <UploadCloud className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-700">Click or drag image here</p>
                  <p className="text-xs">PNG, JPG, WebP (Max 10MB)</p>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-slate-900 text-white"
              onClick={handleUpload}
              disabled={!file || !designNumber || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload to CDN
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-green-50/50 border-green-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Upload Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-100 space-y-2">
                <Label className="text-xs uppercase text-slate-500">CDN URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.url} className="bg-slate-50 font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(result.url)}>Copy</Button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-100 space-y-2">
                <Label className="text-xs uppercase text-purple-600 flex items-center gap-1">
                  ✨ AI Description
                </Label>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {result.description}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <WhatsAppButton
                  data={{ name: result.design_number, sku: result.url }}
                  type="design"
                  variant="default"
                  size="default"
                />
                <Button variant="outline" className="w-full" onClick={() => { setResult(null); setPreview(null); setFile(null); setDesignNumber(''); }}>
                  Upload Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DesignUploadPage;