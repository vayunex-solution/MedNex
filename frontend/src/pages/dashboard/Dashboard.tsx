import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Skeleton, CircularProgress,
} from '@mui/material';
import {
  TrendingUp, ShoppingCart, AttachMoney, Inventory,
  Warning, People, Business,
  ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, ReferenceLine,
} from 'recharts';
import { dashboardService } from '../../services';
import type { DashboardStats, ChartDataPoint } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatShort = (val: number) => {
  if (Math.abs(val) >= 100000) return `Rs.${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `Rs.${(val / 1000).toFixed(0)}k`;
  return `Rs.${val}`;
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgGradient: string;
  change?: number;
  subtitle?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgGradient, change, subtitle, isLoading }) => (
  <Card sx={{ position: 'relative', overflow: 'hidden', cursor: 'default', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
    <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <CardContent sx={{ background: bgGradient, color: '#fff', p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          {isLoading ? (
            <Skeleton variant="text" width={80} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>{value}</Typography>
          )}
          {subtitle && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem' }}>{subtitle}</Typography>}
          {change !== undefined && !isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {change >= 0 ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>{Math.abs(change)}% vs last month</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 3, background: 'rgba(255,255,255,0.2)', flexShrink: 0, ml: 1 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

interface TooltipPayload { name: string; value: number; color: string; }
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, boxShadow: 3, minWidth: 160 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>{label}</Typography>
        {payload.map((entry) => (
          <Box key={entry.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
              <Typography variant="caption" color="text.secondary">{entry.name}</Typography>
            </Box>
            <Typography variant="caption" fontWeight={700}>{formatCurrency(entry.value)}</Typography>
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60000,
  });
  const { data: salesChartData, isLoading: salesChartLoading } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: () => dashboardService.getSalesChart(),
  });
  const { data: purchaseChartData, isLoading: purchaseChartLoading } = useQuery({
    queryKey: ['purchase-chart'],
    queryFn: () => dashboardService.getPurchaseChart(),
  });
  const { data: recentSalesData, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => dashboardService.getRecentSales(),
  });

  const stats: DashboardStats = statsData?.data?.data || {} as DashboardStats;
  const chartsLoading = salesChartLoading || purchaseChartLoading;

  const chartData = MONTHS.map((month, i) => {
    const sales = (salesChartData?.data?.data as ChartDataPoint[] || []).find((d) => d.month === i + 1)?.total || 0;
    const purchase = (purchaseChartData?.data?.data as ChartDataPoint[] || []).find((d) => d.month === i + 1)?.total || 0;
    return { month, sales, purchase, profit: sales - purchase };
  });

  const activeMonths = chartData.filter(d => d.sales > 0 || d.purchase > 0);
  const displayData = activeMonths.length > 0 ? activeMonths : chartData;
  const noChartData = activeMonths.length === 0 && !chartsLoading;

  const statCards: StatCardProps[] = [
    { title: "Today's Sales", value: formatCurrency(stats.todaySales || 0), icon: <TrendingUp sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #1565C0 0%, #0288D1 100%)', isLoading: statsLoading },
    { title: "Today's Purchase", value: formatCurrency(stats.todayPurchase || 0), icon: <ShoppingCart sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)', isLoading: statsLoading },
    { title: "Today's Profit", value: formatCurrency(stats.todayProfit || 0), icon: <AttachMoney sx={{ fontSize: 26 }} />, bgGradient: (stats.todayProfit || 0) >= 0 ? 'linear-gradient(135deg, #F57F17 0%, #FB8C00 100%)' : 'linear-gradient(135deg, #C62828 0%, #EF5350 100%)', isLoading: statsLoading },
    { title: 'Stock Value', value: formatCurrency(stats.stockValue || 0), icon: <Inventory sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #4527A0 0%, #5E35B1 100%)', subtitle: 'Current inventory', isLoading: statsLoading },
    { title: 'Month Sales', value: formatCurrency(stats.monthSales || 0), icon: <TrendingUp sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #00695C 0%, #00897B 100%)', subtitle: 'This month total', isLoading: statsLoading },
    { title: 'Low Stock', value: stats.lowStock || 0, icon: <Warning sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #E65100 0%, #F57F17 100%)', subtitle: 'Below reorder level', isLoading: statsLoading },
    { title: 'Customers', value: stats.totalCustomers || 0, icon: <People sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #0277BD 0%, #0288D1 100%)', subtitle: 'Registered', isLoading: statsLoading },
    { title: 'Suppliers', value: stats.totalSuppliers || 0, icon: <Business sx={{ fontSize: 26 }} />, bgGradient: 'linear-gradient(135deg, #558B2F 0%, #7CB342 100%)', subtitle: 'Active', isLoading: statsLoading },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Live data — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Sales vs Purchase</Typography>
                  <Typography variant="caption" color="text.secondary">Monthly — {new Date().getFullYear()}</Typography>
                </Box>
                {chartsLoading && <CircularProgress size={20} />}
              </Box>
              {noChartData ? (
                <Box sx={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <TrendingUp sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">No transactions found for this year.</Typography>
                  <Typography variant="caption" color="text.disabled">Create sales or purchases to see the chart.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1565C0" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#1565C0" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="purchaseG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#2E7D32" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
                    <Bar dataKey="sales" name="Sales" fill="url(#salesG)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="purchase" name="Purchase" fill="url(#purchaseG)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#F57F17" strokeWidth={2.5} dot={{ r: 3, fill: '#F57F17' }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Monthly Profit</Typography>
                  <Typography variant="caption" color="text.secondary">Sales minus Purchase</Typography>
                </Box>
                {chartsLoading && <CircularProgress size={20} />}
              </Box>
              {noChartData ? (
                <Box sx={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <AttachMoney sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">No data yet.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={displayData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#ccc" strokeDasharray="4 4" />
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      fill="#1565C0"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Recent Sales</Typography>
            {recentLoading && <CircularProgress size={18} />}
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (recentSalesData?.data?.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <ShoppingCart sx={{ fontSize: 40, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">No recent sales yet.</Typography>
                        <Typography variant="caption" color="text.disabled">Go to Sales Billing to create your first invoice.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  (recentSalesData?.data?.data || []).map((sale: {
                    id: number; invoiceNo: string; invoiceDate: string;
                    customer?: { name: string }; paymentMode?: string; grandTotal: number;
                  }) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        <Chip label={sale.invoiceNo} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{sale.customer?.name || 'Walk-in'}</TableCell>
                      <TableCell>
                        <Chip
                          label={sale.paymentMode || 'Cash'}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                          color={sale.paymentMode === 'Online' ? 'success' : sale.paymentMode === 'Cheque' ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary.main" variant="body2">{formatCurrency(sale.grandTotal)}</Typography>
                      </TableCell>
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
