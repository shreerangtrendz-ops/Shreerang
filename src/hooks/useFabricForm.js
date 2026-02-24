import { useState, useEffect } from 'react';
import { FabricMasterService } from '@/services/FabricMasterService';
import { useToast } from '@/components/ui/use-toast';

const initialFormState = {
  // Base Details
  base_fabric_name: '',
  process: '',
  width: '',
  base: '',
  weight: '',
  gsm: '',
  gsm_tolerance: '',
  construction: '',
  stretchability: '',
  transparency: '',
  handfeel: '',
  hsn_code: '',
  yarn_type: '',
  yarn_count: '',
  
  // Process Specs
  process_type: '', // This corresponds to 'process' column in DB logic often, but let's keep separate in form
  dye_used: '',
  class: '',
  foil_tag: '',
  finish_type: '',
  execution_order: '0',
  
  // Value Addition
  va_category: '',
  sub_category: '',
  quantity: '',
  rate: '',
  
  // Auto-generated
  sku: '',
  fabric_name: ''
};

export const useFabricForm = (initialData = null) => {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialFormState, ...initialData });
    }
  }, [initialData]);

  // Auto-generate Name and SKU when relevant fields change
  useEffect(() => {
    if (!initialData) { // Only auto-generate for new entries or if explicitly wanted
      const name = FabricMasterService.generateFabricName(
        formData.base_fabric_name,
        formData.process_type,
        formData.finish_type,
        formData.va_category
      );
      
      // SKU generation requires async call usually for sequence, but we'll do a basic format here
      // For real sequence, we might need a DB trigger or a fetch
      FabricMasterService.generateSKU(
        formData.base,
        formData.process_type,
        formData.va_category,
        Math.floor(Math.random() * 1000) // Temporary sequence simulation
      ).then(sku => {
         setFormData(prev => ({ ...prev, fabric_name: name, sku: sku }));
      });
    }
  }, [
    formData.base_fabric_name, 
    formData.process_type, 
    formData.finish_type, 
    formData.va_category, 
    formData.base
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.base_fabric_name) newErrors.base_fabric_name = "Base Fabric Name is required";
    if (!formData.process) newErrors.process = "Process is required";
    if (!formData.base) newErrors.base = "Base is required";
    if (!formData.hsn_code) newErrors.hsn_code = "HSN Code is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields." });
      return;
    }

    setLoading(true);
    try {
      const isUnique = await FabricMasterService.validateSKUUniqueness(formData.sku);
      if (!isUnique && !initialData) { // Only check uniqueness on create
        throw new Error("SKU already exists. Please modify specifications.");
      }

      // Merge form data into the DB structure
      // Note: We are flattening the form into the 'fabrics' table as per the simplified schema in Task 1
      const payload = {
        ...formData,
        // Ensure numeric fields are numbers
        weight: formData.weight ? Number(formData.weight) : null,
        gsm: formData.gsm ? Number(formData.gsm) : null,
        gsm_tolerance: formData.gsm_tolerance ? Number(formData.gsm_tolerance) : null,
      };

      if (initialData?.id) {
        await FabricMasterService.updateFabric(initialData.id, payload);
        toast({ title: "Success", description: "Fabric updated successfully." });
      } else {
        await FabricMasterService.saveFabric(payload);
        toast({ title: "Success", description: "Fabric created successfully." });
        setFormData(initialFormState); // Reset form on success create
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setErrors({});
  };

  return {
    formData,
    handleChange,
    handleSelectChange,
    handleSubmit,
    resetForm,
    loading,
    errors
  };
};