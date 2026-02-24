import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useFabricForm } from '@/hooks/useFabricForm';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DynamicDropdown from '@/components/common/DynamicDropdown';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';

const FabricMasterPage = () => {
  const { 
    formData, handleChange, handleSelectChange, handleSubmit, resetForm, loading, errors 
  } = useFabricForm();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Create Fabric | Admin</title></Helmet>
      <AdminPageHeader 
        title="Create Fabric" 
        description="Define base fabrics, processing specifications, and value additions."
        breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Fabric Master', href: '/admin/fabric-master-table'}, {label: 'Create'}]} 
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Read-Only Auto-Generated Fields */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-500">Auto-Generated SKU</Label>
              <Input value={formData.sku} readOnly className="font-mono bg-white font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500">Auto-Generated Fabric Name</Label>
              <Input value={formData.fabric_name} readOnly className="font-medium bg-white text-slate-700" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="base" className="text-sm">1. Base Details</TabsTrigger>
            <TabsTrigger value="process" className="text-sm">2. Process Specs</TabsTrigger>
            <TabsTrigger value="va" className="text-sm">3. Value Addition</TabsTrigger>
          </TabsList>

          {/* TAB 1: BASE DETAILS */}
          <TabsContent value="base">
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Base Fabric Name *</Label>
                  <Input name="base_fabric_name" value={formData.base_fabric_name} onChange={handleChange} className={errors.base_fabric_name && "border-red-500"} />
                  {errors.base_fabric_name && <p className="text-xs text-red-500">{errors.base_fabric_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>HSN Code *</Label>
                  <Input name="hsn_code" value={formData.hsn_code} onChange={handleChange} className={errors.hsn_code && "border-red-500"} />
                  {errors.hsn_code && <p className="text-xs text-red-500">{errors.hsn_code}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Process *</Label>
                  <DynamicDropdown category="process" value={formData.process} onChange={(val) => handleSelectChange('process', val)} />
                  {errors.process && <p className="text-xs text-red-500">{errors.process}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Width</Label>
                  <DynamicDropdown category="width" value={formData.width} onChange={(val) => handleSelectChange('width', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Base *</Label>
                  <DynamicDropdown category="base" value={formData.base} onChange={(val) => handleSelectChange('base', val)} />
                   {errors.base && <p className="text-xs text-red-500">{errors.base}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" name="weight" value={formData.weight} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>GSM</Label>
                  <Input type="number" name="gsm" value={formData.gsm} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>GSM Tolerance (+/- %)</Label>
                  <Input type="number" name="gsm_tolerance" value={formData.gsm_tolerance} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                  <Label>Construction</Label>
                  <DynamicDropdown category="construction" value={formData.construction} onChange={(val) => handleSelectChange('construction', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Stretchability</Label>
                  <DynamicDropdown category="stretchability" value={formData.stretchability} onChange={(val) => handleSelectChange('stretchability', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Transparency</Label>
                  <DynamicDropdown category="transparency" value={formData.transparency} onChange={(val) => handleSelectChange('transparency', val)} />
                </div>

                <div className="space-y-2">
                  <Label>Handfeel</Label>
                  <DynamicDropdown category="handfeel" value={formData.handfeel} onChange={(val) => handleSelectChange('handfeel', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Yarn Type</Label>
                  <DynamicDropdown category="yarn_type" value={formData.yarn_type} onChange={(val) => handleSelectChange('yarn_type', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Yarn Count</Label>
                  <DynamicDropdown category="yarn_count" value={formData.yarn_count} onChange={(val) => handleSelectChange('yarn_count', val)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: PROCESS SPECS */}
          <TabsContent value="process">
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Process Type</Label>
                  <DynamicDropdown category="process_type" value={formData.process_type} onChange={(val) => handleSelectChange('process_type', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Dye Used</Label>
                  <DynamicDropdown category="dye_used" value={formData.dye_used} onChange={(val) => handleSelectChange('dye_used', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <DynamicDropdown category="class" value={formData.class} onChange={(val) => handleSelectChange('class', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Foil Tag</Label>
                  <DynamicDropdown category="foil_tag" value={formData.foil_tag} onChange={(val) => handleSelectChange('foil_tag', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Finish Type</Label>
                  <DynamicDropdown category="finish_type" value={formData.finish_type} onChange={(val) => handleSelectChange('finish_type', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Execution Order (0-7)</Label>
                  <Input type="number" min="0" max="7" name="execution_order" value={formData.execution_order} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: VALUE ADDITION */}
          <TabsContent value="va">
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>VA Category</Label>
                  <DynamicDropdown category="va_category" value={formData.va_category} onChange={(val) => handleSelectChange('va_category', val)} />
                </div>
                <div className="space-y-2">
                  <Label>Sub-Category</Label>
                  {/* Dynamic subcategory based on main category */}
                  <DynamicDropdown 
                    category={
                      formData.va_category?.includes('Hakoba') ? 'va_subcategory_hakoba' :
                      formData.va_category?.includes('Embroidered') ? 'va_subcategory_embroidered' :
                      formData.va_category?.includes('Handwork') ? 'va_subcategory_handwork' :
                      formData.va_category?.includes('Washing') ? 'va_subcategory_washing' :
                      'va_category' // Fallback or handle differently
                    } 
                    value={formData.sub_category} 
                    onChange={(val) => handleSelectChange('sub_category', val)} 
                    disabled={!formData.va_category}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" name="quantity" value={formData.quantity} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Rate</Label>
                  <Input type="number" name="rate" value={formData.rate} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-4 border-t pt-4">
          <Button type="button" variant="outline" onClick={resetForm}>
            <X className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button type="submit" disabled={loading} className="bg-slate-900 text-white min-w-[150px]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Fabric
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FabricMasterPage;