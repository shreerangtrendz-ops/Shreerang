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

// Public Pages
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import WholesalePortalPage from '@/pages/WholesalePortalPage';
// Auth Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Admin Core
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import BaseFabricForm from '@/pages/admin/fabric/BaseFabricForm';
import FinishFabricForm from '@/pages/admin/fabric/FinishFabricForm';
import FancyFinishFabricForm from '@/pages/admin/fabric/FancyFinishFabricForm';
import FancyBaseFabricForm from '@/pages/admin/fabric/FancyBaseFabricForm';
import ImageUploadPage from '@/pages/admin/images/ImageUploadPage';

// Cost & Data Entry
import PurchaseEntryPage from '@/pages/admin/cost/PurchaseEntryPage';
import ProcessEntryPage from '@/pages/admin/cost/ProcessEntryPage';
import ValueAdditionEntryPage from '@/pages/admin/cost/ValueAdditionEntryPage';
import CostSheetPage from '@/pages/admin/cost/CostSheetPage';
import HakobaBatchCalculator from '@/pages/admin/cost/HakobaBatchCalculator';

// Settings & Data
import RateCardPage from '@/pages/admin/settings/RateCardPage';
import DropdownManager from '@/pages/admin/settings/DropdownManager';
import PriceDatabasePage from '@/pages/admin/pricing/PriceDatabasePage';
import ReadymadeGarmentCostSheet from '@/pages/admin/costing/ReadymadeGarmentCostSheet';
import JobUnitsPage from '@/pages/admin/unit-management/JobUnitsPage';
import SuppliersManager from '@/pages/admin/settings/SuppliersManager';
import HSNCodeMaster from '@/pages/admin/settings/HSNCodeMaster';
import BulkImportPage from '@/pages/admin/fabric/BulkImportPage';
import QuickPriceCheckPage from '@/pages/admin/sales/QuickPriceCheckPage';
import StoreManagerOrders from '@/pages/admin/orders/StoreManagerOrders';

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
                  {/* ── PUBLIC ROUTES ── */}
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

                  {/* ── ADMIN ROUTES ── */}
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

                    {/* Design Catalogue */}
                    <Route path="images/upload" element={<ImageUploadPage />} />
                    <Route path="design-velocity" element={<ComingSoonPage title="Design Velocity" icon="📈" desc="Analyse which designs are trending (hot movers) vs slow movers based on order frequency. Helps prioritise production and promotions." breadcrumb="Design Catalogue → Design Velocity" />} />
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
                    <Route path="store-sync" element={<ComingSoonPage title="Store Sync" icon="🛒" desc="Sync your approved designs and products directly to the public-facing Shreerangtrendz.com storefront. Control visibility, pricing, and stock." breadcrumb="Store → Store Sync" />} />

                    {/* Operations */}
                    <Route path="order-database/sales" element={<StoreManagerOrders />} />
                    <Route path="orders/store-dispatch" element={<StoreManagerOrders />} />
                    <Route path="challans" element={<ComingSoonPage title="Challans" icon="📄" desc="Track fabric dispatches to jobworkers and returns. View open challans, pending returns, and challan history by processor." breadcrumb="Operations → Challans" />} />
                    <Route path="customers" element={<ComingSoonPage title="Customer Master" icon="👥" desc="Full customer database — Firm Name, Contact, Area, Payment Terms, Credit Limit, Order History, WhatsApp conversation log." breadcrumb="Operations → Customers" />} />
                    <Route path="market-intel" element={<ComingSoonPage title="Market Intelligence" icon="📡" desc="Track competitor prices, WhatsApp group price mentions (AI extracted), seasonal demand trends, and regional demand maps." breadcrumb="Operations → Market Intelligence" />} />
                    <Route path="mto-orders" element={<ComingSoonPage title="Make-to-Order Pipeline" icon="🎯" desc="Track MTO enquiries from Enquiry → Quoted → Confirmed → In Production → Dispatched → Delivered. Linked to Cost Sheet and Challans." breadcrumb="Operations → Make-to-Order" />} />

                    {/* Smart Features */}
                    <Route path="calendar" element={<ComingSoonPage title="Calendar & Visits" icon="📅" desc="Schedule and track field visits, customer appointments, follow-ups, and sales team check-ins in one unified calendar view." breadcrumb="Smart Features → Calendar & Visits" />} />
                    <Route path="supplier-price-ai" element={<ComingSoonPage title="WA Price Alerts" icon="🔔" desc="AI-detected price changes from supplier WhatsApp messages. Review, approve, or reject rate updates before they affect your cost database." breadcrumb="Smart Features → WA Price Alerts" />} />
                    <Route path="multilingual" element={<ComingSoonPage title="Multilingual Communications" icon="🌐" desc="Send WhatsApp messages and catalogue PDFs in Hindi, Gujarati, and other regional languages. AI-powered translation." breadcrumb="Smart Features → Multilingual Comms" />} />
                    <Route path="customer-360" element={<ComingSoonPage title="Customer 360°" icon="🏦" desc="Complete customer view — order history, balance outstanding, design access, visit log, WhatsApp chat summary, and payment reminders." breadcrumb="Smart Features → Customer 360°" />} />
                    <Route path="payment-reminders" element={<ComingSoonPage title="Payment Reminders" icon="⏰" desc="Automated WhatsApp payment reminders at configurable intervals. Shows all overdue customers sorted by amount and days overdue." breadcrumb="Smart Features → Payment Reminders" />} />

                    {/* CRM & Access */}
                    <Route path="field-visits" element={<ComingSoonPage title="Field Visit Tracker" icon="📍" desc="Sales executive check-in with GPS coordinates, visit purpose, notes, follow-up date, and Google Maps embed. Proof-of-visit for sales management." breadcrumb="CRM & Access → Field Visit Tracker" />} />
                    <Route path="team-tracker" element={<ComingSoonPage title="Sales Team Map" icon="🗺" desc="Real-time location of your sales team on Google Maps. See who's online, last check-in time, and today's visit count." breadcrumb="CRM & Access → Sales Team Map" />} />
                    <Route path="customer-portal" element={<ComingSoonPage title="Customer Portal Access" icon="🔐" desc="Control which design categories and individual designs each customer can view on their private portal. Category toggles + individual overrides." breadcrumb="CRM & Access → Customer Portal" />} />
                    <Route path="access-control" element={<ComingSoonPage title="Access Control" icon="🛡" desc="Manage role permissions for Sales Executive, Sales Manager, and Admin roles. Area-based CRM restrictions and module-level view/edit/export controls." breadcrumb="CRM & Access → Access Control" />} />

                    {/* Integrations */}
                    <Route path="whatsapp" element={<ComingSoonPage title="WhatsApp Bot" icon="💬" desc="Manage your AI-powered WhatsApp sales bot. View conversation logs, configure auto-replies, set pricing escalation timers, and manage design sharing flow." breadcrumb="Integrations → WhatsApp Bot" />} />
                    <Route path="cloud-sync" element={<ComingSoonPage title="Cloud Storage" icon="☁️" desc="Manage Google Drive and Bunny.net CDN sync. View storage usage, sync status, and resolve any failed uploads." breadcrumb="Integrations → Cloud Storage" />} />
                    <Route path="ai-pricing" element={<ComingSoonPage title="AI Price Sync" icon="🤖" desc="AI-powered pricing suggestions based on market data, competitor prices, and cost trends. One-click approve to update price database." breadcrumb="Integrations → AI Price Sync" />} />

                    {/* Settings */}
                    <Route path="settings/rate-card" element={<RateCardPage />} />
                    <Route path="settings/dropdown-manager" element={<DropdownManager />} />
                    <Route path="settings/job-units" element={<JobUnitsPage />} />
                    <Route path="settings/suppliers" element={<SuppliersManager />} />
                    <Route path="settings/hsn-codes" element={<HSNCodeMaster />} />
                    <Route path="fabric-master/bulk-import" element={<BulkImportPage />} />
                    <Route path="sales/quick-price" element={<QuickPriceCheckPage />} />

                    {/* Catch-all for admin 404 */}
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