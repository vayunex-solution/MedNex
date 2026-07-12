import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Menu, MenuItem, Divider, Tooltip, Badge,
  Collapse, useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, People, LocalPharmacy,
  ShoppingCart, Receipt, Inventory, Assessment, Settings,
  ChevronLeft, ChevronRight, Brightness4, Brightness7,
  KeyboardArrowDown, KeyboardArrowUp, Logout, Person,
  LocalHospital, CategoryOutlined,
  BusinessCenter, AccountBalance, QrCode, Store,
  Warning, TrendingUp,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { toggleTheme } from '../redux/slices/themeSlice';
import { logout } from '../redux/slices/authSlice';
import { authService } from '../services';
import NotificationPanel, { NotificationBell } from '../components/NotificationPanel';
import { useNotifications } from '../hooks/useNotifications';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  {
    label: 'Masters', icon: <BusinessCenter />, children: [
      { label: 'Customers', icon: <People />, path: '/masters/customers' },
      { label: 'Suppliers', icon: <Store />, path: '/masters/suppliers' },
      { label: 'Doctors', icon: <LocalHospital />, path: '/masters/doctors' },
      { label: 'Medicines', icon: <LocalPharmacy />, path: '/masters/medicines' },
      { label: 'Categories', icon: <CategoryOutlined />, path: '/masters/categories' },
      { label: 'Companies', icon: <BusinessCenter />, path: '/masters/companies' },
      { label: 'HSN Codes', icon: <QrCode />, path: '/masters/hsn' },
      { label: 'GST Slabs', icon: <AccountBalance />, path: '/masters/gst' },
      { label: 'Units', icon: <CategoryOutlined />, path: '/masters/units' },
      { label: 'Racks', icon: <Store />, path: '/masters/racks' },
      { label: 'States', icon: <CategoryOutlined />, path: '/masters/states' },
      { label: 'Cities', icon: <Store />, path: '/masters/cities' },
      { label: 'Users', icon: <Person />, path: '/masters/users' },
    ],
  },
  { label: 'Purchase Entry', icon: <ShoppingCart />, path: '/purchase' },
  { label: 'Sales Billing', icon: <Receipt />, path: '/sales' },
  {
    label: 'Stock', icon: <Inventory />, children: [
      { label: 'Current Stock', icon: <Inventory />, path: '/stock/current' },
      { label: 'Batch Wise', icon: <Inventory />, path: '/stock/batch-wise' },
      { label: 'Expiry Stock', icon: <Warning />, path: '/stock/expiry' },
      { label: 'Near Expiry', icon: <Warning />, path: '/stock/near-expiry' },
      { label: 'Adjustment', icon: <TrendingUp />, path: '/stock/adjustment' },
    ],
  },
  {
    label: 'Finance', icon: <AccountBalance />, children: [
      { label: 'Cash/Bank Entry', icon: <Receipt />, path: '/finance/cash-bank' },
      { label: 'Journal Voucher', icon: <BusinessCenter />, path: '/finance/journal' },
    ],
  },
  {
    label: 'Reports', icon: <Assessment />, children: [
      { label: 'Sales Report', icon: <TrendingUp />, path: '/reports/sales' },
      { label: 'Purchase Report', icon: <ShoppingCart />, path: '/reports/purchase' },
      { label: 'GST Report', icon: <AccountBalance />, path: '/reports/gst' },
      { label: 'Profit Report', icon: <TrendingUp />, path: '/reports/profit' },
      { label: 'Customer Ledger', icon: <People />, path: '/reports/customer-ledger' },
      { label: 'Supplier Ledger', icon: <Store />, path: '/reports/supplier-ledger' },
      { label: 'Item Ledger', icon: <Inventory />, path: '/reports/item-ledger' },
      { label: 'Cash Book', icon: <AccountBalance />, path: '/reports/cash-book' },
      { label: 'Bank Book', icon: <AccountBalance />, path: '/reports/bank-book' },
      { label: 'Journal Book', icon: <BusinessCenter />, path: '/reports/journal-book' },
      { label: 'Audit Trail', icon: <Assessment />, path: '/reports/audit-trail' },
    ],
  },
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const { user } = useAppSelector((s) => s.auth);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Masters']);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // Real-time notification system
  const notif = useNotifications();

  // Dynamically filter navItems to include Tenants management for super_admin
  const filteredNavItems = React.useMemo(() => {
    if (user?.role === 'super_admin') {
      return [
        { label: 'Platform Dashboard', icon: <Dashboard />, path: '/dashboard' },
        { label: 'Platform Tenants', icon: <Store />, path: '/masters/tenants' },
        { label: 'Platform Users', icon: <People />, path: '/masters/users' },
        { label: 'Platform Audit Trail', icon: <Assessment />, path: '/reports/audit-trail' },
        { label: 'Platform Settings', icon: <Settings />, path: '/settings' },
      ];
    }

    return navItems.map(item => {
      if (item.label === 'Masters') {
        let filteredChildren = [...(item.children || [])];
        // Non-super_admins can never see Platform Tenants
        filteredChildren = filteredChildren.filter(c => c.label !== 'Platform Tenants');
        // Hide Users list for non-admin roles (e.g. pharmacists, cashiers)
        if (user?.role !== 'admin') {
          filteredChildren = filteredChildren.filter(c => c.label !== 'Users');
        }
        return { ...item, children: filteredChildren };
      }
      return item;
    });
  }, [user]);

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]);
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isParentActive = (children?: NavItem[]) => children?.some((c) => location.pathname === c.path);

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (item.children) {
      const expanded = expandedItems.includes(item.label);
      const active = isParentActive(item.children);
      return (
        <React.Fragment key={item.label}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => toggleExpand(item.label)}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' },
                justifyContent: collapsed ? 'center' : 'flex-start',
                minHeight: 44,
              }}
            >
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.9)', minWidth: collapsed ? 0 : 40 }}>
                  {item.icon}
                </ListItemIcon>
              </Tooltip>
              {!collapsed && (
                <>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: active ? 700 : 500 } } }} />
                  {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                </>
              )}
            </ListItemButton>
          </ListItem>
          {!collapsed && (
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <List disablePadding>
                {item.children.map((child) => renderNavItem(child, 1))}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    }

    return (
      <ListItem disablePadding key={item.label}>
        <ListItemButton
          onClick={() => { navigate(item.path!); if (isMobile) setMobileOpen(false); }}
          sx={{
            mx: 1, borderRadius: 2, mb: 0.5, pl: depth > 0 ? 4 : 2,
            backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.2)' : 'transparent',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' },
            justifyContent: collapsed ? 'center' : 'flex-start',
            minHeight: 40,
          }}
        >
          <Tooltip title={collapsed ? item.label : ''} placement="right">
            <ListItemIcon sx={{ color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,0.75)', minWidth: collapsed ? 0 : 36 }}>
              {React.cloneElement(item.icon as React.ReactElement, { fontSize: 'small' })}
            </ListItemIcon>
          </Tooltip>
          {!collapsed && (
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: '0.85rem', fontWeight: isActive(item.path) ? 700 : 400, color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,0.85)' } } }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo area */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LocalPharmacy sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.2, fontSize: '0.95rem' }}>MedNex</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem' }}>by VayuNex Solution</Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mx: 2 }} />

      {/* Nav items */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 2 } }}>
        <List dense disablePadding>
          {filteredNavItems.map((item) => renderNavItem(item))}
        </List>
      </Box>

      {/* Collapse button */}
      {!isMobile && (
        <Box sx={{ p: 1 }}>
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }, width: '100%', borderRadius: 2 }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, transition: 'width 0.2s', '& .MuiDrawer-paper': { width: drawerWidth, transition: 'width 0.2s', overflowX: 'hidden' } }}>
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* AppBar */}
        <AppBar position="sticky" elevation={0} sx={{ zIndex: 1100 }}>
          <Toolbar sx={{ gap: 1 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} edge="start">
                <MenuIcon />
              </IconButton>
            )}

            <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, fontSize: '1rem' }}>
              {navItems.flatMap((i) => i.children || [i]).find((i) => i.path === location.pathname)?.label || 'MedNex'}
            </Typography>

            <Tooltip title="Toggle dark mode">
              <IconButton onClick={() => dispatch(toggleTheme())}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <NotificationBell unreadCount={notif.unreadCount} onClick={() => setNotifOpen(true)} />

            <Tooltip title="Account">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200, mt: 1 } } }}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null); }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>

          {/* Real-time Notification Panel */}
          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            notifications={notif.notifications}
            unreadCount={notif.unreadCount}
            loading={notif.loading}
            markRead={notif.markRead}
            markAllRead={notif.markAllRead}
            clearAll={notif.clearAll}
            deleteOne={notif.deleteOne}
          />
        </AppBar>

        {/* Page content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2, md: 3 }, backgroundColor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
