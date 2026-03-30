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
// Ã¢â€â‚¬Ã¢â€â‚¬ Public Pages Ã¢â€â‚¬Ã¢â€â‚¬
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
// Ã¢â€â‚¬Ã¢â€â‚¬ Customer Portal Ã¢â€â‚¬Ã¢â€â‚¬
import CustomerLoginPage from '@/pages/CustomerLoginPage';
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import ProductCatalog from '@/pages/customer/ProductCatalog';
import DesignGallery from '@/pages/customer/DesignGallery';
import CustomerOrders from '@/pages/customer/CustomerOrders';
import CustomerOutstanding from '@/pages/customer/CustomerOutstanding';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin Core Ã¢â€â‚¬Ã¢â€â‚¬
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Dashboard Ã¢â€â‚¬Ã¢â€â‚¬
import AdminDashboard from '@/pages/admin/AdminDashboard';
import DesignPricingPage from '@/pages/admin/fabric/DesignPricingPage';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Fabric Master Ã¢â€â‚¬Ã¢â€â‚¬
import BaseFabricForm from '@/pages/admin/fabric/BaseFabricForm';
import FinishFabricForm from '@/pages/admin/fabric/FinishFabricForm';
import FinishFabricDashboard from '@/pages/admin/fabric/FinishFabricDashboard';
import BulkImportPage from '@/pages/admin/fabric/BulkImportPage';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Images Ã¢â€â‚¬Ã¢â€â‚¬
import JobCardsList from '@/pages/admin/challans/JobCardsList';
import JobWorkersPage from '@/pages/admin/vendors/JobWorkersPage';
import ProductionTracker from '@/pages/admin/manufacturing/ProductionTracker';
import PaymentRemindersPage from '@/pages/admin/marketing/PaymentRemindersPage';
import ImageUploadPage from '@/pages/admin/images/ImageUploadPage';
import DesignUploadPage from '@/pages/admin/design/DesignUploadPage';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Cost Engine Ã¢â€â‚¬Ã¢â€â‚¬
import PurchaseEntryPage from '@/pages/admin/cost/PurchaseEntryPage';
import ProcessEntryPage from '@/pages/admin/cost/ProcessEntryPage';
import ValueAdditionEntryPage from '@/pages/admin/cost/ValueAdditionEntryPage';
import CostSheetPage from '@/pages/admin/cost/CostSheetPage';
import HakobaBatchCalculator from '@/pages/admin/cost/HakobaBatchCalculator';
import PriceDatabasePage from '@/pages/admin/pricing/PriceDatabasePage';
import ReadymadeGarmentCostSheet from '@/pages/admin/costing/ReadymadeGarmentCostSheet';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Settings Ã¢â€â‚¬Ã¢â€â‚¬
import RateCardPage from '@/pages/admin/settings/RateCardPage';
import DropdownManager from '@/pages/admin/settings/DropdownManager';
import JobUnitsPage from '@/pages/admin/unit-management/JobUnitsPage';
import SuppliersManager from '@/pages/admin/settings/SuppliersManager';
import HSNCodeMaster from '@/pages/admin/settings/HSNCodeMaster';
import SKUFormulaSettings from '@/pages/admin/settings/SKUFormulaSettings';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Sales & Orders Ã¢â€â‚¬Ã¢â€â‚¬
import QuickPriceCheckPage from '@/pages/admin/sales/QuickPriceCheckPage';
import StoreManagerOrders from '@/pages/admin/orders/StoreManagerOrders';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Integrations Ã¢â€â‚¬Ã¢â€â‚¬
import CloudSyncPage from '@/pages/admin/integrations/CloudSyncPage';
import TallySyncDashboard from '@/pages/admin/integrations/TallySyncDashboard';
import GoogleDrivePage from '@/pages/admin/integrations/GoogleDrivePage';
import BunnyNetPage from '@/pages/admin/integrations/BunnyNetPage';
// Ã¢â€â‚¬Ã¢â€â‚¬ Admin: New Functional Pages Ã¢â€â‚¬Ã¢â€â‚¬
import CustomerMasterPage from '@/pages/admin/CustomerMasterPage';
import ChallansPage from '@/pages/admin/ChallansPage';
import DesignVelocityPage from '@/pages/admin/DesignVelocityPage';
import OutstandingReceivable from '@/pages/reports/OutstandingReceivable';
import OutstandingPayable from '@/pages/reports/OutstandingPayable';
import CashBankBalance from '@/pages/reports/CashBankBalance';
import MarketIntelPage from '@/pages/admin/MarketIntelPage';
import FieldVisitTrackerPage from '@/pages/admin/FieldVisitTrackerPage';
import Customer360Page from '@/pages/admin/Customer360Page';
import CalendarVisitsPage from '@/pages/admin/CalendarVisitsPage';
import WhatsAppBotPage from '@/pages/admin/WhatsAppBotPage';
import WhatsAppBroadcastPage from '@/pages/admin/marketing/WhatsAppBroadcast';
import WhatsAppInboxPage from '@/pages/admin/WhatsAppInboxPage';
import FabricCataloguePage from '@/pages/admin/FabricCataloguePage';
import AIPriceSyncPage from '@/pages/admin/AIPriceSyncPage';
import SalesTeamMapPage from '@/pages/admin/SalesTeamMapPage';
import MakeToOrderPage from '@/pages/admin/MakeToOrderPage';
import CustomerPortalAccessPage from '@/pages/admin/CustomerPortalAccessPage';
import AccessControlPage from '@/pages/admin/AccessControlPage';
import WhatsAppWidget from '@/components/common/WhatsAppWidget';
import BackupControlPage from '@/pages/admin/BackupControlPage';
import EcomControlPage from '@/pages/admin/EcomControlPage';
// â”€â”€â”€ Admin: Sales Orders (new) â”€â”€â”€
import SalesOrderList from '@/pages/admin/sales/SalesOrderList';
import SalesOrderForm from '@/pages/admin/sales/SalesOrderForm';
// â”€â”€â”€ Admin: Reports (new) â”€â”€â”€â”€â”€â”€â”€â”€
import PartyLedger from '@/pages/reports/PartyLedger';
import DayBook from '@/pages/reports/DayBook';
import AgentCommissionPage from '@/pages/admin/AgentCommissionPage';
import MillPerformancePage from '@/pages/admin/MillPerformancePage';
import BrokerAnalyticsPage from '@/pages/admin/BrokerAnalyticsPage';
import DesignProfitability from '@/pages/reports/DesignProfitability';
import DesignLifecyclePage from '@/pages/admin/DesignLifecyclePage';
import BrokerOutstandingPage from '@/pages/admin/BrokerOutstandingPage';
import EnhancedSalesBillsPage from '@/pages/admin/EnhancedSalesBillsPage';
import PurchaseBillsPage from '@/pages/admin/accounting/PurchaseBillsPage';
import SalesBillsPage from '@/pages/admin/accounting/SalesBillsPage';
import JobWorkBillsPage from '@/pages/admin/accounting/JobWorkBillsPage';
import QuotationsPage from '@/pages/admin/accounting/QuotationsPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import ActivityLogsPage from '@/pages/admin/ActivityLogsPage';
import MediaLibraryPage from '@/pages/admin/MediaLibraryPage';
import JobWorkChallansPage from '@/pages/admin/JobWorkChallansPage';
import ManufacturingEntryPage from '@/pages/admin/ManufacturingEntryPage';
import DesignGalleryPage from '@/pages/admin/design/DesignGalleryPage';
import MTOCostTemplatePage from '@/pages/admin/MTOCostTemplatePage';
import StockManager from '@/pages/admin/inventory/StockManager';
import LiveStockPage from '@/pages/admin/LiveStockPage';
import JobWorkJobsPage from '@/pages/admin/JobWorkJobsPage';

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
                  {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PUBLIC ROUTES Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
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

                    {/* Ã¢â€â‚¬Ã¢â€â‚¬ Customer Portal Routes Ã¢â€â‚¬Ã¢â€â‚¬ */}
                    <Route path="/customer/login" element={<CustomerLoginPage />} />
                    <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                    <Route path="/customer/catalogue" element={<ProductCatalog />} />
                    <Route path="/customer/designs" element={<DesignGallery />} />
                    <Route path="/customer/orders" element={<CustomerOrders />} />
                    <Route path="/customer/outstanding" element={<CustomerOutstanding />} />
                    <Route path="/customer/cart" element={<CartPage />} />
                    <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
                  </Route>

                  {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â ADMIN ROUTES Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
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
                    <Route path="fabric/finish-fabric-form/:fabricId/designs" element={<DesignPricingPage />} />
                    <Route path="fabric/finish" element={<FinishFabricDashboard />} />
                    <Route path="fabric/finish/new" element={<FinishFabricForm />} />
                    <Route path="fabric/finish/:id/edit" element={<FinishFabricForm />} />
                    <Route path="fabric/fancy-finish-fabric-form" element={<Navigate to="/admin/fabric/finish-fabric-form" replace />} />
                    <Route path="fabric-master/bulk-import" element={<BulkImportPage />} />

                    {/* Design Catalogue */}
                    <Route path="images/upload" element={<ImageUploadPage />} />
                    <Route path="design/upload" element={<DesignUploadPage />} />
                    <Route path="design-velocity" element={<DesignVelocityPage />} />
                    <Route path="products" element={<ComingSoonPage title="Product Master" icon="Ã°Å¸â€”â€š" desc="Master catalogue of all finished products." breadcrumb="Design Catalogue Ã¢â€ â€™ Product Master" />} />

                    {/* Cost Engine */}
                    <Route path="cost/purchase-entry" element={<PurchaseEntryPage />} />
                    <Route path="cost/process-entry" element={<ProcessEntryPage />} />
                    <Route path="cost/value-addition-entry" element={<ValueAdditionEntryPage />} />
                    <Route path="cost/cost-sheet" element={<CostSheetPage />} />
                    <Route path="cost/hakoba-calc" element={<HakobaBatchCalculator />} />
                    <Route path="price-database" element={<PriceDatabasePage />} />
                    <Route path="garment-cost" element={<ReadymadeGarmentCostSheet />} />

                    {/* Store */}
                    <Route path="store-sync" element={<ComingSoonPage title="Store Sync" icon="Ã°Å¸â€ºâ€™" desc="Sync approved designs directly to the storefront." breadcrumb="Store Ã¢â€ â€™ Store Sync" />} />

                    {/* Operations */}
                    <Route path="order-database/sales" element={<StoreManagerOrders />} />
                    <Route path="orders/store-dispatch" element={<StoreManagerOrders />} />
                    <Route path="customers" element={<CustomerMasterPage />} />
                    <Route path="market-intel" element={<MarketIntelPage />} />
                    <Route path="mto-orders" element={<MakeToOrderPage />} />
              {/* Design Gallery & MTO Cost Templates */}
              <Route path="design-gallery" element={<DesignGalleryPage />} />
              <Route path="mto-cost-template" element={<MTOCostTemplatePage />} />

                    {/* Smart Features */}
                    <Route path="calendar" element={<CalendarVisitsPage />} />
                    <Route path="supplier-price-ai" element={<AIPriceSyncPage />} />
                    <Route path="ai-pricing" element={<AIPriceSyncPage />} />
                    <Route path="multilingual" element={<ComingSoonPage title="Multilingual Comms" icon="Ã°Å¸Å’Â" desc="Send messages in Hindi, Gujarati, and other languages." breadcrumb="Smart Features Ã¢â€ â€™ Multilingual" />} />
                    <Route path="customer-360" element={<Customer360Page />} />
                    <Route path="payment-reminders" element={<PaymentRemindersPage />} />
                    <Route path="outstanding-receivable" element={<OutstandingReceivable />} />
                    <Route path="outstanding-payable" element={<OutstandingPayable />} />
                    <Route path="cash-bank" element={<CashBankBalance />} />

                    {/* CRM & Access */}
                    <Route path="field-visits" element={<FieldVisitTrackerPage />} />
                    <Route path="team-tracker" element={<SalesTeamMapPage />} />
                    <Route path="customer-portal" element={<CustomerPortalAccessPage />} />
                    <Route path="access-control" element={<AccessControlPage />} />

                    {/* Integrations */}
                    <Route path="whatsapp" element={<WhatsAppBotPage />} />
                    <Route path="whatsapp-broadcast" element={<WhatsAppBroadcastPage />} />
                    <Route path="whatsapp-inbox" element={<WhatsAppInboxPage />} />
              <Route path="fabric-catalogue" element={<FabricCataloguePage />} />
                    <Route path="cloud-sync" element={<CloudSyncPage />} />
                    <Route path="tally-prime" element={<TallySyncDashboard />} />
                    <Route path="tally-sync" element={<TallySyncDashboard />} />
                    <Route path="google-drive" element={<GoogleDrivePage />} />
                    <Route path="bunny-cdn" element={<BunnyNetPage />} />
                    {/* Backup Control */}
                    <Route path="backup-control" element={<BackupControlPage />} />
                    {/* Ecom Control */}
                     <Route path="ecom" element={<EcomControlPage />} />
                    {/* Settings */}
                    <Route path="settings/rate-card" element={<RateCardPage />} />
                    <Route path="settings/dropdown-manager" element={<DropdownManager />} />
                    <Route path="settings/job-units" element={<JobUnitsPage />} />
                    <Route path="settings/suppliers" element={<SuppliersManager />} />
                    <Route path="settings/hsn-codes" element={<HSNCodeMaster />} />
                    <Route path="settings/sku-formula" element={<SKUFormulaSettings />} />
                    <Route path="sales/quick-price" element={<QuickPriceCheckPage />} />

                    {/* Sales Orders */}
                    <Route path="orders" element={<SalesOrderList />} />
                    <Route path="orders/new" element={<SalesOrderForm />} />
                    <Route path="orders/:id/edit" element={<SalesOrderForm />} />

                    {/* Reports */}
                    <Route path="reports/party-ledger" element={<PartyLedger />} />
              <Route path="agent-commission" element={<AgentCommissionPage />} />
                    <Route path="reports/day-book" element={<DayBook />} />
                    <Route path="reports/design-profitability" element={<DesignProfitability />} />
                    <Route path="design-lifecycle" element={<DesignLifecyclePage />} />
                    <Route path="broker-outstanding" element={<BrokerOutstandingPage />} />
                    <Route path="sales-bills-detail" element={<EnhancedSalesBillsPage />} />

                    {/* Accounting Pages */}
                    <Route path="accounting/purchase-bills" element={<PurchaseBillsPage />} />
                    <Route path="accounting/sales-bills" element={<SalesBillsPage />} />
                    <Route path="accounting/job-work-bills" element={<JobWorkBillsPage />} />
                    <Route path="accounting/quotations" element={<QuotationsPage />} />

                    {/* New Pages â€” Analytics, Logs, Media, Job Workers */}
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="mill-performance" element={<MillPerformancePage />} />
                    <Route path="broker-analytics" element={<BrokerAnalyticsPage />} />
                    <Route path="activity-logs" element={<ActivityLogsPage />} />
                    <Route path="media-library" element={<MediaLibraryPage />} />
                    <Route path="job-workers" element={<JobWorkersPage />} />
                    <Route path="challans" element={<JobCardsList />} />
                    <Route path="manufacturing" element={<ManufacturingEntryPage />} />
                    <Route path="production-floor" element={<ProductionTracker />} />
                    <Route path="job-work-jobs" element={<JobWorkJobsPage />} />
                    
                    {/* Stock & Inventory */}
                    <Route path="stock" element={<LiveStockPage />} />
                    <Route path="stock/alerts" element={<StockManager />} />
                    <Route path="stock/inward" element={<ComingSoonPage title="Stock In/Out" icon="📦" desc="Stock inventory movement system." breadcrumb="Inventory → Transact" />} />

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


