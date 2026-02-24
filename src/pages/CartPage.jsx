import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

const CartPageContent = () => {
  const { cart, removeFromCart, updateQuantity, subtotal, total, clearCart } = useCart();
  const safeCart = ensureArray(cart, 'CartPage');

  if (safeCart.length === 0) {
    return (
      <div className="container py-20 text-center space-y-6">
        <Helmet><title>Cart | Shreerang Trendz</title></Helmet>
        <div className="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-slate-500">Looks like you haven't added any products yet.</p>
        <Link to="/shop">
          <Button size="lg">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10 px-4 md:px-6">
      <Helmet><title>Cart | Shreerang Trendz</title></Helmet>
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
           {safeCart.map(item => (
             <div key={item.id} className="flex gap-4 p-4 bg-white border rounded-lg shadow-sm">
                <div className="h-24 w-24 bg-slate-100 rounded-md overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Img</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                      </div>
                      <p className="font-bold">₹{Number(item.price * item.quantity).toLocaleString()}</p>
                   </div>
                   <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 10))}>-</Button>
                        <Input 
                          value={item.quantity} 
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="w-16 h-8 text-center" 
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 10)}>+</Button>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                   </div>
                </div>
             </div>
           ))}
           <div className="flex justify-end">
              <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
           </div>
        </div>

        <div className="lg:col-span-1">
           <div className="bg-slate-50 p-6 rounded-lg border sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                 <div className="flex justify-between">
                   <span className="text-slate-600">Subtotal</span>
                   <span className="font-medium">₹{Number(subtotal).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-600">Shipping</span>
                   <span className="text-slate-500 italic">Calculated at checkout</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-600">Tax</span>
                   <span className="text-slate-500 italic">Calculated at checkout</span>
                 </div>
              </div>
              <div className="border-t pt-4 mb-6">
                 <div className="flex justify-between text-lg font-bold">
                   <span>Total</span>
                   <span>₹{Number(total).toLocaleString()}</span>
                 </div>
                 <p className="text-xs text-slate-500 mt-1">Excluding shipping & taxes</p>
              </div>
              <Link to="/checkout" className="w-full block">
                <Button size="lg" className="w-full">Proceed to Checkout</Button>
              </Link>
              <Link to="/shop" className="w-full block mt-3 text-center text-sm text-primary hover:underline">
                Continue Shopping
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

const CartPage = () => (
  <DataErrorBoundary>
    <CartPageContent />
  </DataErrorBoundary>
);

export default CartPage;