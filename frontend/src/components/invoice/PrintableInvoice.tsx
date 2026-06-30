import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Divider } from '@mui/material';

interface PrintableInvoiceProps {
  invoice: unknown;
  company: unknown;
}

const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(({ invoice, company }, ref) => {
  const inv = invoice as Record<string, unknown> | null;
  const comp = company as Record<string, unknown> | null;

  if (!inv) return <div ref={ref} />;

  const customer = inv.customer as Record<string, unknown> | null;
  const items = (inv.items as Record<string, unknown>[] || []);
  const grandTotal = inv.grandTotal as number || 0;

  return (
    <Box ref={ref} sx={{
      p: 4, bgcolor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif',
      fontSize: '11px', minHeight: '100vh',
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '2px solid #1565C0', pb: 2 }}>
        <Typography variant="h5" sx={{ color: '#1565C0', fontSize: '20px', fontWeight: 800 }}>
          {comp?.name as string || 'MediBill Pro Pharmacy'}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '11px' }}>{comp?.address as string}</Typography>
        <Typography variant="body2" sx={{ fontSize: '11px' }}>
          Phone: {comp?.phone as string} | GSTIN: {comp?.gstin as string}
        </Typography>
        <Typography variant="h6" sx={{ mt: 1, color: '#1565C0', fontWeight: 700 }}>TAX INVOICE</Typography>
      </Box>

      {/* Invoice Details */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1, border: '1px solid #ddd', p: 1.5, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Bill To:</Typography>
          <Typography>{customer?.name as string || 'Walk-in Customer'}</Typography>
          {customer?.address && <Typography variant="body2">{customer.address as string}</Typography>}
          {customer?.gstin && <Typography variant="body2">GSTIN: {customer.gstin as string}</Typography>}
          {customer?.phone && <Typography variant="body2">Phone: {customer.phone as string}</Typography>}
        </Box>
        <Box sx={{ flex: 1, border: '1px solid #ddd', p: 1.5, borderRadius: 1 }}>
          {[
            { label: 'Invoice No', value: inv.invoiceNo },
            { label: 'Date', value: inv.invoiceDate ? new Date(inv.invoiceDate as string).toLocaleDateString('en-IN') : '' },
            { label: 'Payment', value: inv.paymentMode },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>{label}:</Typography>
              <Typography>{value as string}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Items Table */}
      <Table size="small" sx={{ border: '1px solid #ddd', mb: 2 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#1565C0', '& th': { color: '#fff', fontWeight: 700, fontSize: '10px', py: 0.5 } }}>
            <TableCell>#</TableCell>
            <TableCell>Medicine</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">MRP</TableCell>
            <TableCell align="right">Rate</TableCell>
            <TableCell align="right">Disc%</TableCell>
            <TableCell align="right">CGST%</TableCell>
            <TableCell align="right">SGST%</TableCell>
            <TableCell align="right">Tax</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, i) => {
            const med = item.medicine as Record<string, unknown> | null;
            return (
              <TableRow key={i} sx={{ '& td': { fontSize: '10px', py: 0.3, borderBottom: '1px solid #eee' } }}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{med?.name as string || item.medicineName as string}</TableCell>
                <TableCell>{item.batchNo as string}</TableCell>
                <TableCell>{item.expiryDate ? new Date(item.expiryDate as string).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : ''}</TableCell>
                <TableCell align="right">{item.qty as number}</TableCell>
                <TableCell align="right">₹{(item.mrp as number || 0).toFixed(2)}</TableCell>
                <TableCell align="right">₹{(item.rate as number || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{item.discount as number || 0}%</TableCell>
                <TableCell align="right">{item.cgst as number || 0}%</TableCell>
                <TableCell align="right">{item.sgst as number || 0}%</TableCell>
                <TableCell align="right">₹{(item.gstAmount as number || 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>₹{(item.amount as number || 0).toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Totals */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ width: 280 }}>
          {[
            { label: 'Subtotal', value: inv.subtotal as number || 0 },
            { label: 'CGST', value: inv.cgstAmount as number || 0 },
            { label: 'SGST', value: inv.sgstAmount as number || 0 },
            { label: 'Round Off', value: inv.roundOff as number || 0 },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
              <Typography sx={{ fontSize: '11px' }}>{label}:</Typography>
              <Typography sx={{ fontSize: '11px' }}>₹{value.toFixed(2)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#1565C0', color: '#fff', p: 0.5, borderRadius: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>Grand Total</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>₹{grandTotal.toFixed(2)}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #ddd' }}>
        <Box>
          <Typography sx={{ fontSize: '10px' }}>Terms: {inv.notes as string || 'Goods once sold will not be returned.'}</Typography>
          <Typography sx={{ fontSize: '10px', mt: 1 }}>E. & O.E.</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ width: 120, height: 40, border: '1px solid #aaa', mb: 0.5 }} />
          <Typography sx={{ fontSize: '10px' }}>Authorized Signature</Typography>
        </Box>
      </Box>
    </Box>
  );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;
