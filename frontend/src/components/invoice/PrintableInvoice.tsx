import React from 'react';

interface PrintableInvoiceProps {
  invoice: unknown;
  company: unknown;
}

const numberToWords = (n: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  const num = Math.floor(n);
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(({ invoice, company }, ref) => {
  const inv = invoice as Record<string, unknown> | null;
  const comp = company as Record<string, unknown> | null;

  if (!inv) return <div ref={ref} />;

  const customer = inv.customer as Record<string, unknown> | null;
  const items = (inv.items as Record<string, unknown>[] || []);
  const grandTotal = Number(inv.grandTotal || 0);
  const overallDiscountAmt = Number(inv.discountAmount || 0);

  // Reconstruct taxable amount if not provided
  const processedItems = items.map(item => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const discount = Number(item.discount || 0);
    const cgst = Number(item.cgst || 0);
    const sgst = Number(item.sgst || 0);
    
    const taxable = rate * qty * (1 - discount / 100);
    const cgstAmt = taxable * (cgst / 100);
    const sgstAmt = taxable * (sgst / 100);
    const gstAmt = cgstAmt + sgstAmt;
    
    return {
      ...item,
      taxable,
      cgstAmt,
      sgstAmt,
      gstAmt
    };
  });

  const totalQty = processedItems.reduce((s, i) => s + Number(i.qty || 0), 0);
  const totalDisAmt = processedItems.reduce((s, i) => s + (Number(i.rate || 0) * Number(i.qty || 0) * (Number(i.discount || 0) / 100)), 0);

  // Group by GST rate
  const gstSummary = processedItems.reduce((acc, item) => {
    const rate = Number(item.cgst || 0) + Number(item.sgst || 0);
    if (!acc[rate]) acc[rate] = { taxable: 0, cgstAmt: 0, sgstAmt: 0, gstAmt: 0 };
    acc[rate].taxable += item.taxable;
    acc[rate].cgstAmt += item.cgstAmt;
    acc[rate].sgstAmt += item.sgstAmt;
    acc[rate].gstAmt += item.gstAmt;
    return acc;
  }, {} as Record<number, { taxable: number; cgstAmt: number; sgstAmt: number; gstAmt: number }>);

  // Default rows to show for standard GST slabs even if 0
  const standardRates = [5, 12, 18, 28];
  standardRates.forEach(r => {
    if (!gstSummary[r]) gstSummary[r] = { taxable: 0, cgstAmt: 0, sgstAmt: 0, gstAmt: 0 };
  });

  const totalTaxable = Object.values(gstSummary).reduce((s, v) => s + v.taxable, 0);
  const totalCgstAmt = Object.values(gstSummary).reduce((s, v) => s + v.cgstAmt, 0);
  const totalSgstAmt = Object.values(gstSummary).reduce((s, v) => s + v.sgstAmt, 0);
  const totalGstAmt = Object.values(gstSummary).reduce((s, v) => s + v.gstAmt, 0);

  return (
    <div ref={ref}>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
        }
        .invoice-container {
          font-family: Arial, sans-serif;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
          width: 100%;
          border: 1px solid #000;
          box-sizing: border-box;
        }
        .header-table, .main-table, .footer-table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-table td {
          border-bottom: 1px solid #000;
          padding: 4px;
          vertical-align: top;
        }
        .header-table td:not(:last-child) {
          border-right: 1px solid #000;
        }
        .main-table th, .main-table td {
          border: 1px solid #000;
          padding: 3px 4px;
          text-align: center;
        }
        .main-table th {
          font-weight: bold;
        }
        .main-table td.text-left { text-align: left; }
        .main-table td.text-right { text-align: right; }
        .main-table-body {
          min-height: 250px;
        }
        .footer-summary {
          width: 100%;
          border-collapse: collapse;
        }
        .footer-summary th, .footer-summary td {
          border: 1px solid #000;
          padding: 2px 4px;
          text-align: right;
        }
        .footer-summary th { text-align: center; font-weight: bold; }
        .bottom-section {
          display: flex;
          border-top: 1px solid #000;
        }
        .terms-section {
          flex: 1;
          padding: 4px;
          border-right: 1px solid #000;
        }
        .sig-section {
          width: 250px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
        }
        .stamp-img {
          width: 80px;
          height: 80px;
          margin: 6px auto;
          opacity: 0.9;
        }
        .bold { font-weight: bold; }
        .blue-text { color: #000080; }
      `}</style>
      
      <div className="invoice-container">
        {/* HEADER SECTION */}
        <table className="header-table">
          <tbody>
            <tr>
              <td style={{ width: '30%' }}>
                <div className="bold blue-text" style={{ fontSize: '12px' }}>{comp?.name as string || 'COMPANY NAME'}</div>
                <div>{comp?.address as string || 'Company Address'}</div>
                <div>Phone : {comp?.phone as string}</div>
                <div>D.L.No. : {comp?.dlNo as string}</div>
                <div>GSTIN : <span className="bold">{comp?.gstin as string}</span></div>
              </td>
              <td style={{ width: '40%', padding: 0 }}>
                <div className="bold" style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '2px', fontSize: '11px' }}>
                  GST INVOICE
                </div>
                <div style={{ display: 'flex', padding: '4px' }}>
                  <div style={{ flex: 1 }}>
                    <div><span className="bold">Invoice No</span> : {inv.invoiceNo as string}</div>
                    <div><span className="bold">Invoice Date</span>: {inv.invoiceDate ? new Date(inv.invoiceDate as string).toLocaleDateString('en-GB').split('/').join('-') : ''}</div>
                    <div>Due Date : {inv.dueDate ? new Date(inv.dueDate as string).toLocaleDateString('en-GB').split('/').join('-') : ''}</div>
                    <div>Order No. : {inv.orderNo as string}</div>
                    <div>Order Date : {inv.orderDate ? new Date(inv.orderDate as string).toLocaleDateString('en-GB').split('/').join('-') : ''}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>Transport : {inv.transport as string}</div>
                    <div>L.R. No. : {inv.lrNumber as string}</div>
                    <div>L.R. Date : </div>
                    <div>Cases : </div>
                    <div>E-Way Bill : {inv.ewayBill as string}</div>
                  </div>
                </div>
              </td>
              <td style={{ width: '30%' }}>
                <div>Party Name :</div>
                <div className="bold">{customer?.name as string || 'CASH CUSTOMER'}</div>
                <div>{customer?.address as string}</div>
                <div>PHONE : {customer?.phone as string}</div>
                <div>D.L.No. : {customer?.dlNo as string}</div>
                <div>GSTIN : {customer?.gstin as string}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ITEMS SECTION */}
        <table className="main-table" style={{ borderTop: 'none', borderBottom: 'none' }}>
          <thead>
            <tr>
              <th style={{ width: '3%' }}>S.N</th>
              <th style={{ width: '5%' }}>Qty.</th>
              <th style={{ width: '4%' }}>Free</th>
              <th style={{ width: '6%' }}>Pack</th>
              <th style={{ width: '25%' }} className="text-left">Product Name</th>
              <th style={{ width: '10%' }}>Batch</th>
              <th style={{ width: '5%' }}>Exp</th>
              <th style={{ width: '8%' }}>HSN</th>
              <th style={{ width: '5%' }}>M.R.P</th>
              <th style={{ width: '5%' }}>Rate</th>
              <th style={{ width: '4%' }}>DIS</th>
              <th style={{ width: '4%' }}>SGST</th>
              <th style={{ width: '4%' }}>CGST</th>
              <th style={{ width: '6%' }}>GST Value</th>
              <th style={{ width: '6%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {processedItems.map((item, i) => {
              const med = item.medicine as Record<string, unknown> | null;
              return (
                <tr key={i}>
                  <td>{i + 1}.</td>
                  <td>{item.qty as number}</td>
                  <td>{item.free as number || 0}</td>
                  <td>{item.pack as string || (med?.pack as string) || '-'}</td>
                  <td className="text-left bold">{med?.name as string || item.medicineName as string}</td>
                  <td>{item.batchNo as string}</td>
                  <td>{item.expiryDate ? new Date(item.expiryDate as string).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }).replace('/', '/') : ''}</td>
                  <td>{item.hsnCode as string || med?.hsnCode as string || ''}</td>
                  <td className="text-right">{Number(item.mrp || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(item.discount || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(item.sgst || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(item.cgst || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(item.gstAmt || 0).toFixed(2)}</td>
                  <td className="text-right bold">{Number(item.amount || 0).toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Fill empty space if few items */}
            {Array.from({ length: Math.max(0, 10 - processedItems.length) }).map((_, i) => (
              <tr key={'empty-' + i} style={{ color: 'transparent' }}>
                <td>-</td><td>-</td><td>-</td><td>-</td><td className="text-left">-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* GST SUMMARY SECTION */}
        <table className="footer-summary" style={{ borderTop: '2px solid #000' }}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>CLASS</th>
              <th style={{ width: '10%' }}>TOTAL</th>
              <th style={{ width: '8%' }}>SCHEME</th>
              <th style={{ width: '8%' }}>DISCOUNT</th>
              <th style={{ width: '8%' }}>SGST</th>
              <th style={{ width: '8%' }}>CGST</th>
              <th style={{ width: '10%' }}>TOTAL GST</th>
              <th style={{ borderTop: 'none', borderBottom: 'none', width: '20%' }}></th>
              <th style={{ width: '10%' }}>TOTAL</th>
              <th style={{ width: '8%' }}>{totalTaxable.toFixed(2)}</th>
            </tr>
          </thead>
          <tbody>
            {standardRates.map(rate => (
              <tr key={rate}>
                <td style={{ textAlign: 'left' }}>GST {rate.toFixed(2)}%</td>
                <td>{gstSummary[rate].taxable.toFixed(2)}</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>{gstSummary[rate].sgstAmt.toFixed(2)}</td>
                <td>{gstSummary[rate].cgstAmt.toFixed(2)}</td>
                <td>{gstSummary[rate].gstAmt.toFixed(2)}</td>
                {rate === standardRates[0] && (
                  <td rowSpan={4} style={{ borderTop: 'none', borderBottom: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                    Total Items :- <span style={{ marginLeft: 20 }}>{processedItems.length}</span><br />
                    Total Qty :- <span style={{ marginLeft: 30 }}>{totalQty}</span>
                  </td>
                )}
                {rate === standardRates[0] && <td style={{ textAlign: 'left' }}>DIS AMT.</td>}
                {rate === standardRates[0] && <td>{totalDisAmt.toFixed(2)}</td>}
                {rate === standardRates[1] && <td style={{ textAlign: 'left' }}>BILL DISC.</td>}
                {rate === standardRates[1] && <td>{overallDiscountAmt.toFixed(2)}</td>}
                {rate === standardRates[2] && <td style={{ textAlign: 'left' }}>SGST PAYBLE</td>}
                {rate === standardRates[2] && <td>{totalSgstAmt.toFixed(2)}</td>}
                {rate === standardRates[3] && <td style={{ textAlign: 'left' }}>CGST PAYBLE</td>}
                {rate === standardRates[3] && <td>{totalCgstAmt.toFixed(2)}</td>}
              </tr>
            ))}
            <tr>
              <td className="bold" style={{ textAlign: 'left' }}>TOTAL</td>
              <td className="bold">{totalTaxable.toFixed(2)}</td>
              <td>0.00</td>
              <td>0.00</td>
              <td>{totalSgstAmt.toFixed(2)}</td>
              <td>{totalCgstAmt.toFixed(2)}</td>
              <td>{totalGstAmt.toFixed(2)}</td>
              <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
              <td className="bold" style={{ textAlign: 'left' }}>Grand Total</td>
              <td className="bold" style={{ fontSize: '12px' }}>{grandTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={10} style={{ textAlign: 'left', borderTop: '1px solid #000', padding: '2px 4px' }}>
                Rs. {numberToWords(grandTotal)} Rupees Only
              </td>
            </tr>
          </tbody>
        </table>

        {/* BOTTOM SECTION */}
        <div className="bottom-section">
          <div className="terms-section">
            <div style={{ textDecoration: 'underline' }}>Terms & Conditions</div>
            <div>Goods once sold will not be taken back or exchanged.</div>
            <div>All disputes subject to Jurisdiction only.</div>
            <div>Bills not paid due date will attract 24% interest.</div>
            <div style={{ textDecoration: 'underline', marginTop: '4px' }}>Bank Details</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>Bank Name : {comp?.bankName as string || 'Bank Of India'}</div>
              <div>A/C No. : {comp?.accountNo as string || '777140000006'}</div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>IFSC Code : {comp?.ifscCode as string || 'BIN0537594'}</div>
              <div>Branch : {comp?.branchName as string || 'Demo-586101'}</div>
            </div>
            <div>Account Name : {comp?.accountName as string || (comp?.name as string) || 'COMPANY NAME'}</div>
          </div>
          <div className="sig-section">
            <div className="bold" style={{ marginTop: '6px' }}>FOR {comp?.name as string || 'COMPANY NAME'}</div>
            <img src="/stamp.svg" alt="Company Stamp" className="stamp-img" />
            <div style={{ marginBottom: '4px', borderTop: '1px solid #000', paddingTop: '3px', width: '90%' }}>Authorised Signatory</div>
          </div>
        </div>

        {/* BRANDED FOOTER */}
        <div style={{
          borderTop: '1px solid #ccc',
          textAlign: 'center',
          padding: '4px 8px',
          background: '#f9f9f9',
        }}>
          <span style={{ fontSize: '9px', color: '#444', fontFamily: 'Arial, sans-serif' }}>
            <strong>MedNex</strong>
            <span style={{ margin: '0 6px', color: '#999' }}>|</span>
            <span style={{ fontSize: '8px', color: '#888' }}>Powered by <strong>VayuNex Solution</strong></span>
          </span>
        </div>

      </div>
    </div>
  );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;
