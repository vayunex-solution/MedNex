import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { useAppSelector } from './hooks/useRedux';
import { lightTheme, darkTheme } from './theme';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import LandingPage from './pages/landing/LandingPage';
import Dashboard from './pages/dashboard/Dashboard';
import Customers from './pages/masters/Customers';
import Suppliers from './pages/masters/Suppliers';
import Medicines from './pages/masters/Medicines';
import Users from './pages/masters/Users';
import Tenants from './pages/masters/Tenants';
import { Doctors, MedicineCategories, MedicineCompanies, HsnCodes, GstSlabs, Units, Racks, States, Cities } from './pages/masters/SimpleMasters';
import PurchaseEntry from './pages/purchase/PurchaseEntry';
import SalesBilling from './pages/sales/SalesBilling';
import { CurrentStock, ExpiryStock, BatchWiseStock } from './pages/stock/StockPages';
import { SalesReport, PurchaseReport, GstReport, ProfitReport, CustomerLedger, SupplierLedger, ItemLedger } from './pages/reports/Reports';
import AuditTrailReport from './pages/reports/AuditTrailReport';
import { CashBook, BankBook, JournalBook } from './pages/finance/Books';
import CashBankEntry from './pages/finance/CashBankEntry';
import JournalVoucher from './pages/finance/JournalVoucher';
import Settings from './pages/settings/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const AppContent: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} autoHideDuration={3000}>
        <BrowserRouter>
          <Routes>
            {/* Public — Landing page; redirect to dashboard if already logged in */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />

            {/* Auth — Login page; redirect to dashboard if already logged in */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

            {/* Protected App Routes */}
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              {/* Masters */}
              <Route path="masters/customers" element={<Customers />} />
              <Route path="masters/suppliers" element={<Suppliers />} />
              <Route path="masters/doctors" element={<Doctors />} />
              <Route path="masters/medicines" element={<Medicines />} />
              <Route path="masters/categories" element={<MedicineCategories />} />
              <Route path="masters/companies" element={<MedicineCompanies />} />
              <Route path="masters/hsn" element={<HsnCodes />} />
              <Route path="masters/gst" element={<GstSlabs />} />
              <Route path="masters/units" element={<Units />} />
              <Route path="masters/racks" element={<Racks />} />
              <Route path="masters/states" element={<States />} />
              <Route path="masters/cities" element={<Cities />} />
              <Route path="masters/users" element={<ProtectedRoute roles={['super_admin', 'admin']}><Users /></ProtectedRoute>} />
              <Route path="masters/tenants" element={<ProtectedRoute roles={['super_admin']}><Tenants /></ProtectedRoute>} />
              {/* Transactions */}
              <Route path="purchase" element={<PurchaseEntry />} />
              <Route path="sales" element={<SalesBilling />} />
              {/* Stock */}
              <Route path="stock/current" element={<CurrentStock />} />
              <Route path="stock/batch-wise" element={<BatchWiseStock />} />
              <Route path="stock/expiry" element={<ExpiryStock type="expiry" />} />
              <Route path="stock/near-expiry" element={<ExpiryStock type="near-expiry" />} />
              {/* Finance */}
              <Route path="finance/cash-bank" element={<CashBankEntry />} />
              <Route path="finance/journal" element={<JournalVoucher />} />
              {/* Reports */}
              <Route path="reports/sales" element={<SalesReport />} />
              <Route path="reports/purchase" element={<PurchaseReport />} />
              <Route path="reports/gst" element={<GstReport />} />
              <Route path="reports/profit" element={<ProfitReport />} />
              <Route path="reports/customer-ledger" element={<CustomerLedger />} />
              <Route path="reports/supplier-ledger" element={<SupplierLedger />} />
              <Route path="reports/item-ledger" element={<ItemLedger />} />
              <Route path="reports/cash-book" element={<CashBook />} />
              <Route path="reports/bank-book" element={<BankBook />} />
              <Route path="reports/journal-book" element={<JournalBook />} />
              <Route path="reports/audit-trail" element={<ProtectedRoute roles={['super_admin', 'admin']}><AuditTrailReport /></ProtectedRoute>} />
              {/* Settings */}
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </Provider>
);

export default App;
