import React from 'react';
import {
  Box, Drawer, Typography, IconButton, Divider, List, ListItem,
  ListItemAvatar, Avatar, ListItemText, Badge, Tooltip, Chip,
  Button, Stack, CircularProgress, Fade,
} from '@mui/material';
import {
  Notifications, Close, DoneAll, DeleteSweep, Delete,
  ShoppingCart, Receipt, Inventory, Warning, Settings, Update,
  Circle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../hooks/useNotifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  sale:       { icon: <Receipt fontSize="small" />,      color: '#4caf50', bg: '#e8f5e9' },
  purchase:   { icon: <ShoppingCart fontSize="small" />, color: '#2196f3', bg: '#e3f2fd' },
  low_stock:  { icon: <Inventory fontSize="small" />,    color: '#ff9800', bg: '#fff3e0' },
  expiry:     { icon: <Warning fontSize="small" />,      color: '#f44336', bg: '#fce4ec' },
  update:     { icon: <Update fontSize="small" />,       color: '#9c27b0', bg: '#f3e5f5' },
  system:     { icon: <Settings fontSize="small" />,     color: '#607d8b', bg: '#eceff1' },
};

export const timeAgo = (dateStr: string) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Bell Button ──────────────────────────────────────────────────────────────
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}
export const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => (
  <Tooltip title="Notifications">
    <IconButton onClick={onClick}>
      <Badge
        badgeContent={unreadCount > 99 ? '99+' : unreadCount}
        color="error"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.65rem',
            fontWeight: 700,
            animation: unreadCount > 0 ? 'bell-pulse 1.8s ease-in-out infinite' : 'none',
            '@keyframes bell-pulse': {
              '0%':   { transform: 'scale(1)' },
              '50%':  { transform: 'scale(1.25)' },
              '100%': { transform: 'scale(1)' },
            },
          },
        }}
      >
        <Notifications />
      </Badge>
    </IconButton>
  </Tooltip>
);

// ─── Notification Item ────────────────────────────────────────────────────────
interface NotifItemProps {
  notif: AppNotification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (link?: string) => void;
}
const NotifItem: React.FC<NotifItemProps> = ({ notif, onMarkRead, onDelete, onNavigate }) => {
  const cfg = typeConfig[notif.type] || typeConfig.system;
  return (
    <Fade in>
      <ListItem
        alignItems="flex-start"
        sx={{
          px: 2, py: 1.5,
          cursor: notif.link ? 'pointer' : 'default',
          bgcolor: notif.isRead ? 'transparent' : 'action.hover',
          borderLeft: notif.isRead ? '3px solid transparent' : `3px solid ${cfg.color}`,
          transition: 'all 0.2s',
          '&:hover': { bgcolor: 'action.selected' },
        }}
        onClick={() => {
          if (!notif.isRead) onMarkRead(notif.id);
          if (notif.link) onNavigate(notif.link);
        }}
      >
        <ListItemAvatar sx={{ minWidth: 44 }}>
          <Avatar sx={{ bgcolor: cfg.bg, color: cfg.color, width: 36, height: 36 }}>
            {cfg.icon}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography
                variant="body2"
                fontWeight={notif.isRead ? 400 : 700}
                noWrap
                sx={{ flex: 1 }}
              >
                {notif.title}
              </Typography>
              {!notif.isRead && <Circle sx={{ fontSize: 8, color: cfg.color, flexShrink: 0 }} />}
            </Box>
          }
          secondary={
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', lineHeight: 1.4 }}
              >
                {notif.message}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {timeAgo(notif.createdAt)}
              </Typography>
            </Box>
          }
        />
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
          sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </ListItem>
    </Fade>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteOne: (id: number) => Promise<void>;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open, onClose, notifications, unreadCount, loading, markRead, markAllRead, clearAll, deleteOne,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (link?: string) => {
    if (link) { navigate(link); onClose(); }
  };

  const typeGroups: Record<string, number> = {};
  notifications.forEach((n) => { typeGroups[n.type] = (typeGroups[n.type] || 0) + 1; });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 420 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5, py: 2,
          display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Notifications color="primary" />
        </Badge>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Notifications
        </Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      {/* Type filter chips */}
      {notifications.length > 0 && (
        <Box
          sx={{
            px: 2, py: 1,
            display: 'flex', gap: 0.75, flexWrap: 'wrap',
            borderBottom: 1, borderColor: 'divider',
          }}
        >
          {Object.entries(typeGroups).map(([type, count]) => {
            const cfg = typeConfig[type] || typeConfig.system;
            return (
              <Chip
                key={type}
                icon={<Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>}
                label={`${type.replace('_', ' ')} (${count})`}
                size="small"
                sx={{ fontSize: '0.7rem', textTransform: 'capitalize', bgcolor: cfg.bg, color: cfg.color }}
              />
            );
          })}
        </Box>
      )}

      {/* Bulk actions */}
      {notifications.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider' }}
        >
          {unreadCount > 0 && (
            <Button size="small" startIcon={<DoneAll />} onClick={markAllRead} sx={{ fontSize: '0.72rem' }}>
              Mark all read
            </Button>
          )}
          <Button
            size="small" color="error" startIcon={<DeleteSweep />}
            onClick={clearAll} sx={{ fontSize: '0.72rem' }}
          >
            Clear all
          </Button>
        </Stack>
      )}

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress size={32} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box
            display="flex" flexDirection="column"
            alignItems="center" justifyContent="center"
            height="260px" gap={1.5}
          >
            <Notifications sx={{ fontSize: 56, color: 'text.disabled', opacity: 0.4 }} />
            <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
            <Typography variant="caption" color="text.disabled">
              New sales & purchases will appear here in real-time
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((n, idx) => (
              <Box key={n.id}>
                <NotifItem
                  notif={n}
                  onMarkRead={markRead}
                  onDelete={deleteOne}
                  onNavigate={handleNavigate}
                />
                {idx < notifications.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2, py: 1.5,
          borderTop: 1, borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.disabled">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''} •{' '}
          <span style={{ color: '#4caf50' }}>● Live</span> real-time via SSE
        </Typography>
      </Box>
    </Drawer>
  );
};

export default NotificationPanel;
