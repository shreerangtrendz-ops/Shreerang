import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const CustomerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } else {
      navigate('/customer/dashboard'); // Redirect to customer portal
    }
  };

  return (
    <>
      <Helmet><title>Customer Login - Shreerang Trendz</title></Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6 border">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>Shreerang Trendz</h1>
            <p className="text-muted-foreground mt-2">Customer Portal Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

           <div className="text-center text-sm">
            Don't have an account? <Link to="/register" className="text-primary hover:underline font-medium">Register Here</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerLoginPage;