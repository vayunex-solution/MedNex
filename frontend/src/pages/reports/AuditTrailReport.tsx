import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  CircularProgress, Autocomplete, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { FileDownload, Info } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { auditTrailService } from '../../services';

const MODULES = ['Sales', 'Purchase', 'Finance', 'Users', 'Tenants', 'Medicines'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CANCEL'];

const AuditTrailReport: React.FC = () => {
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
    actionType: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-audit-trail', params],
    queryFn: () => auditTrailService.getReport(params)
  });

  const logs = data?.data?.data || [];

  const handleSearch = () => {
    setParams({
      from: from ? from.format('YYYY-MM-DD') : '',
      to: to ? to.format('YYYY-MM-DD') : '',
      moduleName: selectedModule || '',
      actionType: selectedAction || ''
    });
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map((log: any) => ({
      Timestamp: new Date(log.createdAt).toLocaleString('en-IN'),
      User: log.user?.name || 'System',
      Action: log.action,
      Module: log.module,
      Details: log.details,
      IPAddress: log.ipAddress
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, 'Audit_Trail_Report.xlsx');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'error';
      case 'CANCEL': return 'default';
      default: return 'primary';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>Audit Trail Report</Typography>
        <Typography variant="body2" color="text.secondary">
          Track and review platform and transaction activities.
        </Typography>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <DatePicker label="From Date" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <DatePicker label="To Date" value={to} onChange={setTo} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Autocomplete
                  size="small"
                  options={MODULES}
                  value={selectedModule}
                  onChange={(_, val) => setSelectedModule(val)}
                  renderInput={(params) => <TextField {...params} label="Module" />}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Autocomplete
                  size="small"
                  options={ACTIONS}
                  value={selectedAction}
                  onChange={(_, val) => setSelectedAction(val)}
                  renderInput={(params) => <TextField {...params} label="Action" />}
                />
              </Grid>
              <Grid item xs={12} sm={2} sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" fullWidth onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={20} /> : 'Search'}
                </Button>
                <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport}>Export</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </LocalizationProvider>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover', '& th': { fontWeight: 700, fontSize: '0.78rem' } }}>
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
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No audit trail logs found</TableCell></TableRow>
            ) : logs.map((log: any) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontSize: '0.78rem' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{log.user?.name || 'System'}</TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" color={getActionColor(log.action) as any} variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 700 }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500 }}>{log.module}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem', maxWidth: 450 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                      {log.details ? log.details.split('\n')[0] : ''}
                    </Typography>
                    {log.details && (log.details.includes('\n') || log.details.length > 50) && (
                      <IconButton size="small" color="primary" onClick={() => { setSelectedLog(log); setOpenDialog(true); }}>
                        <Info fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Audit Detail Modal Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Audit Log Details</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Performed By</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedLog.user?.name || 'System'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body2">{selectedLog.ipAddress}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Module / Action</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedLog.module} - {selectedLog.action}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</Typography>
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary">Description & Changes</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'action.hover', maxHeight: 300, overflowY: 'auto' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}>
                  {selectedLog.details}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailReport;
