import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from '@/components/ui/toaster';
import CartDrawer from '@/components/CartDrawer';
import CustomerLayout from '@/components/CustomerLayout';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorLogger from '@/lib/errorLogger';
import ComingSoonPage from '@/components/admin/ComingSoonPage';

// ── Public Pages ──
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import WholesalePortalPage from '@/pages/WholesalePortalPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// ── Admin Core ──
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

// ── Admin: Dashboard ──
import AdminDashboard from '@/pages/admin/AdminDashboard';

// ── Admin: Fabric Master ──
import BaseFabricForm from '@/pages/admin/fabric/BaseFabricForm';
import FinishFabricForm from '@/pages/admin/fabric/FinishFabricForm';
import FancyFinishFabricForm from '@/pages/admin/fabric/FancyFinishFabricForm';
import FancyBaseFabricForm from '@/pages/admin/fabric/FancyBaseFabricForm';
import BulkImportPage from '@/pages/admin/fabric/BulkImportPage';

// ── Admin: Images ──
import ImageUploadPage from '@/pages/admin/images/ImageUploadPage';

// ── Admin: Cost Engine ──
import PurchaseEntryPage from '@/pages/admin/cost/PurchaseEntryPage';
import ProcessEntryPage from '@/pages/admin/cost/ProcessEntryPage';
import ValueAdditionEntryPage from '@/pages/admin/cost/ValueAdditionEntryPage';
import CostSheetPage from '@/pages/admin/cost/CostSheetPage';
import HakobaBatchCalculator from '@/pages/admin/cost/HakobaBatchCalculator';
import PriceDatabasePage from '@/pages/admin/pricing/PriceDatabasePage';
import ReadymadeGarmentCostSheet from '@/pages/admin/costing/ReadymadeGarmentCostSheet';

// ── Admin: Settings ──
import RateCardPage from '@/pages/admin/settings/RateCardPage';
import DropdownManager from '@/pages/admin/settings/DropdownManager';
import JobUnitsPage from '@/pages/admin/unit-management/JobUnitsPage';
import SuppliersManager from '@/pages/admin/settings/SuppliersManager';
import HSNCodeMaster from '@/pages/admin/settings/HSNCodeMaster';

// ── Admin: Sales & Orders ──
import QuickPriceCheckPage from '@/pages/admin/sales/QuickPriceCheckPage';
import StoreManagerOrders from '@/pages/admin/orders/StoreManagerOrders';

// ── Admin: Integrations ──
import CloudSyncPage from '@/pages/admin/integrations/CloudSyncPage';

// ── Admin: New Functional Pages ──
import CustomerMasterPage from '@/pages/admin/CustomerMasterPage';
import ChallansPage from '@/pages/admin/ChallansPage';
import DesignVelocityPage from '@/pages/admin/DesignVelocityPage';
import PaymentRemindersPage from '@/pages/admin/PaymentRemindersPage';
import MarketIntelPage from '@/pages/admin/MarketIntelPage';
import FieldVisitTrackerPage from '@/pages/admin/FieldVisitTrackerPage';

import WhatsAppWidget from '@/components/common/WhatsAppWidget';

const App = () => {
  useEffect(() => {
    const handleError = (event) => {
      ErrorLogger.logError(event.error, { type: 'uncaught_exception', message: event.message });
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <HelmetProvider>
      <PageErrorBoundary>
        <Router>
          <AuthProvider>
            <CartProvider>
              <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><LoadingSpinner /></div>}>
                <Routes>

                  {/* ═══════════════════ PUBLIC ROUTES ═══════════════════ */}
                  <Route element={<CustomerLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/products/:slug" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/wholesale" element={<WholesalePortalPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>

                  {/* ═══════════════════ ADMIN ROUTES ═══════════════════ */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />

                    {/* Fabric Master */}
                    <Route path="fabric/base-fabric-form" element={<BaseFabricForm />} />
                    <Route path="fabric/finish-fabric-form" element={<FinishFabricForm />} />
                    <Route path="fabric/fancy-finish-fabric-form" element={<FancyFinishFabricForm />} />
                    <Route path="fabric/fancy-base-fabric-form" element={<FancyBaseFabricForm />} />
                    <Route path="fabric-master/bulk-import" element={<BulkImportPage />} />

                    {/* Design Catalogue */}
                    <Route path="images/upload" element={<ImageUploadPage />} />
                    <Route path="design-velocity" element={<DesignVelocityPage />} />
                    <Route path="products" element={<ComingSoonPage title="Product Master" icon="🗂" desc="Master catalogue of all finished products across Mill Print, Digital Print, Schiffli, and Readymade Garment verticals." breadcrumb="Design Catalogue → Product Master" />} />

                    {/* Cost Engine */}
                    <Route path="cost/purchase-entry" element={<PurchaseEntryPage />} />
                    <Route path="cost/process-entry" element={<ProcessEntryPage />} />
                    <Route path="cost/value-addition-entry" element={<ValueAdditionEntryPage />} />
                    <Route path="cost/cost-sheet" element={<CostSheetPage />} />
                    <Route path="cost/hakoba-calc" element={<HakobaBatchCalculator />} />
                    <Route path="price-database" element={<PriceDatabasePage />} />
                    <Route path="garment-cost" element={<ReadymadeGarmentCostSheet />} />

                    {/* Store */}
                    <Route path="store-sync" element={<ComingSoonPage title="Store Sync" icon="🛒" desc="Sync approved designs directly to the Shreerangtrendz.com storefront. Control visibility, pricing, and stock levels." breadcrumb="Store → Store Sync" />} />

                    {/* Operations */}
                    <Route path="order-database/sales" element={<StoreManagerOrders />} />
                    <Route path="orders/store-dispatch" element={<StoreManagerOrders />} />
                    <Route path="challans" element={<ChallansPage />} />
                    <Route path="customers" element={<CustomerMasterPage />} />
                    <Route path="market-intel" element={<MarketIntelPage />} />
                    <Route path="mto-orders" element={<ComingSoonPage title="Make-to-Order Pipeline" icon="🎯" desc="Track MTO enquiries from Enquiry → Quoted → Confirmed → In Production → Dispatched → Delivered, linked to Cost Sheet and Challans." breadcrumb="Operations → Make-to-Order" />} />

                    {/* Smart Features */}
                    <Route path="calendar" element={<ComingSoonPage title="Calendar & Visits" icon="📅" desc="Schedule field visits, customer appointments, follow-ups, and team check-ins in a unified calendar." breadcrumb="Smart Features → Calendar" />} />
                    <Route path="supplier-price-ai" element={<ComingSoonPage title="WA Price Alerts" icon="🔔" desc="AI-detected price changes from supplier WhatsApp messages. Review and approve before updating cost database." breadcrumb="Smart Features → WA Price Alerts" />} />
                    <Route path="multilingual" element={<ComingSoonPage title="Multilingual Comms" icon="🌐" desc="Send WhatsApp messages and catalogue PDFs in Hindi, Gujarati, and other regional languages." breadcrumb="Smart Features → Multilingual" />} />
                    <Route path="customer-360" element={<ComingSoonPage title="Customer 360°" icon="🏦" desc="Full customer view — order history, outstanding balance, design access, visit log, WhatsApp summary, and payment reminders." breadcrumb="Smart Features → Customer 360°" />} />
                    <Route path="payment-reminders" element={<PaymentRemindersPage />} />

                    {/* CRM & Access */}
                    <Route path="field-visits" element={<FieldVisitTrackerPage />} />
                    <Route path="team-tracker" element={<ComingSoonPage title="Sales Team Map" icon="🗺" desc="Real-time location of your sales team on Google Maps. See who's online, last check-in, and visit count." breadcrumb="CRM → Sales Team Map" />} />
                    <Route path="customer-portal" element={<ComingSoonPage title="Customer Portal Access" icon="🔐" desc="Control which design categories each customer can view on their private portal — category toggles and individual overrides." breadcrumb="CRM → Customer Portal" />} />
                    <Route path="access-control" element={<ComingSoonPage title="Access Control" icon="🛡" desc="Manage role permissions for Sales Executive, Manager, and Admin. Area-based CRM restrictions and module-level controls." breadcrumb="CRM → Access Control" />} />

                    {/* Integrations */}
                    <Route path="whatsapp" element={<ComingSoonPage title="WhatsApp Bot" icon="💬" desc="Manage AI WhatsApp sales bot — conversation logs, auto-reply config, design sharing flow, and pricing escalation timers." breadcrumb="Integrations → WhatsApp Bot" />} />
                    <Route path="cloud-sync" element={<CloudSyncPage />} />
                    <Route path="ai-pricing" element={<ComingSoonPage title="AI Price Sync" icon="🤖" desc="AI-powered pricing suggestions based on market data and cost trends. One-click approve to update price database." breadcrumb="Integrations → AI Price Sync" />} />

                    {/* Settings */}
                    <Route path="settings/rate-card" element={<RateCardPage />} />
                    <Route path="settings/dropdown-manager" element={<DropdownManager />} />
                    <Route path="settings/job-units" element={<JobUnitsPage />} />
                    <Route path="settings/suppliers" element={<SuppliersManager />} />
                    <Route path="settings/hsn-codes" element={<HSNCodeMaster />} />
                    <Route path="sales/quick-price" element={<QuickPriceCheckPage />} />

                    {/* Admin catch-all */}
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <CartDrawer />
                <Toaster />
                {!window.location.pathname.startsWith('/admin') && <WhatsAppWidget />}
              </React.Suspense>
            </CartProvider>
          </AuthProvider>
        </Router>
      </PageErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
