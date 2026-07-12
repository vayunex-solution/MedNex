import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  CircularProgress, Autocomplete, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  useMediaQuery, useTheme, Divider, Stack, alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  FileDownload, Info, AccessTime, Person, Category,
  Shield, Search, FilterList,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { auditTrailService } from '../../services';

const MODULES = ['Sales', 'Purchase', 'Finance', 'Users', 'Tenants', 'Medicines'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CANCEL'];

const actionConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'default' | 'primary'; bg: string; text: string }> = {
  CREATE: { color: 'success', bg: '#dcfce7', text: '#15803d' },
  UPDATE: { color: 'warning', bg: '#fef9c3', text: '#b45309' },
  DELETE: { color: 'error',   bg: '#fee2e2', text: '#dc2626' },
  CANCEL: { color: 'default', bg: '#f1f5f9', text: '#64748b' },
};

const getActionConfig = (action: string) =>
  actionConfig[action] || { color: 'primary' as const, bg: '#eff6ff', text: '#1d4ed8' };

// ─── Mobile Card ──────────────────────────────────────────────────────────────
const AuditCard: React.FC<{ log: any; onInfo: (log: any) => void }> = ({ log, onInfo }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cfg = getActionConfig(log.action);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderRadius: 2,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' },
        transition: 'box-shadow 0.2s',
      }}
    >
      <CardContent sx={{ p: '12px 14px !important' }}>
        {/* Header row: action chip + timestamp */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Chip
            label={log.action}
            size="small"
            sx={{
              bgcolor: cfg.bg,
              color: cfg.text,
              fontWeight: 800,
              fontSize: '0.65rem',
              height: 22,
              border: `1px solid ${alpha(cfg.text, 0.25)}`,
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Box display="flex" alignItems="center" gap={0.5}>
            <AccessTime sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
              {new Date(log.createdAt).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>

        {/* Module + User */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Category sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
              {log.module}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
              {log.user?.name || 'System'}
            </Typography>
          </Box>
        </Box>

        {/* Details */}
        <Divider sx={{ mb: 0.75, opacity: 0.5 }} />
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.72rem',
              lineHeight: 1.5,
              flex: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {log.details ? log.details.split('\n')[0] : '—'}
          </Typography>
          {log.details && (log.details.includes('\n') || log.details.length > 50) && (
            <IconButton
              size="small"
              color="primary"
              onClick={() => onInfo(log)}
              sx={{
                width: 28, height: 28,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                flexShrink: 0,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
              }}
            >
              <Info sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        {/* IP */}
        {log.ipAddress && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
            IP: {log.ipAddress}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AuditTrailReport: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const [params, setParams] = useState({
    from: from?.format('YYYY-MM-DD'),
    to: to?.format('YYYY-MM-DD'),
    moduleName: '',
    actionType: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-audit-trail', params],
    queryFn: () => auditTrailService.getReport(params),
  });

  const logs = data?.data?.data || [];

  const handleSearch = () => {
    setParams({
      from: from ? from.format('YYYY-MM-DD') : '',
      to: to ? to.format('YYYY-MM-DD') : '',
      moduleName: selectedModule || '',
      actionType: selectedAction || '',
    });
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map((log: any) => ({
      Timestamp: new Date(log.createdAt).toLocaleString('en-IN'),
      User: log.user?.name || 'System',
      Action: log.action,
      Module: log.module,
      Details: log.details,
      IPAddress: log.ipAddress,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, 'Audit_Trail_Report.xlsx');
  };

  const handleInfo = (log: any) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  return (
    <Box sx={{ pb: { xs: 2, sm: 0 } }}>
      {/* Page Header */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Shield sx={{ color: 'primary.main', fontSize: { xs: 22, sm: 26 } }} />
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={800}>
            Audit Trail
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
          Track and review platform and transaction activities.
        </Typography>
      </Box>

      {/* ── Filter Card ──────────────────────────────────────────────── */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Card sx={{ mb: 2.5, borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: '14px !important', sm: '16px !important' } }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={6} sm={3}>
                <DatePicker
                  label="From Date"
                  value={from}
                  onChange={setFrom}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { '& .MuiInputBase-input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <DatePicker
                  label="To Date"
                  value={to}
                  onChange={setTo}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { '& .MuiInputBase-input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <Autocomplete
                  size="small"
                  options={MODULES}
                  value={selectedModule}
                  onChange={(_, val) => setSelectedModule(val)}
                  renderInput={(p) => (
                    <TextField
                      {...p}
                      label="Module"
                      sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <Autocomplete
                  size="small"
                  options={ACTIONS}
                  value={selectedAction}
                  onChange={(_, val) => setSelectedAction(val)}
                  renderInput={(p) => (
                    <TextField
                      {...p}
                      label="Action"
                      sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSearch}
                    disabled={isLoading}
                    startIcon={isLoading ? undefined : <Search sx={{ fontSize: '16px !important' }} />}
                    size={isMobile ? 'medium' : 'small'}
                    sx={{ fontWeight: 700 }}
                  >
                    {isLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Search'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleExport}
                    size={isMobile ? 'medium' : 'small'}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    <FileDownload sx={{ fontSize: 18 }} />
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </LocalizationProvider>

      {/* ── Results Count ────────────────────────────────────────────── */}
      {!isLoading && logs.length > 0 && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Showing <strong>{logs.length}</strong> records
          </Typography>
          {isMobile && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <FilterList sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                Tap <Info sx={{ fontSize: 12, verticalAlign: 'middle' }} /> for details
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── MOBILE: Card List ────────────────────────────────────────── */}
      {isMobile ? (
        <Box>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={6} gap={2} flexDirection="column">
              <CircularProgress size={28} />
              <Typography variant="caption" color="text.disabled">Loading logs...</Typography>
            </Box>
          ) : logs.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 5 }}>
              <Shield sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.3, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">No audit trail logs found</Typography>
            </Card>
          ) : (
            logs.map((log: any) => (
              <AuditCard key={log.id} log={log} onInfo={handleInfo} />
            ))
          )}
        </Box>
      ) : (
        /* ── DESKTOP: Table ───────────────────────────────────────────── */
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(21,101,192,0.06)',
                '& th': { fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase' },
              }}>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>IP Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Shield sx={{ fontSize: 32, opacity: 0.2 }} />
                      No audit trail logs found
                    </Box>
                  </TableCell>
                </TableRow>
              ) : logs.map((log: any) => {
                const cfg = getActionConfig(log.action);
                return (
                  <TableRow key={log.id} hover sx={{ '& td': { fontSize: '0.78rem' } }}>
                    <TableCell sx={{ color: 'text.secondary', minWidth: 140 }}>
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{log.user?.name || 'System'}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          bgcolor: cfg.bg,
                          color: cfg.text,
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          border: `1px solid ${alpha(cfg.text, 0.25)}`,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{log.module}</TableCell>
                    <TableCell sx={{ maxWidth: 420 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.78rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 360,
                          }}
                        >
                          {log.details ? log.details.split('\n')[0] : ''}
                        </Typography>
                        {log.details && (log.details.includes('\n') || log.details.length > 50) && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleInfo(log)}
                            sx={{ flexShrink: 0 }}
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{log.ipAddress}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ── Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield color="primary" />
          Audit Log Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Performed By</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedLog.user?.name || 'System'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body2">{selectedLog.ipAddress || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Module / Action</Typography>
                  <Box display="flex" alignItems="center" gap={0.75} mt={0.25}>
                    <Typography variant="body2" fontWeight={600}>{selectedLog.module}</Typography>
                    <Chip
                      label={selectedLog.action}
                      size="small"
                      sx={{
                        bgcolor: getActionConfig(selectedLog.action).bg,
                        color: getActionConfig(selectedLog.action).text,
                        fontWeight: 800,
                        fontSize: '0.62rem',
                        height: 20,
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</Typography>
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Description &amp; Changes
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2, mt: 1,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  maxHeight: 300,
                  overflowY: 'auto',
                  borderRadius: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0, fontSize: '0.78rem' }}
                >
                  {selectedLog.details}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setOpenDialog(false)} variant="contained" fullWidth={isMobile}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailReport;
