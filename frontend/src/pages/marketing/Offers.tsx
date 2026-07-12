import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Grid, Select, MenuItem, InputLabel, FormControl,
  CircularProgress, Alert, Switch
} from '@mui/material';
import { Add, Refresh, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { offerService } from '../../services';

const Offers: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // States
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    minBillAmount: '',
    holderType: 'General',
    startDate: '',
    endDate: '',
  });

  // Fetch Promotions
  const { data: offers = [], isLoading, refetch } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => offerService.list(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => offerService.create(data),
    onSuccess: () => {
      enqueueSnackbar('Promotion rules created successfully!', { variant: 'success' });
      setOpenDialog(false);
      setFormData({
        name: '', description: '', type: 'percentage', value: '', minBillAmount: '',
        holderType: 'General', startDate: '', endDate: ''
      });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create promotion', { variant: 'error' });
    }
  });

  // Toggle status
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => offerService.toggleStatus(id, isActive),
    onSuccess: () => {
      enqueueSnackbar('Promotion status updated', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => offerService.remove(id),
    onSuccess: () => {
      enqueueSnackbar('Promotion deleted', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
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
          <Typography variant="h5" fontWeight={700}>Offers &amp; Promotions Engine</Typography>
          <Typography variant="body2" color="text.secondary">Configure generic customer discounts, category promotions, festival offers and loyalty plans.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Create Offer
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Active Offers</Typography>
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={30} /></Box>
          ) : offers.length === 0 ? (
            <Alert severity="info">No active promotions found. Create an offer rule to apply discounts at checkout.</Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Promotion Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Min Bill</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target Holder</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.map((o: any) => (
                    <TableRow key={o.id} hover>
                      <TableCell fontWeight={600}>{o.name}</TableCell>
                      <TableCell><Chip label={o.type} size="small" variant="outlined" /></TableCell>
                      <TableCell>{o.type === 'percentage' ? `${o.value}%` : `₹${o.value}`}</TableCell>
                      <TableCell>₹{o.minBillAmount}</TableCell>
                      <TableCell><Chip label={o.holderType} color="primary" size="small" variant="outlined" /></TableCell>
                      <TableCell>{new Date(o.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(o.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(o.isActive)}
                          size="small"
                          onChange={(e) => toggleMutation.mutate({ id: o.id, isActive: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="error" onClick={() => deleteMutation.mutate(o.id)} disabled={deleteMutation.isPending}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog ── */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Promotion Offer</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="name" label="Offer Campaign Name" fullWidth required size="small"
                  value={formData.name} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Holder Type (Segment)</InputLabel>
                  <Select
                    name="holderType" value={formData.holderType} label="Holder Type (Segment)" onChange={handleChange}
                  >
                    <MenuItem value="General">General (Festival/All)</MenuItem>
                    <MenuItem value="Senior Citizen">Senior Citizen Card</MenuItem>
                    <MenuItem value="Hospital Partner">Hospital Partner Card</MenuItem>
                    <MenuItem value="Membership Card">VIP Loyalty Member</MenuItem>
                    <MenuItem value="Employee Card">Company Employee</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    name="type" value={formData.type} label="Discount Type" onChange={handleChange}
                  >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="flat">Flat Value (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="value" label="Discount Value" fullWidth required size="small" type="number"
                  value={formData.value} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="minBillAmount" label="Min Bill Threshold (₹)" fullWidth size="small" type="number"
                  value={formData.minBillAmount} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="startDate" label="Start Date" fullWidth required size="small" type="date"
                  value={formData.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="endDate" label="End Date" fullWidth required size="small" type="date"
                  value={formData.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="description" label="Offer Notes / Criteria description" fullWidth multiline rows={2} size="small"
                  value={formData.description} onChange={handleChange}
                  placeholder="e.g. 10% Flat discount for Diwali Festival valid on bills above 1000"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create Promotion
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Offers;
