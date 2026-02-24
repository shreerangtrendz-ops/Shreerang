const CART_KEY = 'shreerang_cart';

export const CustomerCartService = {
  getCart() {
    try {
      const cart = localStorage.getItem(CART_KEY);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  addToCart(product, quantity = 1) {
    const cart = this.getCart();
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.retail_price,
        image: product.images?.[0] || null,
        design_number: product.specifications?.design_number,
        quantity: quantity
      });
    }

    this.saveCart(cart);
    return cart;
  },

  removeFromCart(productId) {
    const cart = this.getCart();
    const newCart = cart.filter(item => item.id !== productId);
    this.saveCart(newCart);
    return newCart;
  },

  updateQuantity(productId, quantity) {
    if (quantity <= 0) return this.removeFromCart(productId);
    
    const cart = this.getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart(cart);
    }
    return cart;
  },

  clearCart() {
    localStorage.removeItem(CART_KEY);
    return [];
  },

  getTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      subtotal,
      total: subtotal // Add tax/shipping logic here if needed
    };
  }
};