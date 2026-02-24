import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const OrderFormPage = () => {
  const { toast } = useToast();
  const [orderUnit, setOrderUnit] = useState('Mtr');
  const [pcs, setPcs] = useState('');
  const [cutLength, setCutLength] = useState(2.5); // Example cut length
  const [mtr, setMtr] = useState('');

  const showToast = (e) => {
    e.preventDefault();
    toast({
      title: "🚧 Feature In Progress",
      description: "This advanced order form is being built. You can request its full implementation in the next prompt! 🚀",
    });
  };

  const handlePcsChange = (e) => {
    const newPcs = e.target.value;
    setPcs(newPcs);
    // Formula: PCS x cut length
    const mtrValue = newPcs ? (parseFloat(newPcs) * cutLength).toFixed(2) : '';
    setMtr(mtrValue);
  }

  return (
    <>
      <Helmet>
        <title>Create Order - Shreerang Trendz</title>
      </Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="container py-10">
          <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
            Create New Order
          </h1>

          <form className="bg-background p-8 rounded-lg shadow-md space-y-8" onSubmit={showToast}>
            
            <fieldset className="space-y-4">
              <legend className="text-xl font-semibold">Customer Information (Placeholder)</legend>
              <div className="h-24 bg-gray-200 rounded-md flex items-center justify-center">
                <p className="text-gray-500">Customer search & details will be implemented here.</p>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-xl font-semibold">Order Items (PCS to MTR Conversion Demo)</legend>
              
              <div className="p-4 border rounded-lg space-y-4">
                <p className="text-sm text-gray-600">This is a demonstration of the PCS to MTR conversion logic. The full product search and order item list can be implemented next.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label>Order Unit</Label>
                        <p className="font-semibold text-lg">{orderUnit}</p>
                    </div>
                    <div>
                        <Label htmlFor="pcs">Order in PCS</Label>
                        <Input id="pcs" type="number" value={pcs} onChange={handlePcsChange} placeholder="e.g., 10"/>
                    </div>
                     <div>
                        <Label htmlFor="cutLength">Cut Length (Mtr)</Label>
                        <Input id="cutLength" type="number" value={cutLength} onChange={e => setCutLength(parseFloat(e.target.value))} placeholder="e.g., 2.5" />
                    </div>
                    <div>
                        <Label htmlFor="mtr">Automatic MTR Conversion</Label>
                        <Input id="mtr" type="text" value={mtr} readOnly placeholder="Calculated Mtr"/>
                    </div>
                </div>
              </div>

              <div className="h-32 bg-gray-200 rounded-md flex items-center justify-center">
                <p className="text-gray-500">Full product selection and order list will be here.</p>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-xl font-semibold">Order Summary (Placeholder)</legend>
              <div className="h-32 bg-gray-200 rounded-md flex items-center justify-center">
                <p className="text-gray-500">Pricing and totals will be calculated here.</p>
              </div>
            </fieldset>

            <Button size="lg" className="w-full" type="submit">
              Submit Full Implementation Request
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default OrderFormPage;