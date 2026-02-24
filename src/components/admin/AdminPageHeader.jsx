import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AdminPageHeader = ({ title, description, breadcrumbs = [], actions, onBack, className }) => {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b mb-6", className)}>
      <div className="space-y-1">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center text-sm text-slate-500 mb-2">
            {onBack && (
               <Button variant="ghost" size="icon" className="h-6 w-6 mr-2 -ml-2" onClick={onBack}>
                 <ArrowLeft className="h-4 w-4" />
               </Button>
            )}
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-slate-900 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-slate-500">{description}</p>}
      </div>
      
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default AdminPageHeader;