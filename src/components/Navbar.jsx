import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Search, ShoppingBag, Heart, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCart } from '@/contexts/CartContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/lib/theme';
import NotificationCenter from '@/components/admin/NotificationCenter';
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    signOut
  } = useAuth();
  const {
    profile
  } = useUserProfile();
  const {
    cartCount,
    setIsCartOpen
  } = useCart();
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme
  } = useTheme();
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const navLinks = [{
    name: 'Shop',
    path: '/shop'
  }, {
    name: 'Wholesale',
    path: '/wholesale'
  }, {
    name: 'About',
    path: '/about'
  }, {
    name: 'Contact',
    path: '/contact'
  }];
  return <nav className="bg-background/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-border">
      <div className="container">
        <div className="flex justify-between items-center h-20 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <img src="https://horizons-cdn.hostinger.com/3e6f7609-d358-45de-baf5-ac38cd562a97/fa8a0574656b2e3126d8a09ae725c5e4.png" alt="Shree Rang Trendz" className="h-10 w-auto md:h-12" />
            <span className="text-xl font-bold text-primary tracking-tight hidden md:block" style={{
            fontFamily: 'Playfair Display, serif'
          }}>Shree Rang Trendz Pvt Ltd</span>
          </Link>

          {/* Center Search - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products, fabrics, SKU..." className="pl-10 bg-secondary/50 border-transparent focus:bg-background transition-all" />
            </div>
          </div>

          {/* Desktop Nav & Actions */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center space-x-6">
              {navLinks.map(link => <Link key={link.path} to={link.path} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  {link.name}
                </Link>)}
            </div>

            <div className="flex items-center space-x-2 pl-6 border-l border-border">
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Theme</TooltipContent>
                </Tooltip>
              
                {user && <NotificationCenter />}
              
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                      <Heart className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Wishlist</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/10" onClick={() => setIsCartOpen(true)}>
                      <ShoppingBag className="h-5 w-5" />
                      {cartCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[10px] text-white flex items-center justify-center rounded-full font-bold">
                          {cartCount}
                        </span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cart</TooltipContent>
                </Tooltip>

                {user ? <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link to={profile?.role === 'admin' ? '/admin' : '/my-account'}>
                          <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10">
                            <User className="h-5 w-5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{profile?.role === 'admin' ? 'Admin Panel' : 'My Account'}</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                          <LogOut className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sign Out</TooltipContent>
                    </Tooltip>
                  </> : <Link to="/login">
                    <Button variant="ghost" size="sm">Login</Button>
                  </Link>}
              </TooltipProvider>
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>}
            </Button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-foreground">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && <div className="lg:hidden py-4 border-t border-border animate-in slide-in-from-top-2 bg-background">
            <div className="mb-4 relative px-4">
               <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input placeholder="Search..." className="pl-10" />
            </div>
            <div className="space-y-2">
              {navLinks.map(link => <Link key={link.path} to={link.path} className="block py-2 px-4 text-sm font-medium hover:bg-secondary rounded-md" onClick={() => setIsOpen(false)}>
                  {link.name}
                </Link>)}
              <div className="px-4 py-2">
                <Button variant="outline" size="sm" onClick={toggleTheme} className="w-full justify-start gap-2">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>
              {user ? <>
                  <Link to={profile?.role === 'admin' ? '/admin' : '/my-account'} className="block py-2 px-4 text-sm font-medium hover:bg-secondary rounded-md" onClick={() => setIsOpen(false)}>
                    {profile?.role === 'admin' ? 'Admin Dashboard' : 'My Account'}
                  </Link>
                  <button onClick={handleSignOut} className="w-full text-left py-2 px-4 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </> : <Link to="/login" className="block py-2 px-4 text-sm font-medium hover:bg-secondary rounded-md" onClick={() => setIsOpen(false)}>
                  Login / Register
                </Link>}
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;