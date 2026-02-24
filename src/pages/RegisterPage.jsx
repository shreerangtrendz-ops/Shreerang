import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { CustomerService } from '@/services/CustomerService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { getAllCountries, getStatesForCountry, getCitiesForState, lookupPincode } from '@/lib/locationHelpers';
import DynamicDropdown from '@/components/common/DynamicDropdown'; // Ensure this import is correct

const RegisterPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    businessType: '',
    gstNumber: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    termsAccepted: false
  });

  // Location handling (simplified for this example)
  const countries = useMemo(() => getAllCountries(), []);
  const states = useMemo(() => getStatesForCountry('IN'), []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.termsAccepted) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please accept terms and conditions' });
      return;
    }

    setLoading(true);

    try {
      // 1. Check for duplicate phone in customers table (using CustomerService logic via backend check typically, but here direct Supabase check)
      const existingCustomer = await CustomerService.getCustomerByPhone(formData.phone).catch(() => null);
      if (existingCustomer) {
        toast({ 
          variant: 'destructive', 
          title: 'Account Exists', 
          description: 'This phone number is already registered. Please log in instead.' 
        });
        setLoading(false);
        return;
      }

      // 2. Auth SignUp
      const { user, error } = await signUp(
        { email: formData.email, password: formData.password, phone: formData.phone },
        { 
          full_name: formData.fullName,
          company_name: formData.companyName,
          role: 'customer' // Default role
        }
      );

      if (error) throw error;

      // 3. Create Detailed Customer Record
      if (user) {
        await CustomerService.createCustomer({
          phone: formData.phone,
          name: formData.fullName,
          email: formData.email,
          company_name: formData.companyName,
          business_type: formData.businessType,
          location: `${formData.city}, ${formData.state}`,
          gst_number: formData.gstNumber,
          website: formData.website,
          source: 'website',
          user_id: user.id // Link customer record to auth user
        });
        
        toast({ 
          title: 'Registration Successful', 
          description: 'Welcome! Your account has been created with REGISTERED tier benefits.' 
        });
        navigate('/');
      }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet><title>Register - Join Our Network</title></Helmet>
      
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-8 py-6 bg-slate-900 text-white">
          <h2 className="text-2xl font-bold">Create Business Account</h2>
          <p className="text-slate-300 mt-1">Join our network for wholesale pricing and exclusive designs</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input required name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
            </div>
            
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input required name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Fashion Pvt Ltd" />
            </div>

            <div className="space-y-2">
              <Label>Business Type *</Label>
              <DynamicDropdown 
                dropdownName="BUSINESS_TYPE"
                value={formData.businessType}
                onChange={(val) => handleSelectChange('businessType', val)}
                placeholder="Select Business Type"
                allowAI={true} // Allow AI suggestions for Business Type
              />
            </div>

            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="Optional" />
            </div>

            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@company.com" />
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input required type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" />
            </div>

             <div className="space-y-2">
              <Label>Password *</Label>
              <Input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
            </div>
            
             <div className="space-y-2">
              <Label>Website</Label>
              <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-slate-900">Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                 <Label>City *</Label>
                 <Input required name="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                 <Label>State *</Label>
                 <Input required name="state" value={formData.state} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                 <Label>Pincode *</Label>
                 <Input required name="pincode" value={formData.pincode} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
             <Checkbox id="terms" checked={formData.termsAccepted} onCheckedChange={(checked) => setFormData(p => ({ ...p, termsAccepted: checked }))} />
             <label htmlFor="terms" className="text-sm text-slate-600">
               I agree to the Terms & Conditions and Privacy Policy
             </label>
          </div>

          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Register & View Wholesale Prices'}
          </Button>
          
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;