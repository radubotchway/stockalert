import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductsPage } from './features/products/ProductsPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { ScanPage } from './features/scan/ScanPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { SuppliersPage } from './features/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from './features/purchaseOrders/PurchaseOrdersPage';
import { NewPurchaseOrderPage } from './features/purchaseOrders/NewPurchaseOrderPage';
import { PurchaseOrderDetailPage } from './features/purchaseOrders/PurchaseOrderDetailPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { BarcodeDemoPage } from './features/barcodes/BarcodeDemoPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route
              path="/purchase-orders/new"
              element={
                <ProtectedRoute pharmacistOnly>
                  <NewPurchaseOrderPage />
                </ProtectedRoute>
              }
            />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/barcodes" element={<BarcodeDemoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
