import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Database, PlusCircle, DollarSign, 
  Settings, Image as ImageIcon, Settings2, Users, Building2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const location = useLocation();

  const sections = [
    {
      title: 'Fabric Master',
      items: [
        { label: 'Base Fabric Master', href: '/admin/fabric/base-fabric-form', icon: Database },
        { label: 'Finish Fabric Master', href: '/admin/fabric/finish-fabric-form', icon: Database },
        { label: 'Fancy Finish Master', href: '/admin/fabric/fancy-finish-fabric-form', icon: Database },
        { label: 'Fancy Base Master', href: '/admin/fabric/fancy-base-fabric-form', icon: Database },
      ]
    },
    {
      title: 'Images',
      items: [
        { label: 'Upload Images', href: '/admin/images/upload', icon: ImageIcon },
      ]
    },
    {
      title: 'Cost Database',
      items: [
        { label: 'Purchase Entry', href: '/admin/cost/purchase-entry', icon: PlusCircle },
        { label: 'Process Entry', href: '/admin/cost/process-entry', icon: PlusCircle },
        { label: 'Value Addition Entry', href: '/admin/cost/value-addition-entry', icon: PlusCircle },
        { label: 'Cost Sheet', href: '/admin/cost/cost-sheet', icon: DollarSign },
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Rate Card', href: '/admin/settings/rate-card', icon: DollarSign },
        { label: 'Dropdown Manager', href: '/admin/settings/dropdown-manager', icon: Settings2 },
        { label: 'Job Work Units', href: '/admin/settings/job-units', icon: Building2 },
        { label: 'Suppliers', href: '/admin/settings/suppliers', icon: Users },
        { label: 'HSN Code Master', href: '/admin/settings/hsn-codes', icon: Database },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col gap-6 sticky top-0 overflow-y-auto hidden md:flex">
      <div className="text-xl font-bold px-2 py-4 border-b border-slate-700">Admin Portal</div>
      
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-xs uppercase text-slate-400 font-semibold px-2 tracking-wider">{section.title}</h3>
          <nav className="flex flex-col gap-1">
            {section.items.map((item, i) => (
              <NavLink 
                key={i} 
                to={item.href} 
                className={({isActive}) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm",
                  isActive || location.pathname.includes(item.href) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
};
export default AdminSidebar;