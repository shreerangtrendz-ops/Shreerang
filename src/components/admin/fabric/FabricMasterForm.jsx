import React, { useState, useEffect } from 'react';
import { useFabricDropdowns } from '@/hooks/useFabricDropdowns';
import { SchiffliMasterService } from '@/services/SchiffliMasterService';
import { DropdownAISuggestionService } from '@/services/DropdownAISuggestionService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Save, X, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import EnhancedDropdownField from '@/components/common/EnhancedDropdownField';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const FabricMasterForm = ({ type = 'base', initialData, onSuccess, onCancel }) => {
  const { dropdowns, loading: loadingDropdowns, error: dropdownError, refreshDropdowns } = useFabricDropdowns();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    base_details: {
      base_fabric_name: '', process: '', width: '', base: '', weight: '', gsm: '',
      gsm_tolerance: '', construction: '', stretchability: '', transparency: '',
      handfeel: '', hsn_code: '', yarn_type: '', yarn_count: ''
    },
    process_specs: {
      process_type: '', dye_used: '', process_width: '', class: '',
      foil_tag: '', finish_type: '', execution_order: ''
    },
    va_details: {
      va_category: '', va_sub_category: '', quantity: '', rate: '', execution_order: ''
    },
    generated: { fabric_name: '', type_fabric_name: '', sku: '' }
  });

  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  
  // AI State
  const [aiLoadingField, setAiLoadingField] = useState(null);

  // Load Initial Data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        base_details: { ...prev.base_details, ...initialData.base_fabric_details },
        process_specs: { ...prev.process_specs, ...initialData.process_spec },
        va_details: { ...prev.va_details, ...initialData.va_spec },
      }));
    }
  }, [initialData]);

  // Auto Generate Fields
  useEffect(() => {
    const timer = setTimeout(() => {
      const flatFields = { ...formData.base_details, ...formData.process_specs, ...formData.va_details, type };
      setFormData(prev => ({
        ...prev,
        generated: {
          fabric_name: SchiffliMasterService.generateFabricName(type, flatFields),
          type_fabric_name: type === 'base' ? 'Base Fabric' : 'Fabric',
          sku: SchiffliMasterService.generateSKU(type, flatFields)
        }
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.base_details, formData.process_specs, formData.va_details, type]);

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
    // Clear error
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr[`${section}.${field}`];
        return newErr;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const reqBase = ['base_fabric_name', 'base', 'width', 'process'];
    reqBase.forEach(f => { if (!formData.base_details[f]) newErrors[`base_details.${f}`] = 'Required'; });
    
    // Check HSN format if present
    if (formData.base_details.hsn_code && formData.base_details.hsn_code.length !== 6) {
       newErrors['base_details.hsn_code'] = 'HSN must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.generated.fabric_name,
        sku: formData.generated.sku,
        base_fabric_details: formData.base_details,
        process_spec: formData.process_specs,
        va_spec: formData.va_details,
      };

      if (initialData?.id) {
        await SchiffliMasterService.updateFabricMaster(initialData.id, payload);
      } else {
        await SchiffliMasterService.createFabricMaster(type, payload);
      }
      
      toast({ title: "Success", description: "Fabric saved successfully." });
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  // AI Suggestion Handler
  const handleAISuggestion = async (field) => {
    setAiLoadingField(field);
    try {
      const details = formData.base_details;
      let suggestion = null;

      switch(field) {
        case 'hsn_code':
          suggestion = await DropdownAISuggestionService.getSuggestionForHSNCode(details.base_fabric_name, details.base, details.construction, details.weight);
          break;
        case 'construction':
          suggestion = await DropdownAISuggestionService.getSuggestionForConstruction(details.base, details.weight);
          break;
        case 'process':
          suggestion = await DropdownAISuggestionService.getSuggestionForProcess(details.base_fabric_name, details.base);
          break;
        case 'base':
          suggestion = await DropdownAISuggestionService.getSuggestionForBase(details.base_fabric_name);
          break;
        case 'finish_type':
          suggestion = await DropdownAISuggestionService.getSuggestionForFinishType(details.process);
          break;
        default:
          break;
      }

      if (suggestion) {
        const section = field === 'finish_type' ? 'process_specs' : 'base_details';
        handleChange(section, field, suggestion.value);
        toast({ 
          title: "AI Suggestion Applied", 
          description: `Set ${field.replace('_', ' ')} to "${suggestion.value}" (${Math.round(suggestion.confidence * 100)}% confidence)`
        });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to get suggestion.' });
    } finally {
      setAiLoadingField(null);
    }
  };

  if (loadingDropdowns) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-slate-500">Loading master data...</p>
      </div>
    );
  }

  if (dropdownError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription className="flex items-center gap-2 mt-2">
          {dropdownError.message}
          <Button size="sm" variant="outline" onClick={refreshDropdowns}><RefreshCw className="mr-2 h-3 w-3" /> Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Basic Details */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">1. Base Fabric Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="base_fabric_name" className={errors['base_details.base_fabric_name'] ? "text-red-500" : ""}>
              Base Fabric Name *
            </Label>
            <Input
              id="base_fabric_name"
              value={formData.base_details.base_fabric_name}
              onChange={(e) => handleChange('base_details', 'base_fabric_name', e.target.value)}
              className={errors['base_details.base_fabric_name'] ? "border-red-500" : ""}
            />
          </div>

          <div className="relative">
            <EnhancedDropdownField
              label="Process *"
              category="process"
              value={formData.base_details.process}
              onValueChange={(val) => handleChange('base_details', 'process', val)}
              options={dropdowns.process}
              onRefresh={refreshDropdowns}
              error={errors['base_details.process']}
            />
            <Button
              variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6"
              onClick={() => handleAISuggestion('process')}
              disabled={aiLoadingField === 'process'}
              title="Suggest Process"
            >
              {aiLoadingField === 'process' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-purple-500" />}
            </Button>
          </div>

          <EnhancedDropdownField
            label="Width *"
            category="width"
            value={formData.base_details.width}
            onValueChange={(val) => handleChange('base_details', 'width', val)}
            options={dropdowns.width}
            onRefresh={refreshDropdowns}
            error={errors['base_details.width']}
          />
        </CardContent>
      </Card>

      {/* 2. Material & Weight */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">2. Material & Weight</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
             <EnhancedDropdownField
              label="Base Material *"
              category="base"
              value={formData.base_details.base}
              onValueChange={(val) => handleChange('base_details', 'base', val)}
              options={dropdowns.base}
              onRefresh={refreshDropdowns}
              error={errors['base_details.base']}
            />
            <Button
              variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6"
              onClick={() => handleAISuggestion('base')}
              disabled={aiLoadingField === 'base'}
            >
               {aiLoadingField === 'base' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-purple-500" />}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={formData.base_details.weight}
              onChange={(e) => handleChange('base_details', 'weight', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>GSM</Label>
              <Input
                type="number"
                value={formData.base_details.gsm}
                onChange={(e) => handleChange('base_details', 'gsm', e.target.value)}
              />
            </div>
            <EnhancedDropdownField
              label="Tolerance"
              category="gsm_tolerance"
              value={formData.base_details.gsm_tolerance}
              onValueChange={(val) => handleChange('base_details', 'gsm_tolerance', val)}
              options={dropdowns.gsm_tolerance}
              onRefresh={refreshDropdowns}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Construction */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">3. Construction Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
             <EnhancedDropdownField
              label="Construction"
              category="construction"
              value={formData.base_details.construction}
              onValueChange={(val) => handleChange('base_details', 'construction', val)}
              options={dropdowns.construction}
              onRefresh={refreshDropdowns}
            />
             <Button
              variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6"
              onClick={() => handleAISuggestion('construction')}
              disabled={aiLoadingField === 'construction'}
            >
               {aiLoadingField === 'construction' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-purple-500" />}
            </Button>
          </div>

          <EnhancedDropdownField
            label="Stretchability"
            category="stretchability"
            value={formData.base_details.stretchability}
            onValueChange={(val) => handleChange('base_details', 'stretchability', val)}
            options={dropdowns.stretchability}
            onRefresh={refreshDropdowns}
          />

          <EnhancedDropdownField
            label="Transparency"
            category="transparency"
            value={formData.base_details.transparency}
            onValueChange={(val) => handleChange('base_details', 'transparency', val)}
            options={dropdowns.transparency}
            onRefresh={refreshDropdowns}
          />

          <EnhancedDropdownField
            label="Handfeel"
            category="handfeel"
            value={formData.base_details.handfeel}
            onValueChange={(val) => handleChange('base_details', 'handfeel', val)}
            options={dropdowns.handfeel}
            onRefresh={refreshDropdowns}
          />
        </CardContent>
      </Card>

      {/* 4. Classification */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">4. Technical Classification</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 relative">
            <Label>HSN Code</Label>
            <div className="flex gap-2">
               <Input
                value={formData.base_details.hsn_code}
                onChange={(e) => handleChange('base_details', 'hsn_code', e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className={errors['base_details.hsn_code'] ? "border-red-500" : ""}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleAISuggestion('hsn_code')}
                disabled={aiLoadingField === 'hsn_code'}
                title="Suggest HSN"
              >
                {aiLoadingField === 'hsn_code' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
              </Button>
            </div>
             {errors['base_details.hsn_code'] && <p className="text-xs text-red-500">{errors['base_details.hsn_code']}</p>}
          </div>

          <EnhancedDropdownField
            label="Yarn Type"
            category="yarn_type"
            value={formData.base_details.yarn_type}
            onValueChange={(val) => handleChange('base_details', 'yarn_type', val)}
            options={dropdowns.yarn_type}
            onRefresh={refreshDropdowns}
          />

          <EnhancedDropdownField
            label="Yarn Count"
            category="yarn_count"
            value={formData.base_details.yarn_count}
            onValueChange={(val) => handleChange('base_details', 'yarn_count', val)}
            options={dropdowns.yarn_count}
            onRefresh={refreshDropdowns}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="fixed bottom-0 right-0 left-0 p-4 bg-white border-t flex justify-end gap-3 z-10 md:static md:bg-transparent md:border-0 md:p-0">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => setShowConfirm(true)} disabled={saving} className="bg-slate-900 text-white min-w-[120px]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this fabric?<br/>
              <strong>SKU:</strong> {formData.generated.sku}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FabricMasterForm;