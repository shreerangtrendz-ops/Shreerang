import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";

const CartDrawer = () => {
  const navigate = useNavigate();
  const cartContext = useCart();

  // Defensive programming: Handle potential undefined context
  if (!cartContext) {
    console.error("CartDrawer must be used within a CartProvider");
    return null;
  }

  // Destructure with aliases to match component logic, provide defaults
  const { 
    isCartOpen = false, 
    setIsCartOpen = () => {}, 
    cart = [], 
    removeFromCart = () => {}, 
    updateQuantity = () => {}, 
    total = 0 
  } = cartContext;

  // Safe accessors
  const safeCartItems = Array.isArray(cart) ? cart : [];
  const safeTotal = typeof total === 'number' && !isNaN(total) ? total : 0;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleUpdateQuantity = (id, newQty) => {
    try {
      updateQuantity(id, newQty);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  const handleRemoveItem = (id) => {
    try {
      removeFromCart(id);
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  // Error Boundary Fallback for the drawer content
  try {
    return (
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Shopping Cart
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 py-4">
            {safeCartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mb-2 opacity-20" />
                <p>Your cart is empty</p>
                <Button variant="link" onClick={() => setIsCartOpen(false)}>Continue Shopping</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {safeCartItems.map((item) => {
                  if (!item) return null;
                  const itemPrice = item.final_price || item.retail_price || item.price || 0;
                  const itemImage = item.images?.[0] || item.image || "https://images.unsplash.com/photo-1633566096020-6d1107368d79?w=200&h=200&fit=crop";
                  
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="h-20 w-20 rounded-md bg-slate-100 overflow-hidden flex-shrink-0 border">
                        <img 
                          src={itemImage} 
                          alt={item.name || 'Product'} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1633566096020-6d1107368d79?w=200&h=200&fit=crop";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2">{item.name || 'Unknown Product'}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            ₹{itemPrice.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border rounded-md h-8">
                            <button 
                                className="px-2 h-full hover:bg-slate-100 disabled:opacity-50"
                                onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) - 1)}
                                disabled={item.quantity <= 1}
                            ><Minus className="h-3 w-3" /></button>
                            <span className="px-2 text-sm min-w-[1.5rem] text-center">{item.quantity || 1}</span>
                            <button 
                                className="px-2 h-full hover:bg-slate-100"
                                onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                            ><Plus className="h-3 w-3" /></button>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {safeCartItems.length > 0 && (
            <div className="space-y-4 pt-4">
              <Separator />
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{safeTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-lg">
                  <span>Total</span>
                  <span>₹{safeTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Shipping & taxes calculated at checkout
                </p>
              </div>
              <SheetFooter className="flex-col sm:flex-col gap-2">
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setIsCartOpen(false)}>
                  Continue Shopping
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  } catch (err) {
    console.error("Error rendering CartDrawer:", err);
    return null; // Fail silently UI-wise but log error
  }
};

export default CartDrawer;