import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, MapPin } from 'lucide-react';
import { lookupPincode, getCountries, getCountryCode } from '@/lib/pincodeService';

const AgentForm = ({ onSuccess, onCancel, initialData = null }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [countries, setCountries] = useState([]);
  
  const [formData, setFormData] = useState({
    agent_name: '',
    agency_name: '',
    contact_person: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    address: '',
    pincode: '',
    city: '',
    state: '',
    country: 'India',
    country_code: 'IN',
    gst_number: '',
    pan_number: '',
    commission_percentage: '',
  });

  useEffect(() => {
    const fetchCountries = async () => {
        const list = await getCountries();
        if(list && list.length > 0) setCountries(list);
    };
    fetchCountries();

    if (initialData) {
        setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e) => {
    const code = e.target.value;
    setFormData(prev => ({ ...prev, pincode: code }));
    
    if (code.length === 6) {
        setIsLookingUpPincode(true);
        const data = await lookupPincode(code);
        setIsLookingUpPincode(false);

        if (data) {
            setFormData(prev => ({
                ...prev,
                city: data.city,
                state: data.state,
                country: data.country,
                country_code: data.country_code
            }));
            toast({ title: "Address Found", description: `Auto-filled: ${data.city}, ${data.state}` });
        }
    }
  };

  const handleCountryChange = async (val) => {
      const codeData = await getCountryCode(val);
      setFormData(prev => ({ 
          ...prev, 
          country: val, 
          country_code: codeData ? codeData.country_code : prev.country_code 
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agent_name.trim()) return toast({ title: "Agent Name is required", variant: "destructive" });
    if (!formData.phone.trim()) return toast({ title: "Phone number is required", variant: "destructive" });

    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      
      let result;
      if (initialData?.id) {
          const { data, error } = await supabase.from('agents').update(payload).eq('id', initialData.id).select().single();
          if (error) throw error;
          result = data;
          toast({ title: "Success", description: "Agent updated successfully" });
      } else {
          const { data, error } = await supabase.from('agents').insert(payload).select().single();
          if (error) throw error;
          result = data;
          toast({ title: "Success", description: "Agent created successfully" });
      }
      
      if (onSuccess) onSuccess(result);
      if (!initialData) {
          setFormData({
            agent_name: '', agency_name: '', contact_person: '', email: '', phone: '', whatsapp_number: '',
            address: '', pincode: '', city: '', state: '', country: 'India', country_code: 'IN',
            gst_number: '', pan_number: '', commission_percentage: ''
          });
      }

    } catch (error) {
      console.error("Error saving agent:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="agency_name">Agency Name</Label>
          <Input id="agency_name" name="agency_name" value={formData.agency_name} onChange={handleChange} placeholder="e.g. Royal Agencies" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent_name">Agent Name *</Label>
          <Input id="agent_name" name="agent_name" value={formData.agent_name} onChange={handleChange} placeholder="e.g. Rahul Kumar" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission_percentage">Commission (%)</Label>
          <Input type="number" id="commission_percentage" name="commission_percentage" value={formData.commission_percentage} onChange={handleChange} placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
            <Input id="whatsapp_number" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
          <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Address Details</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address Line</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Office no, Building..." />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 relative">
                <Label htmlFor="pincode">Pincode *</Label>
                <div className="relative">
                    <Input id="pincode" name="pincode" value={formData.pincode} onChange={handlePincodeChange} maxLength={6} required />
                    {isLookingUpPincode && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} readOnly={isLookingUpPincode} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" value={formData.state} onChange={handleChange} readOnly={isLookingUpPincode} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={handleCountryChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        {countries.filter(c => c.country !== 'India').map(c => (
                            <SelectItem key={c.country_code} value={c.country}>{c.country}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gst_number">GST Number</Label>
          <Input id="gst_number" name="gst_number" value={formData.gst_number} onChange={handleChange} className="uppercase" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pan_number">PAN Number</Label>
          <Input id="pan_number" name="pan_number" value={formData.pan_number} onChange={handleChange} className="uppercase" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {initialData ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
};

export default AgentForm;