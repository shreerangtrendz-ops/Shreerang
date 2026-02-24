import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { getAllCountries, getStatesForCountry, getCitiesForState, lookupPincode } from '@/lib/locationHelpers';

const AddCustomerDialog = ({ onCustomerAdded, triggerButton, open, onOpenChange }) => {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  
  // Location States
  const [locCodes, setLocCodes] = useState({ billingCountry: 'IN', billingState: '', deliveryCountry: 'IN', deliveryState: '' });
  const [whatsappCode, setWhatsappCode] = useState('+91');

  const [formData, setFormData] = useState({
    firm_name: '', full_name: '', email: '', password: '', 
    whatsapp_number: '', gst_number: '', transport: '', assigned_agent_id: 'none',
    billing_address: '', billing_country: 'India', billing_state: '', billing_city: '', billing_pincode: '',
    same_as_billing: true,
    delivery_address: '', delivery_country: 'India', delivery_state: '', delivery_city: '', delivery_pincode: ''
  });

  const countries = useMemo(() => getAllCountries(), []);
  const billingStates = useMemo(() => getStatesForCountry(locCodes.billingCountry), [locCodes.billingCountry]);
  const billingCities = useMemo(() => getCitiesForState(locCodes.billingCountry, locCodes.billingState), [locCodes.billingCountry, locCodes.billingState]);
  
  const deliveryStates = useMemo(() => getStatesForCountry(locCodes.deliveryCountry), [locCodes.deliveryCountry]);
  const deliveryCities = useMemo(() => getCitiesForState(locCodes.deliveryCountry, locCodes.deliveryState), [locCodes.deliveryCountry, locCodes.deliveryState]);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      const defaultCountry = countries.find(c => c.value === 'IN');
      if (defaultCountry) setWhatsappCode(`+${defaultCountry.phoneCode}`);
    }
  }, [isOpen, countries]);

  const fetchAgents = async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name').in('role', ['sales_team', 'agent']);
    setAgents(data || []);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleLocationChange = (type, value, section = 'billing') => {
      if (type === 'country') {
          const country = countries.find(c => c.value === value);
          const name = country?.label || '';
          
          if (section === 'billing') {
              setLocCodes(prev => ({ ...prev, billingCountry: value, billingState: '' }));
              setFormData(prev => ({ ...prev, billing_country: name, billing_state: '', billing_city: '' }));
              if (country?.phoneCode) setWhatsappCode(`+${country.phoneCode}`);
          } else {
              setLocCodes(prev => ({ ...prev, deliveryCountry: value, deliveryState: '' }));
              setFormData(prev => ({ ...prev, delivery_country: name, delivery_state: '', delivery_city: '' }));
          }
      } else if (type === 'state') {
          if (section === 'billing') {
              const state = billingStates.find(s => s.value === value);
              setLocCodes(prev => ({ ...prev, billingState: value }));
              setFormData(prev => ({ ...prev, billing_state: state?.label || '', billing_city: '' }));
          } else {
              const state = deliveryStates.find(s => s.value === value);
              setLocCodes(prev => ({ ...prev, deliveryState: value }));
              setFormData(prev => ({ ...prev, delivery_state: state?.label || '', delivery_city: '' }));
          }
      }
  };

  const handlePincodeBlur = async (e, section) => {
      const code = e.target.value;
      if (code && code.length === 6) {
          setPincodeLoading(true);
          const result = await lookupPincode(code);
          if (result) {
              if (section === 'billing') {
                  setLocCodes(prev => ({ ...prev, billingCountry: result.countryCode, billingState: result.stateCode }));
                  setFormData(prev => ({
                      ...prev,
                      billing_country: result.countryName,
                      billing_state: result.stateName,
                      billing_city: result.city
                  }));
                  // Sync WA code
                  const c = countries.find(x => x.value === result.countryCode);
                  if (c?.phoneCode) setWhatsappCode(`+${c.phoneCode}`);
              } else {
                  setLocCodes(prev => ({ ...prev, deliveryCountry: result.countryCode, deliveryState: result.stateCode }));
                  setFormData(prev => ({
                      ...prev,
                      delivery_country: result.countryName,
                      delivery_state: result.stateName,
                      delivery_city: result.city
                  }));
              }
              toast({ description: `${section === 'billing' ? 'Billing' : 'Delivery'} location auto-filled.` });
          }
          setPincodeLoading(false);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const billingAddr = {
            line1: formData.billing_address,
            city: formData.billing_city,
            state: formData.billing_state,
            country: formData.billing_country,
            pincode: formData.billing_pincode
        };
        const deliveryAddr = formData.same_as_billing ? billingAddr : {
            line1: formData.delivery_address,
            city: formData.delivery_city,
            state: formData.delivery_state,
            country: formData.delivery_country,
            pincode: formData.delivery_pincode
        };

        const emailToUse = formData.email || `cust_${Date.now()}@offline.local`;
        
        const tempSupabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
        
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: emailToUse,
            password: formData.password,
            options: { data: { full_name: formData.full_name } }
        });

        if (authError || !authData.user) throw new Error("Auth creation failed: " + (authError?.message || 'Unknown'));

        const profileData = {
            id: authData.user.id,
            full_name: formData.full_name,
            firm_name: formData.firm_name,
            email: formData.email || null,
            phone_number: `${whatsappCode} ${formData.whatsapp_number}`,
            whatsapp_number: `${whatsappCode} ${formData.whatsapp_number}`,
            gst_number: formData.gst_number,
            transport: formData.transport,
            assigned_agent_id: formData.assigned_agent_id === 'none' ? null : formData.assigned_agent_id,
            role: 'wholesale_customer',
            is_approved: true,
            address: billingAddr,
            delivery_address: deliveryAddr,
            city: billingAddr.city, state: billingAddr.state, country: billingAddr.country, pincode: billingAddr.pincode
        };

        const { error: profileError } = await supabase.from('user_profiles').upsert(profileData);
        if (profileError) throw profileError;

        toast({ title: "Customer Added", description: "Successfully created new customer." });
        if (onCustomerAdded) onCustomerAdded(profileData);
        setIsOpen(false);
        setFormData({ firm_name: '', full_name: '', email: '', password: '', whatsapp_number: '', gst_number: '', transport: '', assigned_agent_id: 'none', billing_address: '', billing_country: 'India', billing_state: '', billing_city: '', billing_pincode: '', same_as_billing: true, delivery_address: '', delivery_country: 'India', delivery_state: '', delivery_city: '', delivery_pincode: '' });

    } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton || <Button><UserPlus className="h-4 w-4 mr-2"/>Add Customer</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Firm Name *</Label><Input value={formData.firm_name} onChange={e => handleChange('firm_name', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Contact Person *</Label><Input value={formData.full_name} onChange={e => handleChange('full_name', e.target.value)} required /></div>
            <div className="space-y-2"><Label>GST Number</Label><Input value={formData.gst_number} onChange={e => handleChange('gst_number', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2">
                <Label>WhatsApp Number *</Label>
                <div className="flex gap-2">
                    <Input className="w-20" value={whatsappCode} readOnly />
                    <Input value={formData.whatsapp_number} onChange={e => handleChange('whatsapp_number', e.target.value)} required />
                </div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input value={formData.email} onChange={e => handleChange('email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Initial Password *</Label><Input value={formData.password} onChange={e => handleChange('password', e.target.value)} required /></div>
          </div>

          <Tabs defaultValue="billing" className="w-full border rounded-md p-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="billing">Billing Address</TabsTrigger>
              <TabsTrigger value="delivery">Delivery Address</TabsTrigger>
            </TabsList>
            
            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Address Line</Label><Textarea value={formData.billing_address} onChange={e => handleChange('billing_address', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                     {/* Pincode First */}
                    <div className="space-y-2 relative">
                        <Label>Pincode</Label>
                        <Input value={formData.billing_pincode} onChange={e => handleChange('billing_pincode', e.target.value)} onBlur={e => handlePincodeBlur(e, 'billing')} maxLength={6} />
                        {pincodeLoading && <Loader2 className="absolute right-2 top-8 h-4 w-4 animate-spin"/>}
                    </div>

                    {/* City Second */}
                    <div className="space-y-2">
                        <Label>City</Label>
                         {billingCities.length > 0 ? (
                            <Select value={formData.billing_city} onValueChange={v => handleChange('billing_city', v)}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent className="bg-white max-h-60">{billingCities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                         ) : <Input value={formData.billing_city} onChange={e => handleChange('billing_city', e.target.value)} />}
                    </div>

                    {/* State Third */}
                    <div className="space-y-2">
                        <Label>State</Label>
                        <Select value={locCodes.billingState} onValueChange={v => handleLocationChange('state', v, 'billing')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white max-h-60">{billingStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    
                    {/* Country Last */}
                     <div className="space-y-2">
                        <Label>Country</Label>
                        <Select value={locCodes.billingCountry} onValueChange={v => handleLocationChange('country', v, 'billing')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">{countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>

            {/* Delivery Tab */}
            <TabsContent value="delivery" className="space-y-4 pt-4">
                 <div className="flex items-center gap-2 mb-2">
                    <Checkbox checked={formData.same_as_billing} onCheckedChange={c => handleChange('same_as_billing', c)} id="same"/>
                    <Label htmlFor="same">Same as Billing</Label>
                 </div>
                 {!formData.same_as_billing && (
                     <div className="grid grid-cols-2 gap-4">
                         <div className="col-span-2 space-y-2"><Label>Address Line</Label><Textarea value={formData.delivery_address} onChange={e => handleChange('delivery_address', e.target.value)} /></div>
                         
                         {/* Pincode First */}
                         <div className="space-y-2"><Label>Pincode</Label><Input value={formData.delivery_pincode} onChange={e => handleChange('delivery_pincode', e.target.value)} onBlur={e => handlePincodeBlur(e, 'delivery')} /></div>
                         
                         {/* City Second */}
                         <div className="space-y-2">
                            <Label>City</Label>
                            {deliveryCities.length > 0 ? (
                                <Select value={formData.delivery_city} onValueChange={v => handleChange('delivery_city', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white max-h-60">{deliveryCities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            ) : <Input value={formData.delivery_city} onChange={e => handleChange('delivery_city', e.target.value)} />}
                         </div>

                         {/* State Third */}
                         <div className="space-y-2">
                            <Label>State</Label>
                            <Select value={locCodes.deliveryState} onValueChange={v => handleLocationChange('state', v, 'delivery')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-white max-h-60">{deliveryStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                         </div>
                         
                         {/* Country Last */}
                         <div className="space-y-2">
                            <Label>Country</Label>
                            <Select value={locCodes.deliveryCountry} onValueChange={v => handleLocationChange('country', v, 'delivery')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-white">{countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                         </div>
                     </div>
                 )}
            </TabsContent>
          </Tabs>

          <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Customer'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default AddCustomerDialog;