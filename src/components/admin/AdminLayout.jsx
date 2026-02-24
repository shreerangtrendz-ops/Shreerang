import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  LogOut, 
  User, 
  Bell, 
  ChevronRight, 
  Home 
} from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import AdminSidebar from './AdminSidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WhatsAppWidget from '@/components/common/WhatsAppWidget';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Signed out", description: "Successfully signed out." });
      navigate('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  // Generate breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return { label, path };
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="lg:grid lg:grid-cols-[288px_1fr] min-h-screen transition-all duration-300">
        
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-col min-h-screen w-full">
          
          {/* Header */}
          <header className="sticky top-0 z-30 h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="lg:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
                aria-label="Toggle Menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              {/* Desktop Breadcrumbs */}
              <nav className="hidden md:flex items-center text-sm text-slate-500">
                <Link to="/admin/costing-calculator" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <Home className="h-4 w-4" />
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight className="h-4 w-4 mx-1 text-slate-400" />
                    <Link 
                      to={crumb.path}
                      className={`hover:text-blue-600 transition-colors ${
                        index === breadcrumbs.length - 1 ? "font-semibold text-slate-900" : ""
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-blue-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-4 py-1 h-auto hover:bg-slate-100 rounded-full border border-transparent hover:border-slate-200 transition-all">
                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start text-xs">
                      <span className="font-semibold text-slate-900">
                        {user?.user_metadata?.full_name || 'Admin User'}
                      </span>
                      <span className="text-slate-500">Administrator</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/my-account')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50/50">
            {/* Mobile Breadcrumbs */}
            <nav className="md:hidden flex items-center text-xs text-slate-500 mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
                <Link to="/admin/costing-calculator" className="hover:text-blue-600 flex items-center gap-1 flex-shrink-0">
                  <Home className="h-3 w-3" />
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight className="h-3 w-3 mx-1 flex-shrink-0 text-slate-400" />
                    <Link 
                      to={crumb.path}
                      className={`hover:text-blue-600 transition-colors ${
                        index === breadcrumbs.length - 1 ? "font-semibold text-slate-900" : ""
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
            </nav>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PageErrorBoundary>
                <Outlet />
              </PageErrorBoundary>
            </div>
          </main>
        </div>
      </div>
      
      {/* WhatsApp Widget - Global for Admin */}
      <WhatsAppWidget />
    </div>
  );
};

export default AdminLayout;