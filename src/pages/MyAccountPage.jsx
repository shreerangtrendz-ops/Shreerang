import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, LogOut, MapPin, Plus, ArrowLeft, Pencil, Building2, Globe, FileText, Phone, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { getAllCountries, getStatesForCountry, getCitiesForState, lookupPincode, findLocationCodes } from '@/lib/locationHelpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MyAccountPage = () => {
  const { user, signOut, updateUserPassword } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [isAddAddrOpen, setIsAddAddrOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
      address_nickname: '',
      address_line: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  
  const [locCodes, setLocCodes] = useState({ country: '', state: '' });
  const [whatsappCode, setWhatsappCode] = useState('');

  const countries = useMemo(() => getAllCountries(), []);
  const states = useMemo(() => getStatesForCountry(locCodes.country), [locCodes.country]);
  const cities = useMemo(() => getCitiesForState(locCodes.country, locCodes.state), [locCodes.country, locCodes.state]);

  useEffect(() => {
      if (user) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
      setAddrLoading(true);
      const { data } = await supabase.from('customer_delivery_addresses').select('*').eq('user_id', user?.id);
      setAddresses(data || []);
      setAddrLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: "destructive", title: "Error signing out", description: error.message });
    } else {
      navigate('/login');
    }
  };

  const handlePasswordChange = async (e) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          toast({ variant: "destructive", description: "Passwords do not match." });
          return;
      }
      if (newPassword.length < 8) {
           toast({ variant: "destructive", description: "Password must be at least 8 characters." });
           return;
      }

      setPassLoading(true);
      const { error } = await updateUserPassword(newPassword);
      setPassLoading(false);

      if (error) {
          toast({ variant: "destructive", title: "Failed to update password", description: error.message });
      } else {
          toast({ title: "Success", description: "Your password has been updated." });
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  const handleAddAddress = async (e) => {
      e.preventDefault();
      if (!newAddress.address_line || !newAddress.city) return;

      const { error } = await supabase.from('customer_delivery_addresses').insert({
          user_id: user.id,
          ...newAddress
      });

      if (error) {
          toast({ variant: "destructive", description: error.message });
      } else {
          toast({ title: "Address Added", description: "New delivery address saved." });
          setIsAddAddrOpen(false);
          setNewAddress({ address_nickname: '', address_line: '', city: '', state: '', pincode: '', country: 'India' });
          fetchAddresses();
      }
  };

  const handleDeleteAddress = async (id) => {
      const { error } = await supabase.from('customer_delivery_addresses').delete().eq('id', id);
      if (!error) fetchAddresses();
  };

  const openEditProfile = () => {
      const addr = profile?.address || {};
      const cName = addr.country || profile?.country || 'India';
      const sName = addr.state || profile?.state || '';
      
      const codes = findLocationCodes(cName, sName);
      
      setLocCodes({ country: codes.countryCode, state: codes.stateCode });
      
      const waFull = profile?.whatsapp_number || '';
      const cPhoneCode = countries.find(c => c.value === codes.countryCode)?.phoneCode;
      const waCode = waFull.includes(' ') ? waFull.split(' ')[0] : (cPhoneCode ? `+${cPhoneCode}` : '+91');
      const waNum = waFull.includes(' ') ? waFull.split(' ').slice(1).join(' ') : waFull;

      setEditFormData({
          firm_name: profile?.firm_name || '',
          full_name: profile?.full_name || '',
          whatsapp_number: waNum,
          email: profile?.email || '',
          gst_number: profile?.gst_number || '',
          transport: profile?.transport || '',
          address_line1: addr.line1 || (typeof profile?.address === 'string' ? profile.address : '') || '',
          city: addr.city || profile?.city || '',
          state: sName,
          country: cName,
          pincode: addr.pincode || profile?.pincode || '',
      });
      setWhatsappCode(waCode);
      setIsEditProfileOpen(true);
  };

  const handlePincodeBlur = async (e) => {
      const code = e.target.value;
      if (code && code.length === 6) {
          setPincodeLoading(true);
          const result = await lookupPincode(code);
          if (result) {
              setLocCodes({ country: result.countryCode, state: result.stateCode });
              setEditFormData(prev => ({
                  ...prev,
                  country: result.countryName,
                  state: result.stateName,
                  city: result.city
              }));
              const c = countries.find(x => x.value === result.countryCode);
              if (c) setWhatsappCode(`+${c.phoneCode}`);
              toast({ description: "Location auto-filled." });
          }
          setPincodeLoading(false);
      }
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setIsUpdatingProfile(true);
      
      const updatedData = {
          firm_name: editFormData.firm_name,
          full_name: editFormData.full_name,
          whatsapp_number: `${whatsappCode} ${editFormData.whatsapp_number}`,
          email: editFormData.email,
          gst_number: editFormData.gst_number,
          transport: editFormData.transport,
          city: editFormData.city, state: editFormData.state, country: editFormData.country, pincode: editFormData.pincode,
          address: {
              line1: editFormData.address_line1,
              city: editFormData.city,
              state: editFormData.state,
              country: editFormData.country,
              pincode: editFormData.pincode,
          },
          updated_at: new Date()
      };
      
      try {
        const { error } = await supabase.from('user_profiles').update(updatedData).eq('id', user.id);
        if (error) throw error;
        toast({ title: "Profile Updated" });
        setIsEditProfileOpen(false);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      } finally {
        setIsUpdatingProfile(false);
      }
  };

  if (profileLoading) return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  if (profileError && !profile) {
      return (
          <div className="container mx-auto px-4 py-8 max-w-5xl">
              <div className="mb-6">
                <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" /> Go Back
                </Button>
              </div>
              <Alert variant="destructive">
                  <AlertTitle>Error loading profile</AlertTitle>
                  <AlertDescription className="flex flex-col gap-4">
                      <p>We couldn't load your profile information. This might be due to a network issue.</p>
                      <Button variant="outline" size="sm" onClick={refetchProfile} className="w-fit bg-white hover:bg-slate-100">
                          <RefreshCw className="mr-2 h-4 w-4" /> Retry Connection
                      </Button>
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  const FieldDisplay = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
            {Icon && <Icon className="h-3 w-3" />} {label}
        </Label>
        <div className={`font-medium text-sm ${!value ? 'text-muted-foreground italic' : ''}`}>
            {value || 'Not provided'}
        </div>
    </div>
  );
  
  return (
    <>
      <Helmet><title>My Account</title></Helmet>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-72 space-y-4">
             <div className="p-6 bg-white border rounded-xl shadow-sm text-center">
                 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                     <User className="w-10 h-10" />
                 </div>
                 <h3 className="font-bold text-lg text-slate-900">{profile?.firm_name || profile?.full_name}</h3>
                 <p className="text-sm text-muted-foreground break-all mb-3">{user?.email}</p>
                 <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full uppercase font-bold tracking-wider">
                     {profile?.role?.replace('_', ' ')}
                 </div>
             </div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full justify-start mb-6 bg-transparent p-0 border-b rounded-none h-auto">
                <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Profile Details</TabsTrigger>
                <TabsTrigger value="addresses" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Delivery Addresses</TabsTrigger>
                <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>Business Information</CardTitle>
                        <CardDescription>Manage your business profile and contact details</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={openEditProfile} className="gap-2">
                        <Pencil className="h-3.5 w-3.5" /> Edit Profile
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Basic Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldDisplay label="Firm Name" value={profile?.firm_name} icon={Building2} />
                            <FieldDisplay label="Contact Person" value={profile?.full_name} icon={User} />
                            <FieldDisplay label="GST Number" value={profile?.gst_number} icon={FileText} />
                            <FieldDisplay label="Transport Preference" value={profile?.transport} icon={Building2} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Contact Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldDisplay label="Email Address" value={profile?.email || user?.email} icon={FileText} />
                            <FieldDisplay label="WhatsApp/Mobile" value={profile?.whatsapp_number || profile?.phone_number} icon={Phone} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Billing Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldDisplay label="Address Line" value={typeof profile?.address === 'object' ? profile?.address?.line1 : profile?.address} icon={MapPin} />
                            <div className="grid grid-cols-2 gap-4">
                                <FieldDisplay label="City" value={profile?.city || (typeof profile?.address === 'object' ? profile?.address?.city : '')} icon={Globe} />
                                <FieldDisplay label="State" value={profile?.state || (typeof profile?.address === 'object' ? profile?.address?.state : '')} icon={Globe} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FieldDisplay label="Country" value={profile?.country || (typeof profile?.address === 'object' ? profile?.address?.country : '')} icon={Globe} />
                                <FieldDisplay label="Pincode" value={profile?.pincode || (typeof profile?.address === 'object' ? profile?.address?.pincode : '')} icon={MapPin} />
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="addresses" className="mt-0">
                 <Card>
                     <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                             <CardTitle>Delivery Addresses</CardTitle>
                             <CardDescription>Manage your additional shipping locations</CardDescription>
                         </div>
                         <Button size="sm" onClick={() => setIsAddAddrOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add New</Button>
                     </CardHeader>
                     <CardContent>
                         {addresses.length === 0 ? (
                             <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
                                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">No additional delivery addresses found.</p>
                             </div>
                         ) : (
                             <div className="grid gap-4">
                                 {addresses.map(addr => (
                                     <div key={addr.id} className="flex justify-between items-start p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                         <div>
                                             <div className="font-semibold flex items-center gap-2">
                                                 <MapPin className="h-4 w-4 text-primary" />
                                                 {addr.address_nickname || 'Address'}
                                             </div>
                                             <div className="text-sm text-slate-600 mt-1 pl-6">
                                                 {addr.address_line}
                                                 <br />
                                                 {addr.city}, {addr.state} - {addr.pincode}
                                                 <br />
                                                 {addr.country}
                                             </div>
                                         </div>
                                         <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteAddress(addr.id)}>Delete</Button>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                        </div>
                        <Button type="submit" disabled={passLoading} className="w-full">
                            {passLoading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                  </CardContent>
                </Card>
                
                <div className="mt-8 border-t pt-8">
                    <Button variant="destructive" onClick={handleLogout} className="gap-2">
                        <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Edit Profile Dialog */}
         <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit Profile Information</DialogTitle></DialogHeader>
                <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Firm Name</Label><Input value={editFormData.firm_name} onChange={e => setEditFormData({...editFormData, firm_name: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Contact Person</Label><Input value={editFormData.full_name} onChange={e => setEditFormData({...editFormData, full_name: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label>WhatsApp Number</Label>
                             <div className="flex gap-2">
                                <Input className="w-20" value={whatsappCode} readOnly />
                                <Input value={editFormData.whatsapp_number} onChange={e => setEditFormData({...editFormData, whatsapp_number: e.target.value})} />
                             </div>
                         </div>
                         <div className="space-y-2"><Label>Email</Label><Input value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>GST Number</Label><Input value={editFormData.gst_number} onChange={e => setEditFormData({...editFormData, gst_number: e.target.value})} /></div>

                    <div className="space-y-4 border-t pt-4 bg-slate-50 p-4 rounded-md">
                        <h5 className="font-medium text-sm">Billing Address</h5>
                        <div className="space-y-2"><Label>Address Line</Label><Input value={editFormData.address_line1} onChange={e => setEditFormData({...editFormData, address_line1: e.target.value})} /></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Pincode First */}
                            <div className="space-y-2 relative">
                                <Label>Pincode</Label>
                                <Input value={editFormData.pincode} onChange={e => setEditFormData({...editFormData, pincode: e.target.value})} onBlur={handlePincodeBlur} maxLength={6} />
                                {pincodeLoading && <Loader2 className="absolute right-2 top-8 h-4 w-4 animate-spin"/>}
                            </div>
                            
                             {/* City Second */}
                             <div className="space-y-2">
                                <Label>City</Label>
                                {cities.length > 0 ? (
                                    <Select value={editFormData.city} onValueChange={v => setEditFormData(p => ({...p, city: v}))}>
                                        <SelectTrigger><SelectValue placeholder={editFormData.city || "Select"} /></SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">{cities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                ) : <Input value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})} />}
                            </div>

                             {/* State Third */}
                            <div className="space-y-2">
                                <Label>State</Label>
                                <Select value={locCodes.state} onValueChange={(v) => {
                                    const s = states.find(x => x.value === v);
                                    setLocCodes(p => ({...p, state: v}));
                                    setEditFormData(p => ({...p, state: s?.label, city: ''}));
                                }}>
                                    <SelectTrigger><SelectValue placeholder={editFormData.state || "Select"} /></SelectTrigger>
                                    <SelectContent className="bg-white">{states.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            
                            {/* Country Last */}
                             <div className="space-y-2">
                                <Label>Country</Label>
                                <Select value={locCodes.country} onValueChange={(v) => {
                                    const c = countries.find(x => x.value === v);
                                    setLocCodes({country: v, state: ''});
                                    setEditFormData(p => ({...p, country: c?.label, state: '', city: ''}));
                                    if (c?.phoneCode) setWhatsappCode(`+${c.phoneCode}`);
                                }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">{countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter><Button type="submit" disabled={isUpdatingProfile}>Save Changes</Button></DialogFooter>
                </form>
            </DialogContent>
         </Dialog>

         {/* Add Address Dialog */}
        <Dialog open={isAddAddrOpen} onOpenChange={setIsAddAddrOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Delivery Address</DialogTitle></DialogHeader>
                <form onSubmit={handleAddAddress} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Address Nickname (e.g. Warehouse 2)</Label>
                        <Input value={newAddress.address_nickname} onChange={e => setNewAddress({...newAddress, address_nickname: e.target.value})} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                        <Label>Address Line *</Label>
                        <Input value={newAddress.address_line} onChange={e => setNewAddress({...newAddress, address_line: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Pincode *</Label>
                            <Input value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label>City *</Label>
                            <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} required />
                        </div>
                         <div className="space-y-2">
                            <Label>State *</Label>
                            <Input value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} required />
                        </div>
                         <div className="space-y-2">
                            <Label>Country</Label>
                            <Input value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Address</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
export default MyAccountPage;