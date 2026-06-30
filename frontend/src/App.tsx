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
import Dashboard from './pages/dashboard/Dashboard';
import Customers from './pages/masters/Customers';
import Suppliers from './pages/masters/Suppliers';
import Medicines from './pages/masters/Medicines';
import Users from './pages/masters/Users';
import { Doctors, MedicineCategories, MedicineCompanies, HsnCodes, GstSlabs, Units, Racks } from './pages/masters/SimpleMasters';
import PurchaseEntry from './pages/purchase/PurchaseEntry';
import SalesBilling from './pages/sales/SalesBilling';
import { CurrentStock, ExpiryStock, BatchWiseStock } from './pages/stock/StockPages';
import { SalesReport, GstReport, ProfitReport } from './pages/reports/Reports';
import Settings from './pages/settings/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const AppContent: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} autoHideDuration={3000}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
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
              <Route path="masters/users" element={<ProtectedRoute roles={['super_admin', 'admin']}><Users /></ProtectedRoute>} />
              {/* Transactions */}
              <Route path="purchase" element={<PurchaseEntry />} />
              <Route path="sales" element={<SalesBilling />} />
              {/* Stock */}
              <Route path="stock/current" element={<CurrentStock />} />
              <Route path="stock/batch-wise" element={<BatchWiseStock />} />
              <Route path="stock/expiry" element={<ExpiryStock type="expiry" />} />
              <Route path="stock/near-expiry" element={<ExpiryStock type="near-expiry" />} />
              {/* Reports */}
              <Route path="reports/sales" element={<SalesReport />} />
              <Route path="reports/gst" element={<GstReport />} />
              <Route path="reports/profit" element={<ProfitReport />} />
              {/* Settings */}
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
