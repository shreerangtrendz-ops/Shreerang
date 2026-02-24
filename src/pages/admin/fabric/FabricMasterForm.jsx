import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, Loader2, Database } from 'lucide-react';
import EnhancedDropdownField from '@/components/common/EnhancedDropdownField';
import { useFabricDropdowns } from '@/hooks/useFabricDropdowns';
import { useFabricForm } from '@/hooks/useFabricForm';
import { FabricMasterService } from '@/services/FabricMasterService';
import { quickSeedAllDropdowns } from '@/lib/quickSeedDropdowns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const FabricMasterForm = ({ type = 'base', initialData = null, isEdit = false }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { dropdowns, refreshDropdowns } = useFabricDropdowns(refreshTrigger);
  const { formData, handleInputChange, validateForm, errors, setFormData } = useFabricForm(type, initialData);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData, setFormData]);

  const handleQuickSeed = async () => {
    setSeeding(true);
    try {
      const result = await quickSeedAllDropdowns();
      if (result.success) {
        toast({
          title: "Seeding Complete",
          description: `Successfully added ${result.count} options. Refreshing form...`,
          variant: "default",
          className: "bg-green-600 text-white border-none"
        });
        setRefreshTrigger(prev => prev + 1);
        refreshDropdowns();
      } else {
        toast({
          title: "Seeding Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please check the form for errors.",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await FabricMasterService.update(initialData.id, formData);
        toast({ title: "Success", description: "Fabric updated successfully" });
      } else {
        await FabricMasterService.create(formData);
        toast({ title: "Success", description: "Fabric created successfully" });
      }
      navigate('/admin/fabric-master-list');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save fabric",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPageTitle = () => {
    const action = isEdit ? 'Edit' : 'Create';
    switch(type) {
      case 'base': return `${action} Base Fabric`;
      case 'finish': return `${action} Finish Fabric`;
      case 'fancy_base': return `${action} Fancy Base Fabric`;
      case 'fancy_finish': return `${action} Fancy Finish Fabric`;
      default: return `${action} Fabric`;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{getPageTitle()}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update existing fabric details' : 'Add new fabric to master database'}
          </p>
        </div>
      </div>

      <Alert className="bg-yellow-50 border-yellow-200 shadow-sm mb-6">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 font-semibold">Missing Dropdown Options?</AlertTitle>
        <AlertDescription className="text-yellow-700 flex flex-col md:flex-row items-start md:items-center gap-4 mt-2">
          <span>If dropdowns (like Process, Base, Width) are empty, click here to populate them with default data.</span>
          <Button 
            size="sm" 
            onClick={handleQuickSeed} 
            disabled={seeding}
            className="bg-yellow-600 hover:bg-yellow-700 text-white border-none whitespace-nowrap"
          >
            {seeding ? (
              <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Seeding...</>
            ) : (
              <><Database className="mr-2 h-3 w-3" /> Seed Dropdowns Now</>
            )}
          </Button>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="details">Basic Details</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="meta">Metadata</TabsTrigger>
            <TabsTrigger value="financial">Financials</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <FormErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle>Core Information</CardTitle>
                  <CardDescription>Essential details about the fabric.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                     <Label>Fabric Name *</Label>
                     <Input 
                       value={formData.fabric_name || ''} 
                       onChange={(e) => handleInputChange('fabric_name', e.target.value)}
                       placeholder="e.g. Cotton 60x60 Cambric"
                       className={errors.fabric_name ? "border-red-500" : ""}
                     />
                     {errors.fabric_name && <p className="text-xs text-red-500">{errors.fabric_name}</p>}
                  </div>

                  <EnhancedDropdownField
                    label="Base Material *"
                    category="base"
                    value={formData.base}
                    onValueChange={(val) => handleInputChange('base', val)}
                    options={dropdowns.base}
                    onRefresh={refreshDropdowns}
                    error={errors.base}
                  />

                  <EnhancedDropdownField
                    label="Process *"
                    category="process"
                    value={formData.process}
                    onValueChange={(val) => handleInputChange('process', val)}
                    options={dropdowns.process}
                    onRefresh={refreshDropdowns}
                    error={errors.process}
                  />

                  <EnhancedDropdownField
                    label="Width *"
                    category="width"
                    value={formData.width}
                    onValueChange={(val) => handleInputChange('width', val)}
                    options={dropdowns.width}
                    onRefresh={refreshDropdowns}
                    error={errors.width}
                  />
                  
                  <EnhancedDropdownField
                    label="Finish Type"
                    category="finish_type"
                    value={formData.finish_type}
                    onValueChange={(val) => handleInputChange('finish_type', val)}
                    options={dropdowns.finish_type}
                    onRefresh={refreshDropdowns}
                  />
                </CardContent>
              </Card>
            </FormErrorBoundary>

            <FormErrorBoundary>
              <Card>
                 <CardHeader><CardTitle>Construction Details</CardTitle></CardHeader>
                 <CardContent className="grid gap-6 md:grid-cols-3">
                   <EnhancedDropdownField
                      label="Construction"
                      category="construction"
                      value={formData.construction}
                      onValueChange={(val) => handleInputChange('construction', val)}
                      options={dropdowns.construction}
                      onRefresh={refreshDropdowns}
                   />
                   <EnhancedDropdownField
                      label="Yarn Type"
                      category="yarn_type"
                      value={formData.yarn_type}
                      onValueChange={(val) => handleInputChange('yarn_type', val)}
                      options={dropdowns.yarn_type}
                      onRefresh={refreshDropdowns}
                   />
                   <EnhancedDropdownField
                      label="Yarn Count"
                      category="yarn_count"
                      value={formData.yarn_count}
                      onValueChange={(val) => handleInputChange('yarn_count', val)}
                      options={dropdowns.yarn_count}
                      onRefresh={refreshDropdowns}
                   />
                 </CardContent>
              </Card>
            </FormErrorBoundary>
          </TabsContent>

          <TabsContent value="specs" className="space-y-6">
            <FormErrorBoundary>
              <Card>
                <CardHeader><CardTitle>Technical Specifications</CardTitle></CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                   <div className="space-y-2">
                      <Label>GSM (Grams per Sq Meter)</Label>
                      <Input 
                        type="number" 
                        value={formData.gsm || ''} 
                        onChange={(e) => handleInputChange('gsm', e.target.value)}
                        placeholder="e.g. 120"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label>Weight (kg per 100m)</Label>
                      <Input 
                        type="number" 
                        value={formData.weight || ''} 
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="e.g. 14.5"
                      />
                   </div>

                   <EnhancedDropdownField
                      label="Stretchability"
                      category="stretchability"
                      value={formData.stretchability}
                      onValueChange={(val) => handleInputChange('stretchability', val)}
                      options={dropdowns.stretchability}
                      onRefresh={refreshDropdowns}
                   />

                   <EnhancedDropdownField
                      label="Transparency"
                      category="transparency"
                      value={formData.transparency}
                      onValueChange={(val) => handleInputChange('transparency', val)}
                      options={dropdowns.transparency}
                      onRefresh={refreshDropdowns}
                   />
                   
                   <EnhancedDropdownField
                      label="Handfeel"
                      category="handfeel"
                      value={formData.handfeel}
                      onValueChange={(val) => handleInputChange('handfeel', val)}
                      options={dropdowns.handfeel}
                      onRefresh={refreshDropdowns}
                   />

                   <div className="space-y-2">
                     <Label>HSN Code</Label>
                     <Input 
                        value={formData.hsn_code || ''} 
                        onChange={(e) => handleInputChange('hsn_code', e.target.value)}
                        placeholder="e.g. 5208"
                     />
                   </div>
                </CardContent>
              </Card>
            </FormErrorBoundary>
          </TabsContent>

          <TabsContent value="meta" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SKU Code (Auto-generated if empty)</Label>
                  <Input 
                    value={formData.sku || ''} 
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Auto-generated"
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description / Notes</Label>
                  <Textarea 
                    value={formData.description || ''} 
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                  <Switch 
                    checked={formData.is_starred || false}
                    onCheckedChange={(checked) => handleInputChange('is_starred', checked)}
                    id="is-starred"
                  />
                  <Label htmlFor="is-starred">Mark as Starred (Favorite)</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

           <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Costing & Pricing</CardTitle></CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Supplier Cost (per meter)</Label>
                  <Input 
                    type="number"
                    value={formData.supplier_cost || ''}
                    onChange={(e) => handleInputChange('supplier_cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                 <div className="space-y-2">
                  <Label>GST Rate (%)</Label>
                  <Input 
                    type="number"
                    value={formData.gst_rate || ''}
                    onChange={(e) => handleInputChange('gst_rate', e.target.value)}
                    placeholder="5"
                  />
                </div>
              </CardContent>
            </Card>
           </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur py-4 border-t mt-8 flex justify-end gap-3 z-10 px-4 -mx-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Fabric' : 'Create Fabric'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FabricMasterForm;