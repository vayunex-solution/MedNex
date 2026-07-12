import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Grid, Select, MenuItem, InputLabel, FormControl,
  CircularProgress, Alert
} from '@mui/material';
import { Add, Refresh, Send, Email } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { campaignService } from '../../services';

const Campaigns: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    segment: 'All',
  });

  // Fetch Campaigns
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
  });

  // Fetch Segment Size counts
  const { data: segments = { VIP: 0, Inactive: 0, Doctors: 0, Suppliers: 0, All: 0 }, isLoading: loadingSegments } = useQuery({
    queryKey: ['campaignSegments'],
    queryFn: () => campaignService.getSegments(),
  });

  // Create Campaign Mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => campaignService.create(data),
    onSuccess: () => {
      enqueueSnackbar('Campaign draft created successfully!', { variant: 'success' });
      setOpenDialog(false);
      setFormData({ name: '', subject: '', body: '', segment: 'All' });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create campaign', { variant: 'error' });
    }
  });

  // Trigger Send Mutation
  const sendMutation = useMutation({
    mutationFn: (id: number) => campaignService.send(id),
    onSuccess: () => {
      enqueueSnackbar('Campaign dispatch triggered! Processing emails in background.', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to dispatch campaign', { variant: 'error' });
    }
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Email Campaigns</Typography>
          <Typography variant="body2" color="text.secondary">Create and send marketing or informational emails to segmented customer lists.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Create Campaign
        </Button>
      </Box>

      {/* ── Audience Segment Cards ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { key: 'All', label: 'All Customers', count: segments.All, desc: 'Every customer with registered email' },
          { key: 'VIP', label: 'VIP Spenders', count: segments.VIP, desc: 'Lifetime spend >= ₹15,000' },
          { key: 'Inactive', label: 'Inactive Customers', count: segments.Inactive, desc: 'No billing activity in 60 days' },
          { key: 'Doctors', label: 'Doctors Network', count: segments.Doctors, desc: 'Registered medical partners' },
        ].map((seg) => (
          <Grid item xs={12} sm={3} key={seg.key}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ py: '16px !important' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                  {seg.label}
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {loadingSegments ? <CircularProgress size={20} /> : seg.count}
                  </Typography>
                  <Email sx={{ opacity: 0.15, fontSize: 32 }} />
                </Box>
                <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                  {seg.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Campaigns List ── */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Campaign List</Typography>
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={30} /></Box>
          ) : campaigns.length === 0 ? (
            <Alert severity="info">No campaigns found. Click "Create Campaign" to compile your first list.</Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Campaign Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target Segment</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sent Count</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((c: any) => (
                    <TableRow key={c.id} hover>
                      <TableCell fontWeight={600}>{c.name}</TableCell>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell><Chip label={c.segment} size="small" variant="outlined" /></TableCell>
                      <TableCell>{c.sentCount} emails</TableCell>
                      <TableCell>
                        <Chip
                          label={c.status}
                          size="small"
                          color={c.status === 'completed' ? 'success' : (c.status === 'sending' ? 'warning' : 'default')}
                        />
                      </TableCell>
                      <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        {c.status === 'draft' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Send />}
                            onClick={() => sendMutation.mutate(c.id)}
                            disabled={sendMutation.isPending}
                          >
                            Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* ── Create Campaign Dialog ── */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Email Campaign</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="name" label="Campaign Name" fullWidth required size="small"
                  value={formData.name} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Audience Segment</InputLabel>
                  <Select
                    name="segment" value={formData.segment} label="Target Audience Segment" onChange={handleChange}
                  >
                    <MenuItem value="All">All Customers</MenuItem>
                    <MenuItem value="VIP">VIP Customers</MenuItem>
                    <MenuItem value="Inactive">Inactive Customers</MenuItem>
                    <MenuItem value="Doctors">Doctors Network</MenuItem>
                    <MenuItem value="Suppliers">Suppliers</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="subject" label="Email Subject Header" fullWidth required size="small"
                  value={formData.subject} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="body" label="Email Body Message (HTML supported)" fullWidth required
                  multiline rows={8} size="small"
                  value={formData.body} onChange={handleChange}
                  placeholder="<h3>Hello Customer,</h3><p>We are offering special discounts this weekend...</p>"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Save Draft
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Campaigns;
