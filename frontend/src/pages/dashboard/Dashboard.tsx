import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Skeleton, Avatar, LinearProgress,
} from '@mui/material';
import {
  TrendingUp, ShoppingCart, AttachMoney, Inventory,
  Warning, People, LocalHospital, Business,
  ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { dashboardService } from '../../services';
import type { DashboardStats, ChartDataPoint } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  change?: number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgGradient, change, subtitle }) => (
  <Card sx={{ position: 'relative', overflow: 'hidden', cursor: 'default' }}>
    <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <Box sx={{ position: 'absolute', top: 30, right: 30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
    <CardContent sx={{ background: bgGradient, color: '#fff', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="h4" fontWeight={800}>{value}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{subtitle}</Typography>}
          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {change >= 0 ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
              <Typography variant="caption" fontWeight={600}>{Math.abs(change)}% vs yesterday</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 3, background: 'rgba(255,255,255,0.2)' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60000,
  });

  const { data: salesChartData } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: () => dashboardService.getSalesChart(),
  });

  const { data: purchaseChartData } = useQuery({
    queryKey: ['purchase-chart'],
    queryFn: () => dashboardService.getPurchaseChart(),
  });

  const { data: recentSalesData } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => dashboardService.getRecentSales(),
  });

  const stats: DashboardStats = statsData?.data?.data || {} as DashboardStats;

  const chartData = MONTHS.map((month, i) => {
    const sales = (salesChartData?.data?.data as ChartDataPoint[] || []).find((d) => d.month === i + 1)?.total || 0;
    const purchase = (purchaseChartData?.data?.data as ChartDataPoint[] || []).find((d) => d.month === i + 1)?.total || 0;
    return { month, sales, purchase, profit: sales - purchase };
  });

  const statCards: StatCardProps[] = [
    { title: "Today's Sales", value: formatCurrency(stats.todaySales || 0), icon: <TrendingUp sx={{ fontSize: 28 }} />, color: '#2E7D32', bgGradient: 'linear-gradient(135deg, #2E7D32, #43A047)', change: 12 },
    { title: "Today's Purchase", value: formatCurrency(stats.todayPurchase || 0), icon: <ShoppingCart sx={{ fontSize: 28 }} />, color: '#1565C0', bgGradient: 'linear-gradient(135deg, #1565C0, #1976D2)', change: -5 },
    { title: "Today's Profit", value: formatCurrency(stats.todayProfit || 0), icon: <AttachMoney sx={{ fontSize: 28 }} />, color: '#F57F17', bgGradient: 'linear-gradient(135deg, #F57F17, #FB8C00)', change: 8 },
    { title: 'Stock Value', value: formatCurrency(stats.stockValue || 0), icon: <Inventory sx={{ fontSize: 28 }} />, color: '#0277BD', bgGradient: 'linear-gradient(135deg, #0277BD, #0288D1)', subtitle: 'Inventory value' },
    { title: 'Low Stock', value: stats.lowStock || 0, icon: <Warning sx={{ fontSize: 28 }} />, color: '#C62828', bgGradient: 'linear-gradient(135deg, #C62828, #EF5350)', subtitle: 'Items below reorder' },
    { title: 'Expiry Alerts', value: stats.expiredBatches || 0, icon: <Warning sx={{ fontSize: 28 }} />, color: '#E65100', bgGradient: 'linear-gradient(135deg, #E65100, #F57F17)', subtitle: 'Expired batches' },
    { title: 'Customers', value: stats.totalCustomers || 0, icon: <People sx={{ fontSize: 28 }} />, color: '#4527A0', bgGradient: 'linear-gradient(135deg, #4527A0, #5E35B1)', subtitle: 'Registered customers' },
    { title: 'Suppliers', value: stats.totalSuppliers || 0, icon: <Business sx={{ fontSize: 28 }} />, color: '#00695C', bgGradient: 'linear-gradient(135deg, #00695C, #00897B)', subtitle: 'Active suppliers' },
  ];

  if (statsLoading) {
    return (
      <Grid container spacing={3}>
        {[...Array(8)].map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Welcome back! Here's what's happening today.</Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Sales vs Purchase</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#1565C0" fill="url(#salesGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="purchase" name="Purchase" stroke="#2E7D32" fill="url(#purchaseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Profit</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="profit" name="Profit" fill="#1565C0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Bills */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Recent Sales</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Invoice No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(recentSalesData?.data?.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No recent sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  (recentSalesData?.data?.data || []).map((sale: { id: number; invoiceNo: string; invoiceDate: string; customer?: { name: string }; paymentMode?: string; grandTotal: number }) => (
                    <TableRow key={sale.id} hover>
                      <TableCell><Chip label={sale.invoiceNo} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell>{new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                      <TableCell><Chip label={sale.paymentMode || 'Cash'} size="small" /></TableCell>
                      <TableCell align="right"><Typography fontWeight={700} color="primary.main">{formatCurrency(sale.grandTotal)}</Typography></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
