import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: 'destructive', description: 'Please enter both email and password.' });
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } else {
      navigate('/');
    }
  };

  const inputStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border-teal)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)', outline: 'none'
  };

  return (
    <>
      <Helmet><title>Login — Shreerang Trendz</title></Helmet>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24,
        position: 'relative'
      }}>
        {/* Background glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 50% 20%, rgba(43,168,152,0.08) 0%, transparent 60%)'
        }} />

        <div style={{
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
          background: 'var(--surface)', border: '1px solid var(--border-teal)',
          borderRadius: 'var(--r)', padding: 36,
          boxShadow: '0 8px 40px rgba(43,168,152,0.10)'
        }}>
          {/* Brand header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, background: 'var(--teal-bright)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 800, color: '#071E1C',
              boxShadow: '0 4px 16px rgba(61,191,174,0.3)', margin: '0 auto 14px'
            }}>SR</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Welcome Back
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sign in to your Shreerang Trendz account</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = ''; }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 11, color: 'var(--teal)', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = ''; }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '10px', background: loading ? 'var(--teal-light)' : 'var(--teal)',
                color: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20,
                transition: 'all 0.13s'
              }}
            >
              {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Create Account</Link>
          </div>

          {/* Bottom brand strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-bright)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-light)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E91E8C' }} />
            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>WHERE TRADITION WEAVES ITS MAGIC</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;