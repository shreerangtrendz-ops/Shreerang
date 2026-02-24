import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { CustomerOrderService } from '@/services/CustomerOrderService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { logError } from '@/lib/debugHelpers';

const CheckoutPageContent = () => {
  const { cart, total, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firmName: '',
    customerName: '',
    email: '',
    phone: '',
    billingAddress: '',
    deliveryAddress: '',
    paymentMethod: 'bank_transfer',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await CustomerOrderService.createOrder(
        { ...formData, totalAmount: total }, 
        ensureArray(cart), 
        user?.id
      );
      
      toast({ title: "Order Placed Successfully", description: "Thank you for your order! We will contact you shortly." });
      clearCart();
      navigate('/order-tracking');
    } catch (e) {
      logError(e, 'CheckoutPage submit');
      toast({ variant: "destructive", title: "Order Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const safeCart = ensureArray(cart, 'CheckoutPage Cart');

  if (safeCart.length === 0) return <div className="container py-20 text-center">Your cart is empty.</div>;

  return (
    <div className="container py-10 px-4 md:px-6">
      <Helmet><title>Checkout | Shreerang Trendz</title></Helmet>
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           {/* Customer Info */}
           <div className="bg-white p-6 border rounded-lg shadow-sm space-y-4">
              <h2 className="text-xl font-semibold">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Full Name *</Label>
                   <Input required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Firm Name *</Label>
                   <Input required value={formData.firmName} onChange={e => setFormData({...formData, firmName: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Email *</Label>
                   <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Phone *</Label>
                   <Input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                 </div>
              </div>
           </div>

           {/* Address */}
           <div className="bg-white p-6 border rounded-lg shadow-sm space-y-4">
              <h2 className="text-xl font-semibold">Address</h2>
              <div className="space-y-2">
                 <Label>Billing Address *</Label>
                 <Textarea required value={formData.billingAddress} onChange={e => setFormData({...formData, billingAddress: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <Label>Delivery Address (if different)</Label>
                 <Textarea value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} />
              </div>
           </div>

           {/* Payment */}
           <div className="bg-white p-6 border rounded-lg shadow-sm space-y-4">
              <h2 className="text-xl font-semibold">Payment Method</h2>
              <RadioGroup value={formData.paymentMethod} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
                 <div className="flex items-center space-x-2 border p-4 rounded-md">
                   <RadioGroupItem value="bank_transfer" id="r1" />
                   <Label htmlFor="r1" className="cursor-pointer">Bank Transfer (NEFT/RTGS)</Label>
                 </div>
                 <div className="flex items-center space-x-2 border p-4 rounded-md">
                   <RadioGroupItem value="cheque" id="r2" />
                   <Label htmlFor="r2" className="cursor-pointer">Cheque / Draft</Label>
                 </div>
                 <div className="flex items-center space-x-2 border p-4 rounded-md">
                   <RadioGroupItem value="cod" id="r3" />
                   <Label htmlFor="r3" className="cursor-pointer">Cash on Delivery (Advance required)</Label>
                 </div>
              </RadioGroup>
           </div>
        </div>

        {/* Summary Side */}
        <div className="lg:col-span-1">
           <div className="bg-slate-50 p-6 rounded-lg border sticky top-24 space-y-6">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <div className="space-y-3">
                 {safeCart.map(item => (
                   <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.name} x {item.quantity}</span>
                      <span className="font-medium">₹{Number(item.price * item.quantity).toLocaleString()}</span>
                   </div>
                 ))}
              </div>
              <div className="border-t pt-4">
                 <div className="flex justify-between text-lg font-bold">
                   <span>Total</span>
                   <span>₹{Number(total).toLocaleString()}</span>
                 </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Place Order
              </Button>
           </div>
        </div>
      </form>
    </div>
  );
};

const CheckoutPage = () => (
  <DataErrorBoundary>
    <CheckoutPageContent />
  </DataErrorBoundary>
);

export default CheckoutPage;