import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, Tag, Users, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

// ============================================================
// Admin — Ecommerce Control Center
// Route: /admin/ecom
// Functions: Toggle ecom_visible, set prices, manage portal access
// ============================================================

export default function EcomControlPage() {
  const { toast } = useToast();
  const [designs, setDesigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [designSearch, setDesignSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [saving, setSaving] = useState({});

  useEffect(() => { loadDesigns(); loadCustomers(); }, []);

  const loadDesigns = async () => {
    setLoadingDesigns(true);
    const { data } = await supabase
      .from('designs')
      .select('id, design_no, construction, ecom_visible, retail_price, wholesale_price, short_description, tags')
      .order('design_no', { ascending: false })
      .limit(100);
    setDesigns(data || []);
    setLoadingDesigns(false);
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const { data } = await supabase
      .from('customers')
      .select('id, customer_name, mobile, login_email, ecom_enabled, price_tier')
      .order('customer_name')
      .limit(200);
    setCustomers(data || []);
    setLoadingCustomers(false);
  };

  const toggleDesignVisible = async (design) => {
    setSaving(s => ({ ...s, [design.id]: true }));
    const { error } = await supabase
      .from('designs')
      .update({ ecom_visible: !design.ecom_visible })
      .eq('id', design.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setDesigns(prev => prev.map(d => d.id === design.id ? { ...d, ecom_visible: !d.ecom_visible } : d));
      toast({ title: design.ecom_visible ? 'Hidden from catalogue' : 'Visible in catalogue', description: design.design_no });
    }
    setSaving(s => ({ ...s, [design.id]: false }));
  };

  const updateDesignPrices = async (design, retailPrice, wholesalePrice) => {
    const { error } = await supabase
      .from('designs')
      .update({ retail_price: Number(retailPrice) || 0, wholesale_price: Number(wholesalePrice) || 0 })
      .eq('id', design.id);
    if (!error) toast({ title: 'Prices updated', description: design.design_no });
  };

  const toggleCustomerPortal = async (customer) => {
    setSaving(s => ({ ...s, [`c_${customer.id}`]: true }));
    const { error } = await supabase
      .from('customers')
      .update({ ecom_enabled: !customer.ecom_enabled })
      .eq('id', customer.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, ecom_enabled: !c.ecom_enabled } : c));
      toast({ title: customer.ecom_enabled ? 'Portal access revoked' : 'Portal access granted', description: customer.customer_name });
    }
    setSaving(s => ({ ...s, [`c_${customer.id}`]: false }));
  };

  const updateCustomerTier = async (customerId, tier) => {
    await supabase.from('customers').update({ price_tier: tier }).eq('id', customerId);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, price_tier: tier } : c));
    toast({ title: 'Price tier updated' });
  };

  const filteredDesigns = designs.filter(d =>
    !designSearch || d.design_no?.toLowerCase().includes(designSearch.toLowerCase()) || d.construction?.toLowerCase().includes(designSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.mobile?.includes(customerSearch)
  );

  const visibleCount = designs.filter(d => d.ecom_visible).length;
  const portalCount = customers.filter(c => c.ecom_enabled).length;

  return (
    <>
      <Helmet><title>Ecom Control — Admin</title></Helmet>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">🛒 Ecommerce Control</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage catalogue visibility, pricing, and customer portal access</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Visible Designs', value: visibleCount, icon: Eye, color: 'text-teal-600' },
            { label: 'Total Designs', value: designs.length, icon: Tag, color: 'text-blue-600' },
            { label: 'Portal Users', value: portalCount, icon: Users, color: 'text-green-600' },
            { label: 'Total Customers', value: customers.length, icon: CheckCircle2, color: 'text-gray-600' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-6 w-6 ${stat.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="designs">
          <TabsList>
            <TabsTrigger value="designs">Catalogue ({visibleCount}/{designs.length} visible)</TabsTrigger>
            <TabsTrigger value="customers">Customer Portal ({portalCount} active)</TabsTrigger>
          </TabsList>

          {/* DESIGNS TAB */}
          <TabsContent value="designs" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search design no or construction..." className="pl-9" value={designSearch} onChange={e => setDesignSearch(e.target.value)} />
            </div>
            {loadingDesigns ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="divide-y border rounded-lg bg-card">
                {filteredDesigns.map(design => (
                  <div key={design.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={!!design.ecom_visible}
                        onCheckedChange={() => toggleDesignVisible(design)}
                        disabled={!!saving[design.id]}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{design.design_no}</p>
                        <p className="text-xs text-muted-foreground truncate">{design.construction || 'No construction set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Retail ₹</span>
                        <Input
                          type="number"
                          defaultValue={design.retail_price || 0}
                          className="w-24 h-7 text-xs"
                          onBlur={e => updateDesignPrices(design, e.target.value, design.wholesale_price)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Wholesale ₹</span>
                        <Input
                          type="number"
                          defaultValue={design.wholesale_price || 0}
                          className="w-24 h-7 text-xs"
                          onBlur={e => updateDesignPrices(design, design.retail_price, e.target.value)}
                        />
                      </div>
                      <Badge variant={design.ecom_visible ? 'default' : 'secondary'} className="text-xs">
                        {design.ecom_visible ? '✅ Live' : '⬛ Hidden'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customer name or mobile..." className="pl-9" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
            </div>
            {loadingCustomers ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="divide-y border rounded-lg bg-card">
                {filteredCustomers.map(customer => (
                  <div key={customer.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={!!customer.ecom_enabled}
                        onCheckedChange={() => toggleCustomerPortal(customer)}
                        disabled={!!saving[`c_${customer.id}`]}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{customer.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.login_email || customer.mobile || 'No contact'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={customer.price_tier || 'wholesale'} onValueChange={v => updateCustomerTier(customer.id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant={customer.ecom_enabled ? 'default' : 'outline'} className="text-xs">
                        {customer.ecom_enabled ? '✅ Active' : '⬛ Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
