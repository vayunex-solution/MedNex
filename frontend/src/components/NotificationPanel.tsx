import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Divider, List, ListItem,
  ListItemAvatar, Avatar, ListItemText, Badge, Tooltip, Chip,
  Button, Stack, CircularProgress, Fade, Slide,
  Paper, alpha, useTheme,
} from '@mui/material';
import {
  Notifications, Close, DoneAll, DeleteSweep, Delete,
  ShoppingCart, Receipt, Inventory, Warning, Settings, Update,
  Circle, NotificationsActive, CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../hooks/useNotifications';

// ─── Type configs ─────────────────────────────────────────────────────────────
const typeConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string; label: string }> = {
  sale:      { icon: <Receipt sx={{ fontSize: 16 }} />,      color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'Sale' },
  purchase:  { icon: <ShoppingCart sx={{ fontSize: 16 }} />, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', label: 'Purchase' },
  low_stock: { icon: <Inventory sx={{ fontSize: 16 }} />,    color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Stock' },
  expiry:    { icon: <Warning sx={{ fontSize: 16 }} />,      color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Expiry' },
  update:    { icon: <Update sx={{ fontSize: 16 }} />,       color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', label: 'Update' },
  system:    { icon: <Settings sx={{ fontSize: 16 }} />,     color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)', label: 'System' },
};

const timeAgo = (dateStr: string) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Notification Bell ────────────────────────────────────────────────────────
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => (
  <Tooltip title="Notifications">
    <IconButton onClick={onClick} sx={{ position: 'relative' }}>
      <Badge
        badgeContent={unreadCount > 99 ? '99+' : unreadCount}
        color="error"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.6rem',
            fontWeight: 800,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            animation: unreadCount > 0 ? 'badge-pulse 2s ease-in-out infinite' : 'none',
            '@keyframes badge-pulse': {
              '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
              '50%': { transform: 'scale(1.15)', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
            },
          },
        }}
      >
        {unreadCount > 0
          ? <NotificationsActive sx={{ fontSize: 22 }} />
          : <Notifications sx={{ fontSize: 22 }} />
        }
      </Badge>
    </IconButton>
  </Tooltip>
);

// ─── Single Notification Card ─────────────────────────────────────────────────
interface NotifItemProps {
  notif: AppNotification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (link?: string) => void;
}

const NotifItem: React.FC<NotifItemProps> = ({ notif, onMarkRead, onDelete, onNavigate }) => {
  const theme = useTheme();
  const cfg = typeConfig[notif.type] || typeConfig.system;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          position: 'relative',
          cursor: notif.link ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            '& .notif-delete': { opacity: 1 },
            backgroundColor: isDark ? alpha('#fff', 0.04) : alpha('#1565C0', 0.03),
          },
          '&::before': !notif.isRead ? {
            content: '""',
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 3,
            background: cfg.gradient,
            borderRadius: '0 2px 2px 0',
          } : {},
        }}
        onClick={() => {
          if (!notif.isRead) onMarkRead(notif.id);
          if (notif.link) onNavigate(notif.link);
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2.5, py: 1.5 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 38, height: 38, borderRadius: '12px',
              background: cfg.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${alpha(cfg.color, 0.35)}`,
              color: '#fff',
            }}
          >
            {cfg.icon}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
              <Typography
                variant="body2"
                fontWeight={notif.isRead ? 500 : 700}
                sx={{
                  flex: 1,
                  fontSize: '0.82rem',
                  color: notif.isRead
                    ? 'text.secondary'
                    : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {notif.title}
              </Typography>
              {!notif.isRead && (
                <Box
                  sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: cfg.gradient,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${alpha(cfg.color, 0.8)}`,
                  }}
                />
              )}
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                lineHeight: 1.5,
                fontSize: '0.74rem',
              }}
            >
              {notif.message}
            </Typography>

            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  background: alpha(cfg.color, 0.12),
                  color: cfg.color,
                  border: `1px solid ${alpha(cfg.color, 0.2)}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                {timeAgo(notif.createdAt)}
              </Typography>
            </Box>
          </Box>

          {/* Delete btn */}
          <IconButton
            className="notif-delete"
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s',
              color: 'text.disabled',
              width: 28, height: 28,
              '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.1) },
            }}
          >
            <Delete sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>
    </Fade>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <Box
    display="flex" flexDirection="column"
    alignItems="center" justifyContent="center"
    height="100%"
    sx={{ px: 3, py: 6, userSelect: 'none' }}
  >
    <Box
      sx={{
        width: 80, height: 80,
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.1))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        mb: 2.5,
        boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
      }}
    >
      <Notifications sx={{ fontSize: 36, color: 'primary.main', opacity: 0.7 }} />
    </Box>
    <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
      All caught up!
    </Typography>
    <Typography variant="caption" color="text.secondary" align="center" sx={{ lineHeight: 1.7, maxWidth: 220 }}>
      No notifications yet. New sales, purchases and system events will appear here instantly.
    </Typography>

    {/* Live indicator */}
    <Box
      display="flex" alignItems="center" gap={0.75} mt={3}
      sx={{
        px: 2, py: 0.75,
        borderRadius: 20,
        border: '1px solid',
        borderColor: alpha('#10b981', 0.3),
        bgcolor: alpha('#10b981', 0.08),
      }}
    >
      <Box
        sx={{
          width: 6, height: 6, borderRadius: '50%',
          bgcolor: '#10b981',
          animation: 'live-pulse 1.5s ease-in-out infinite',
          '@keyframes live-pulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.4, transform: 'scale(0.8)' },
          },
        }}
      />
      <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.7rem' }}>
        Live — connected via SSE
      </Typography>
    </Box>
  </Box>
);

// ─── Main Notification Panel ──────────────────────────────────────────────────
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleNavigate = (link?: string) => {
    if (link) { navigate(link); onClose(); }
  };

  const bgPaper = isDark ? '#111827' : '#ffffff';
  const bgHeader = isDark
    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    : 'linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #0288D1 100%)';

  return (
    <>
      {/* Backdrop */}
      <Fade in={open}>
        <Box
          onClick={onClose}
          sx={{
            position: 'fixed', inset: 0,
            bgcolor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1299,
            display: open ? 'block' : 'none',
          }}
        />
      </Fade>

      {/* Panel */}
      <Slide direction="left" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0,
            width: { xs: '100vw', sm: 400 },
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: bgPaper,
            boxShadow: '-8px 0 48px rgba(0,0,0,0.25)',
            borderLeft: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <Box
            sx={{
              background: bgHeader,
              px: 2.5, pt: 3.5, pb: 2.5,
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: -30, right: -30,
                width: 120, height: 120,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                bottom: -20, left: 60,
                width: 80, height: 80,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
              },
            }}
          >
            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <NotificationsActive sx={{ color: '#fff', fontSize: 22 }} />
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                    Notifications
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {unreadCount > 0 ? (
                    <Box
                      sx={{
                        px: 1.5, py: 0.25,
                        borderRadius: 20,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}>
                        {unreadCount} unread
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        px: 1.5, py: 0.25,
                        borderRadius: 20,
                        bgcolor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.72rem' }}>
                        All read ✓
                      </Typography>
                    </Box>
                  )}
                  {/* Live dot */}
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box
                      sx={{
                        width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981',
                        animation: 'panel-live 1.5s ease-in-out infinite',
                        '@keyframes panel-live': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.3 },
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                      Live
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
                  width: 32, height: 32,
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Action buttons in header */}
            {notifications.length > 0 && (
              <Stack direction="row" spacing={1} mt={2}>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<DoneAll sx={{ fontSize: 14 }} />}
                    onClick={markAllRead}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      px: 1.5, py: 0.5,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  size="small"
                  startIcon={<DeleteSweep sx={{ fontSize: 14 }} />}
                  onClick={clearAll}
                  sx={{
                    color: 'rgba(255,255,255,0.75)',
                    bgcolor: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 20,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    px: 1.5, py: 0.5,
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.28)', color: '#fff' },
                  }}
                >
                  Clear all
                </Button>
              </Stack>
            )}
          </Box>

          {/* ── Notification List ──────────────────────────────────────── */}
          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', bgcolor: bgPaper,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
              borderRadius: 4,
            },
          }}>
            {loading ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="200px" gap={2}>
                <CircularProgress size={32} thickness={3} />
                <Typography variant="caption" color="text.disabled">Loading notifications...</Typography>
              </Box>
            ) : notifications.length === 0 ? (
              <EmptyState />
            ) : (
              <Box>
                {notifications.map((n, idx) => (
                  <Box key={n.id}>
                    <NotifItem
                      notif={n}
                      onMarkRead={markRead}
                      onDelete={deleteOne}
                      onNavigate={handleNavigate}
                    />
                    {idx < notifications.length - 1 && (
                      <Divider sx={{ mx: 2.5, opacity: 0.5 }} />
                    )}
                  </Box>
                ))}

                {/* Bottom padding */}
                <Box sx={{ height: 16 }} />
              </Box>
            )}
          </Box>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <Box
            sx={{
              px: 2.5, py: 1.5,
              borderTop: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#1565C0', 0.02),
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
              {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#10b981' }} />
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                Real-time via SSE
              </Typography>
            </Box>
          </Box>
        </Box>
      </Slide>
    </>
  );
};

export default NotificationPanel;
