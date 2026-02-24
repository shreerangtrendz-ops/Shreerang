import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CustomerCartService } from '@/services/CustomerCartService';
import { useToast } from '@/components/ui/use-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Initial load
  useEffect(() => {
    try {
      const savedCart = CustomerCartService.getCart();
      if (Array.isArray(savedCart)) {
        setCart(savedCart);
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error("Failed to load cart from service:", err);
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToCart = (product, quantity = 1) => {
    try {
      if (!product || !product.id) {
        throw new Error("Invalid product data");
      }
      const updatedCart = CustomerCartService.addToCart(product, quantity);
      setCart(updatedCart);
      toast({
        title: "Added to cart",
        description: `${product.name || 'Product'} has been added to your cart.`
      });
      setIsCartOpen(true);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add item to cart. Please try again."
      });
    }
  };

  const removeFromCart = (productId) => {
    try {
      const updatedCart = CustomerCartService.removeFromCart(productId);
      setCart(updatedCart);
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  const updateQuantity = (productId, quantity) => {
    try {
      const updatedCart = CustomerCartService.updateQuantity(productId, quantity);
      setCart(updatedCart);
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const clearCart = () => {
    try {
      const updatedCart = CustomerCartService.clearCart();
      setCart(updatedCart);
    } catch (error) {
      console.error("Error clearing cart:", error);
      setCart([]);
    }
  };

  // Derived state
  const cartCount = useMemo(() => {
    return Array.isArray(cart) ? cart.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0;
  }, [cart]);

  const totals = useMemo(() => {
    try {
      return CustomerCartService.getTotals(Array.isArray(cart) ? cart : []);
    } catch (e) {
      return { subtotal: 0, total: 0 };
    }
  }, [cart]);

  const value = {
    cart: Array.isArray(cart) ? cart : [],
    cartCount,
    subtotal: totals.subtotal || 0,
    total: totals.total || 0,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isLoading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};