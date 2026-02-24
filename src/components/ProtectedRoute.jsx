import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProtectedRoute = ({ children, allowedRoles = ['admin'] }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const location = useLocation();

  const loading = authLoading || profileLoading;

  if (loading) {
    return <LoadingSpinner fullHeight text="Verifying access permissions..." />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access
  const userRole = profile?.role || 'customer';
  
  // Explicit Admin Check: If route requires admin, user role MUST be 'admin'
  const isAdminRoute = allowedRoles.includes('admin');
  const isUserAdmin = userRole === 'admin';
  
  const hasAccess = isAdminRoute ? isUserAdmin : allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-lg border border-red-100">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-100 rounded-full">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                You do not have permission to view this page. This area is restricted to administrators only.
              </p>
            </div>
            <div className="w-full pt-4">
              <Button 
                variant="default" 
                className="w-full gap-2 bg-slate-900 hover:bg-slate-800"
                onClick={() => window.location.href = '/'}
              >
                <Home className="h-4 w-4" /> Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;