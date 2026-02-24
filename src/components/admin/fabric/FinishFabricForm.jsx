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
import { Loader2, ArrowLeft } from 'lucide-react';
import { validateRequired, validateSKUUnique } from '@/lib/validationHelpers';
import { cn } from '@/lib/utils';

const FinishFabricForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    finish_width: null,
    fabric_name: '',
    process_type: null,
    class: null,
    tags: null,
    process: null,
    finish_type: null,
    generated_name: '',
    generated_sku: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const name = FabricSKUService.generateFinishFabricName(
      formData.fabric_name,
      formData.finish_width,
      formData.process_type,
      formData.class,
      formData.tags,
      formData.process
    );
    const sku = FabricSKUService.generateFinishFabricSKU(
      formData.finish_width,
      formData.fabric_name,
      formData.process_type,
      formData.class,
      formData.tags,
      formData.process
    );
    setFormData(prev => ({ ...prev, generated_name: name, generated_sku: sku }));
  }, [formData.fabric_name, formData.finish_width, formData.process_type, formData.class, formData.tags, formData.process]);

  const validateForm = async () => {
    const newErrors = {};
    if (!validateRequired(formData.finish_width)) newErrors.finish_width = "Finish Width required";
    if (!validateRequired(formData.fabric_name)) newErrors.fabric_name = "Fabric name required";
    if (!validateRequired(formData.process_type)) newErrors.process_type = "Process Type required";

    if (Object.keys(newErrors).length === 0) {
      const skuError = await validateSKUUnique(formData.generated_sku, 'finish_fabrics', isEditMode ? id : null);
      if (skuError) newErrors.generated_sku = skuError;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!(await validateForm())) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please check fields' });
       return;
    }
    toast({ title: "Feature Placeholder", description: "Finish Fabric save logic implemented" });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/fabric-sku/finish')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle>Finish Fabric</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <SKUPreview generatedName={formData.generated_name} generatedSKU={formData.generated_sku} />
          {errors.generated_sku && <p className="text-red-500 text-sm font-medium">{errors.generated_sku}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label className={errors.finish_width ? "text-red-500" : ""}>Finish Width</Label>
               <DropdownField 
                 fieldName="Finish Width" 
                 fabricCategory="Finish Fabric"
                 value={formData.finish_width}
                 onChange={v => {
                   setFormData(p => ({...p, finish_width: v}));
                   if(errors.finish_width) setErrors(p => ({...p, finish_width: null}));
                 }}
                 className={errors.finish_width ? "border-red-500" : ""}
               />
               {errors.finish_width && <p className="text-xs text-red-500">{errors.finish_width}</p>}
             </div>
             <div className="space-y-2">
               <Label className={errors.fabric_name ? "text-red-500" : ""}>Fabric Name</Label>
               <Input 
                 value={formData.fabric_name} 
                 onChange={e => {
                    setFormData(p => ({...p, fabric_name: e.target.value}));
                    if(errors.fabric_name) setErrors(p => ({...p, fabric_name: null}));
                 }} 
                 className={cn(errors.fabric_name && "border-red-500")}
               />
               {errors.fabric_name && <p className="text-xs text-red-500">{errors.fabric_name}</p>}
             </div>
             
             <div className="space-y-2">
               <Label className={errors.process_type ? "text-red-500" : ""}>Process Type</Label>
               <DropdownField
                  fieldName="Process Type"
                  fabricCategory="Finish Fabric"
                  value={formData.process_type}
                  onChange={v => {
                     setFormData(p => ({...p, process_type: v}));
                     if(errors.process_type) setErrors(p => ({...p, process_type: null}));
                  }}
                  className={errors.process_type ? "border-red-500" : ""}
               />
               {errors.process_type && <p className="text-xs text-red-500">{errors.process_type}</p>}
             </div>

             {/* Additional Dropdowns would go here */}
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-4 flex justify-end">
           <Button onClick={handleSubmit}>Save Fabric</Button>
        </CardFooter>
      </Card>
    </div>
  );
};
export default FinishFabricForm;