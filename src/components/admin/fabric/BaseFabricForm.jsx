import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import DropdownField from '@/components/common/DropdownField';
import SKUPreview from '@/components/admin/fabric/SKUPreview';
import FabricSKUService from '@/services/FabricSKUService';
import { Loader2, ArrowLeft, Wand2 } from 'lucide-react';
import { validateRequired, validateSKUUnique } from '@/lib/validationHelpers';
import { cn } from '@/lib/utils';

const BaseFabricForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    width: null,
    fabric_name: '',
    process: null,
    generated_name: '',
    generated_sku: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) loadData();
  }, [id]);

  useEffect(() => {
    const name = FabricSKUService.generateBaseFabricName(
      formData.fabric_name,
      formData.width,
      formData.process
    );
    const sku = FabricSKUService.generateBaseFabricSKU(
      formData.width,
      formData.fabric_name,
      formData.process
    );
    
    setFormData(prev => ({ ...prev, generated_name: name, generated_sku: sku }));
  }, [formData.fabric_name, formData.width, formData.process]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('base_fabrics').select('*').eq('id', id).single();
      if (error) throw error;
      
      setFormData({
        ...data,
        width: data.width ? { option_name: data.width, option_sku_code: '' } : null,
        process: data.process ? { option_name: data.process, option_sku_code: '' } : null 
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fabric' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = async () => {
    const newErrors = {};
    if (!validateRequired(formData.width)) newErrors.width = "Width is required";
    if (!validateRequired(formData.fabric_name)) newErrors.fabric_name = "Fabric name is required";
    if (!validateRequired(formData.process)) newErrors.process = "Process is required";
    
    // Check SKU Unique
    if (!newErrors.width && !newErrors.fabric_name && !newErrors.process) {
       const skuError = await validateSKUUnique(formData.generated_sku, 'base_fabrics', isEditMode ? id : null);
       if (skuError) newErrors.generated_sku = skuError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please check the form for errors.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        width: formData.width.option_name,
        fabric_name: formData.fabric_name,
        process: formData.process.option_name,
        generated_name: formData.generated_name,
        generated_sku: formData.generated_sku,
        base_fabric_name: formData.generated_name 
      };

      let error;
      if (isEditMode) {
        ({ error } = await supabase.from('base_fabrics').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('base_fabrics').insert([payload]));
      }

      if (error) throw error;

      toast({ title: 'Success', description: `Base Fabric ${isEditMode ? 'updated' : 'created'} successfully` });
      navigate('/fabric-sku/base');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAISuggestion = () => {
    if (formData.width && formData.process) {
      setFormData(prev => ({ ...prev, fabric_name: "Cotton Poplin" }));
      toast({ title: "AI Suggestion", description: "Fabric name suggested!" });
    } else {
      toast({ title: "Tip", description: "Select Width and Process first" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/fabric-sku/base')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle>{isEditMode ? 'Edit' : 'Create'} Base Fabric</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <SKUPreview generatedName={formData.generated_name} generatedSKU={formData.generated_sku} />
          {errors.generated_sku && <p className="text-sm text-red-500 font-medium">{errors.generated_sku}</p>}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={errors.width ? "text-red-500" : ""}>Width *</Label>
              <DropdownField 
                fieldName="Width" 
                fabricCategory="Base Fabric"
                value={formData.width}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, width: val }));
                  if(errors.width) setErrors(prev => ({...prev, width: null}));
                }}
                className={errors.width ? "border-red-500" : ""}
              />
              {errors.width && <p className="text-xs text-red-500">{errors.width}</p>}
            </div>

            <div className="space-y-2">
               <Label className={errors.fabric_name ? "text-red-500" : ""}>Fabric Name *</Label>
               <div className="flex gap-2">
                 <Input 
                   value={formData.fabric_name}
                   onChange={(e) => {
                     setFormData(prev => ({ ...prev, fabric_name: e.target.value }));
                     if(errors.fabric_name) setErrors(prev => ({...prev, fabric_name: null}));
                   }}
                   placeholder="e.g. Cotton Poplin"
                   className={cn(errors.fabric_name && "border-red-500 focus-visible:ring-red-500")}
                 />
                 <Button variant="outline" size="icon" onClick={handleAISuggestion} title="AI Suggestion">
                   <Wand2 className="h-4 w-4 text-purple-600" />
                 </Button>
               </div>
               {errors.fabric_name && <p className="text-xs text-red-500">{errors.fabric_name}</p>}
            </div>

            <div className="space-y-2">
              <Label className={errors.process ? "text-red-500" : ""}>Process *</Label>
              <DropdownField 
                fieldName="Process" 
                fabricCategory="Base Fabric"
                value={formData.process}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, process: val }));
                  if(errors.process) setErrors(prev => ({...prev, process: null}));
                }}
                className={errors.process ? "border-red-500" : ""}
              />
              {errors.process && <p className="text-xs text-red-500">{errors.process}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-slate-50 rounded-b-lg">
          <Button variant="outline" onClick={() => navigate('/fabric-sku/base')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update Fabric' : 'Create Fabric'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BaseFabricForm;