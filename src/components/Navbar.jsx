import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Search, ShoppingBag, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCart } from '@/contexts/CartContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import NotificationCenter from '@/components/admin/NotificationCenter';

const navLinks = [
  { name: 'Shop', path: '/shop' },
  { name: 'Wholesale', path: '/wholesale' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <nav style={{
      background: 'var(--sidebar-bg)',
      borderBottom: '1px solid var(--sidebar-border)',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 2px 20px rgba(0,0,0,0.25)',
      fontFamily: 'var(--font)'
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>

          {/* Logo / Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 40, height: 40, background: 'var(--teal-bright)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: '#071E1C',
              boxShadow: '0 2px 12px rgba(61,191,174,0.4)', flexShrink: 0
            }}>SR</div>
            <div className="hidden md:block">
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: '#C8E8E4', lineHeight: 1.1 }}>Shreerang</div>
              <div style={{ background: 'var(--gold-light)', color: '#0B2E2B', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', padding: '1px 7px', borderRadius: 99, display: 'inline-block', textTransform: 'uppercase' }}>Trendz Pvt Ltd</div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 4 }}>
            {navLinks.map(link => (
              <NavLink
                key={link.path}
                to={link.path}
                style={({ isActive }) => ({
                  padding: '6px 14px', borderRadius: 6,
                  fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  color: isActive ? 'var(--teal-bright)' : '#6A9B95',
                  background: isActive ? 'rgba(61,191,174,0.12)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--teal-bright)' : '2px solid transparent',
                  transition: 'all 0.15s'
                })}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(14,56,53,0.8)', border: '1px solid var(--sidebar-border)',
              borderRadius: 6, padding: '6px 12px', width: 200
            }}>
              <Search style={{ width: 14, height: 14, color: '#6A9B95', flexShrink: 0 }} />
              <input
                placeholder="Search fabrics, SKU..."
                style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font)', fontSize: 12, color: '#C8E8E4', width: '100%' }}
              />
            </div>

            {/* Wishlist */}
            <button style={{ ...iconBtn }}>
              <Heart style={{ width: 16, height: 16, color: '#6A9B95' }} />
            </button>

            {/* Cart */}
            <button style={{ ...iconBtn, position: 'relative' }} onClick={() => setIsCartOpen(true)}>
              <ShoppingBag style={{ width: 16, height: 16, color: '#6A9B95' }} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--teal-bright)', color: '#071E1C',
                  fontSize: 9, fontWeight: 800, width: 16, height: 16,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{cartCount}</span>
              )}
            </button>

            {user && <NotificationCenter />}

            {/* User / Login */}
            {user ? (
              <>
                <Link to={profile?.role === 'admin' ? '/admin' : '/my-account'} style={{ ...iconBtn }}>
                  <User style={{ width: 16, height: 16, color: '#6A9B95' }} />
                </Link>
                <button onClick={handleSignOut} style={{ ...iconBtn }}>
                  <LogOut style={{ width: 16, height: 16, color: '#D93A3A' }} />
                </button>
              </>
            ) : (
              <Link to="/login" style={{
                padding: '7px 16px', background: 'var(--teal)', color: '#fff',
                borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                transition: 'all 0.13s'
              }}>Login</Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ ...iconBtn }} onClick={() => setIsCartOpen(true)}>
              <ShoppingBag style={{ width: 18, height: 18, color: '#6A9B95' }} />
            </button>
            <button
              style={{ ...iconBtn }}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X style={{ width: 18, height: 18, color: '#C8E8E4' }} /> : <Menu style={{ width: 18, height: 18, color: '#C8E8E4' }} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div style={{
            borderTop: '1px solid var(--sidebar-border)',
            padding: '12px 0 16px',
            background: 'var(--sidebar-surface)'
          }}>
            {navLinks.map(link => (
              <Link
                key={link.path} to={link.path}
                onClick={() => setIsOpen(false)}
                style={{ display: 'block', padding: '10px 16px', fontSize: 13, color: '#6A9B95', textDecoration: 'none', transition: 'all 0.13s' }}
              >{link.name}</Link>
            ))}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--sidebar-border)', marginTop: 8 }}>
              {user ? (
                <button onClick={handleSignOut} style={{ color: 'var(--red)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} style={{ color: 'var(--teal-bright)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const iconBtn = {
  width: 34, height: 34, borderRadius: 6, border: '1px solid var(--sidebar-border)',
  background: 'rgba(14,56,53,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'all 0.13s'
};

export default Navbar;