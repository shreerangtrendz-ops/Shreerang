import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save, X } from 'lucide-react';
import { FabricService } from '@/services/FabricService';
import * as Constants from '@/lib/fabricMasterConstants';
import { cn } from '@/lib/utils';

const FabricSpecificationForm = ({ initialData = {}, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    fabric_name: '', // User input part of the name
    base_fabric_name: '', // Calculated
    finish_type: 'Greige',
    width: '58"',
    base: '',
    base_code: '',
    weight: '',
    gsm: '',
    gsm_tolerance: '+/- 5%',
    construction: '',
    construction_code: '',
    stretchability: 'Rigid',
    transparency: 'Opaque',
    handfeel: 'Soft',
    hsn_code: '',
    yarn_type: 'Spun',
    yarn_count: '',
    yarn_count_unit: 's',
    sku: '',
    short_code: '',
    ...initialData
  });

  const [errors, setErrors] = useState({});

  // Auto-calculation Effect
  useEffect(() => {
    const { width, fabric_name, finish_type, base, construction } = formData;
    
    // Calculate Base Fabric Name
    // Note: If initialData has a base_fabric_name but no separate fabric_name, we might need to parse it.
    // For simplicity, we assume user types 'fabric_name' (e.g. "Poplin") and we generate "58 Poplin Greige".
    const calcName = FabricService.calculateBaseFabricName(width, fabric_name || base, finish_type);
    
    // Generate Codes
    const baseCode = FabricService.generateCodeFromBase(base);
    const constCode = FabricService.generateCodeFromConstruction(construction);
    const shortCode = Constants.generateShortCode(base, construction);
    const sku = Constants.generateSKU(width, shortCode, finish_type);

    setFormData(prev => ({
      ...prev,
      base_fabric_name: calcName,
      base_code: baseCode,
      construction_code: constCode,
      short_code: shortCode,
      sku: sku
    }));
  }, [formData.width, formData.fabric_name, formData.finish_type, formData.base, formData.construction]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = FabricService.validateFabricSpecification(formData);
    
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            1. Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-slate-600">Base Fabric Name (Auto-Calculated)</Label>
            <Input 
              value={formData.base_fabric_name} 
              readOnly 
              className="bg-slate-100 font-medium text-slate-700 border-slate-200" 
            />
            <p className="text-xs text-muted-foreground">Formula: Width + Fabric Name + Finish</p>
          </div>
          
          <div className="space-y-2">
            <Label>Fabric Name / Quality <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.fabric_name} 
              onChange={e => handleChange('fabric_name', e.target.value)}
              placeholder="e.g. Poplin, Satin"
              className={cn(errors.fabric_name && "border-red-500 bg-red-50")}
            />
          </div>

          <div className="space-y-2">
            <Label>Finish <span className="text-red-500">*</span></Label>
            <Select value={formData.finish_type} onValueChange={val => handleChange('finish_type', val)}>
              <SelectTrigger><SelectValue placeholder="Select Finish" /></SelectTrigger>
              <SelectContent>
                {Constants.FINISHES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Width <span className="text-red-500">*</span></Label>
            <Select value={formData.width} onValueChange={val => handleChange('width', val)}>
              <SelectTrigger><SelectValue placeholder="Select Width" /></SelectTrigger>
              <SelectContent>
                {Constants.WIDTHS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base <span className="text-red-500">*</span></Label>
            <Select value={formData.base} onValueChange={val => handleChange('base', val)}>
              <SelectTrigger><SelectValue placeholder="Select Base" /></SelectTrigger>
              <SelectContent>
                {Constants.BASES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base Code (Auto)</Label>
            <Input value={formData.base_code} readOnly className="bg-slate-50" />
          </div>
        </CardContent>
      </Card>

      {/* Weight & Measurement */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            2. Weight & Measurement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Weight (kg/mtr)</Label>
            <Input 
              type="number" step="0.001" 
              value={formData.weight} 
              onChange={e => handleChange('weight', e.target.value)}
              placeholder="0.000"
            />
          </div>
          <div className="space-y-2">
            <Label>GSM</Label>
            <Input 
              type="number" 
              value={formData.gsm} 
              onChange={e => handleChange('gsm', e.target.value)}
              placeholder="120"
            />
          </div>
          <div className="space-y-2">
            <Label>GSM Tolerance</Label>
            <Select value={formData.gsm_tolerance} onValueChange={val => handleChange('gsm_tolerance', val)}>
              <SelectTrigger><SelectValue placeholder="Select Tolerance" /></SelectTrigger>
              <SelectContent>
                {Constants.GSM_TOLERANCES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Construction Details */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            3. Construction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Construction</Label>
            <Select value={formData.construction} onValueChange={val => handleChange('construction', val)}>
              <SelectTrigger><SelectValue placeholder="Select Construction" /></SelectTrigger>
              <SelectContent>
                {Constants.CONSTRUCTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Construction Code (Auto)</Label>
            <Input value={formData.construction_code} readOnly className="bg-slate-50" />
          </div>

          <div className="space-y-2">
            <Label>Stretchability</Label>
            <Select value={formData.stretchability} onValueChange={val => handleChange('stretchability', val)}>
              <SelectTrigger><SelectValue placeholder="Select Stretch" /></SelectTrigger>
              <SelectContent>
                {Constants.STRETCHABILITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transparency</Label>
            <Select value={formData.transparency} onValueChange={val => handleChange('transparency', val)}>
              <SelectTrigger><SelectValue placeholder="Select Transparency" /></SelectTrigger>
              <SelectContent>
                {Constants.TRANSPARENCIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Handfeel</Label>
            <Select value={formData.handfeel} onValueChange={val => handleChange('handfeel', val)}>
              <SelectTrigger><SelectValue placeholder="Select Handfeel" /></SelectTrigger>
              <SelectContent>
                {Constants.HANDFEELS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Yarn Details */}
      <Card>
        <CardHeader className="bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            4. Yarn & Regulatory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>HSN Code</Label>
            <Input 
              value={formData.hsn_code} 
              onChange={e => handleChange('hsn_code', e.target.value)}
              placeholder="5407"
            />
          </div>

          <div className="space-y-2">
            <Label>Yarn Type</Label>
            <Select value={formData.yarn_type} onValueChange={val => handleChange('yarn_type', val)}>
              <SelectTrigger><SelectValue placeholder="Select Yarn Type" /></SelectTrigger>
              <SelectContent>
                {Constants.YARN_TYPES.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Yarn Count</Label>
            <div className="flex gap-2">
              <Input 
                value={formData.yarn_count} 
                onChange={e => handleChange('yarn_count', e.target.value)}
                placeholder="e.g. 30"
                className="flex-1"
              />
              <Select value={formData.yarn_count_unit} onValueChange={val => handleChange('yarn_count_unit', val)}>
                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.YARN_COUNT_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Specification</>}
        </Button>
      </div>
    </form>
  );
};

export default FabricSpecificationForm;