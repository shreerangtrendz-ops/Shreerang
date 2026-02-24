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

// Public Pages
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
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

// Settings & New Pages
import RateCardPage from '@/pages/admin/settings/RateCardPage';
import DropdownManager from '@/pages/admin/settings/DropdownManager';
import PriceDatabasePage from '@/pages/admin/pricing/PriceDatabasePage';
import ReadymadeGarmentCostSheet from '@/pages/admin/costing/ReadymadeGarmentCostSheet';
import JobUnitsPage from '@/pages/admin/unit-management/JobUnitsPage';
import SuppliersManager from '@/pages/admin/settings/SuppliersManager';
import HSNCodeMaster from '@/pages/admin/settings/HSNCodeMaster';
import BulkImportPage from '@/pages/admin/fabric/BulkImportPage';

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
                  <Route element={<CustomerLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/products/:slug" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>

                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    
                    {/* New Fabric Master Forms Routes */}
                    <Route path="fabric/base-fabric-form" element={<BaseFabricForm />} />
                    <Route path="fabric/finish-fabric-form" element={<FinishFabricForm />} />
                    <Route path="fabric/fancy-finish-fabric-form" element={<FancyFinishFabricForm />} />
                    <Route path="fabric/fancy-base-fabric-form" element={<FancyBaseFabricForm />} />

                    <Route path="images/upload" element={<ImageUploadPage />} />

                    <Route path="cost/purchase-entry" element={<PurchaseEntryPage />} />
                    <Route path="cost/process-entry" element={<ProcessEntryPage />} />
                    <Route path="cost/value-addition-entry" element={<ValueAdditionEntryPage />} />
                    <Route path="cost/cost-sheet" element={<CostSheetPage />} />
                    <Route path="cost/hakoba-calc" element={<HakobaBatchCalculator />} />

                    <Route path="settings/rate-card" element={<RateCardPage />} />
                    <Route path="settings/dropdown-manager" element={<DropdownManager />} />
                    
                    <Route path="price-database" element={<PriceDatabasePage />} />
                    <Route path="garment-cost" element={<ReadymadeGarmentCostSheet />} />
                    <Route path="settings/job-units" element={<JobUnitsPage />} />
                    <Route path="settings/suppliers" element={<SuppliersManager />} />
                    <Route path="settings/hsn-codes" element={<HSNCodeMaster />} />
                    <Route path="fabric-master/bulk-import" element={<BulkImportPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                
                <CartDrawer />
                <Toaster />
                <div className="block md:hidden"></div>
                {!window.location.pathname.startsWith('/admin') && <WhatsAppWidget />}
              </React.Suspense>
            </CartProvider>
          </AuthProvider>
        </Router>
      </PageErrorBoundary>
    </HelmetProvider>
  );
}

export default App;