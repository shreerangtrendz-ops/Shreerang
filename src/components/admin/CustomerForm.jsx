import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, MapPin, Plus } from 'lucide-react';
import { lookupPincode, getCountries, getCountryCode } from '@/lib/pincodeService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AgentForm from '@/components/admin/AgentForm';

const CustomerForm = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [countries, setCountries] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    city: '',
    state: '',
    country: 'India',
    country_code: 'IN',
    zip_code: '', 
    gst_number: '',
    credit_limit: '',
    payment_terms: 'Immediate',
    credit_days: 0,
    bank_details: '',
    notes: '',
    status: 'active',
    agent_id: ''
  });

  useEffect(() => {
    const fetchInitial = async () => {
        const list = await getCountries();
        if(list && list.length > 0) setCountries(list);
        
        const { data: ag } = await supabase.from('agents').select('id, agent_name, agency_name');
        setAgents(ag || []);
    };
    fetchInitial();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e) => {
    const code = e.target.value;
    setFormData(prev => ({ ...prev, pincode: code, zip_code: code }));
    
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

  const handleAgentCreated = (newAgent) => {
      setAgents(prev => [...prev, newAgent]);
      setFormData(prev => ({ ...prev, agent_id: newAgent.id }));
      setIsAgentModalOpen(false);
      toast({ title: "Agent Added", description: `${newAgent.agent_name} selected.` });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (!formData.phone.trim()) return toast({ title: "Phone is required", variant: "destructive" });

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        credit_days: parseInt(formData.credit_days || 0),
        agent_id: formData.agent_id || null
      };

      const { data, error } = await supabase.from('customers').insert(payload).select().single();
      if (error) throw error;

      toast({ title: "Success", description: "Customer created successfully" });
      if (onSuccess) onSuccess(data);
      
      setFormData({
        name: '', company_name: '', contact_person: '', email: '', phone: '',
        address: '', pincode: '', city: '', state: '', country: 'India', country_code: 'IN', zip_code: '',
        gst_number: '', credit_limit: '', payment_terms: 'Immediate', credit_days: 0,
        bank_details: '', notes: '', status: 'active', agent_id: ''
      });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Firm Name *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Shanaya Fashion" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." required />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
          <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Billing Address</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address Line *</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 relative">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input id="pincode" name="pincode" value={formData.pincode} onChange={handlePincodeChange} maxLength={6} required />
                {isLookingUpPincode && <Loader2 className="absolute right-2 top-8 h-4 w-4 animate-spin text-muted-foreground" />}
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
          <Label htmlFor="company_name">Legal/Company Name</Label>
          <Input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} placeholder="If different from Firm Name" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="gst_number">GST Number</Label>
          <Input id="gst_number" name="gst_number" value={formData.gst_number} onChange={handleChange} className="uppercase" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="space-y-2">
            <Label>Agent</Label>
            <div className="flex gap-2">
                <Select value={formData.agent_id} onValueChange={v => handleSelectChange('agent_id', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select Agent" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {agents.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.agent_name} {a.agency_name ? `(${a.agency_name})` : ''}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAgentModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
         </div>

         <div className="space-y-2">
            <Label htmlFor="credit_days">Credit Days</Label>
            <div className="relative">
                <Input type="number" id="credit_days" name="credit_days" value={formData.credit_days} onChange={handleChange} min={0} max={60} />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">days</span>
            </div>
         </div>

         <div className="space-y-2">
            <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
            <Input id="credit_limit" name="credit_limit" type="number" value={formData.credit_limit} onChange={handleChange} />
         </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Create Customer
        </Button>
      </div>
    </form>

    <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Add New Agent</DialogTitle></DialogHeader>
            <AgentForm onSuccess={handleAgentCreated} onCancel={() => setIsAgentModalOpen(false)} />
        </DialogContent>
    </Dialog>
    </>
  );
};

export default CustomerForm;