import { 
  LayoutDashboard, ShoppingBag, Users, FileText, Settings, 
  BarChart, Truck, Database, Palette, Shirt, ScrollText, 
  Package, Activity, Lock, Users2, Layers, Briefcase, Command
} from 'lucide-react';

export const ROLES = {
  ADMIN: 'admin',
  OFFICE_TEAM: 'office_team',
  SALES_TEAM: 'sales_team',
  STORE_MANAGER: 'store_manager',
  AGENT: 'agent',
  WHOLESALE_CUSTOMER: 'wholesale_customer'
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_CUSTOMERS: 'manage_customers',
  MANAGE_STAFF: 'manage_staff',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  PLACE_ORDERS: 'place_orders',
  VIEW_OWN_ORDERS: 'view_own_orders',
  MANAGE_AGENTS: 'manage_agents',
  MANAGE_TRANSPORTS: 'manage_transports',
  MANAGE_STOCK: 'manage_stock',
  MANAGE_DESIGNS: 'manage_designs',
  MANAGE_FABRICS: 'manage_fabrics',
  MANAGE_ROLES: 'manage_roles',
  VIEW_LOGS: 'view_logs'
};

export const MODULES = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  TEAM: 'team',
  SETTINGS: 'settings',
  INVENTORY: 'inventory',
  AGENTS: 'agents',
  TRANSPORTS: 'transports',
  DESIGNS: 'designs',
  FABRICS: 'fabrics',
  ROLES: 'roles',
  LOGS: 'logs',
  SALES_ORDERS: 'sales_orders',
  MEDIA: 'media',
  BULK_IMPORT: 'bulk_import',
  ANALYTICS: 'analytics'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.OFFICE_TEAM]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_AGENTS,
    PERMISSIONS.MANAGE_TRANSPORTS,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.MANAGE_FABRICS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  [ROLES.SALES_TEAM]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  [ROLES.STORE_MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_DESIGNS,
    PERMISSIONS.MANAGE_FABRICS
  ],
  [ROLES.AGENT]: [
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.VIEW_OWN_ORDERS
  ],
  [ROLES.WHOLESALE_CUSTOMER]: [
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.VIEW_OWN_ORDERS
  ]
};

// Updated Hierarchical Menu Structure
export const NAV_STRUCTURE = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    single: true
  },
  {
    title: 'Operations',
    icon: Briefcase,
    children: [
      { label: 'Sales Orders', path: '/admin/sales-orders', permission: PERMISSIONS.MANAGE_ORDERS, icon: FileText },
      { label: 'Customers', path: '/admin/customers', permission: PERMISSIONS.MANAGE_CUSTOMERS, icon: Users },
      { label: 'Inventory', path: '/admin/inventory', permission: PERMISSIONS.MANAGE_STOCK, icon: Package },
    ]
  },
  {
    title: 'Design & Products',
    icon: Palette,
    children: [
      { label: 'Fabric Master', path: '/admin/fabric-master', permission: PERMISSIONS.MANAGE_FABRICS, icon: Layers },
      { label: 'Design Management', path: '/admin/design-management', permission: PERMISSIONS.MANAGE_DESIGNS, icon: Palette },
      { label: 'Products Master', path: '/admin/products', permission: PERMISSIONS.MANAGE_PRODUCTS, icon: Shirt },
    ]
  },
  {
    title: 'Analytics & Intelligence',
    icon: BarChart,
    children: [
      { label: 'Analytics', path: '/admin/analytics', permission: PERMISSIONS.VIEW_ANALYTICS, icon: BarChart },
      { label: 'Activity Logs', path: '/admin/logs', permission: PERMISSIONS.VIEW_LOGS, icon: Activity },
    ]
  },
  {
    title: 'System & Roles',
    icon: Settings,
    children: [
      { label: 'Team Roles', path: '/admin/team', permission: PERMISSIONS.MANAGE_STAFF, icon: Users2 },
      { label: 'Permissions', path: '/admin/roles', permission: PERMISSIONS.MANAGE_ROLES, icon: Lock },
      { label: 'Bulk Upload', path: '/admin/bulk-upload', permission: PERMISSIONS.MANAGE_SETTINGS, icon: Database },
    ]
  },
  {
    title: 'Command Center',
    icon: Command,
    children: [
      { label: 'Agents', path: '/admin/agents', permission: PERMISSIONS.MANAGE_AGENTS, icon: Users2 },
      { label: 'Transports', path: '/admin/transports', permission: PERMISSIONS.MANAGE_TRANSPORTS, icon: Truck },
    ]
  }
];

export const hasPermission = (userRole, permission) => {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

export const getRoleLabel = (role) => {
  const labels = {
    [ROLES.ADMIN]: 'CEO / Administrator',
    [ROLES.OFFICE_TEAM]: 'Office Team',
    [ROLES.SALES_TEAM]: 'Sales Team',
    [ROLES.STORE_MANAGER]: 'Store Manager',
    [ROLES.AGENT]: 'Sales Agent',
    [ROLES.WHOLESALE_CUSTOMER]: 'Wholesale Customer'
  };
  return labels[role] || role;
};