const { sequelize, Store, Rack, MedicineCategory, MedicineCompany, HsnCode, GstSlab, Unit, Medicine, Supplier, Customer, Doctor, Batch, SaleInvoice, SaleItem } = require('../src/models');

async function seedData() {
  try {
    console.log('Starting to seed demo data...');

    // Get basic dependencies
    const store = await Store.findOne() || await Store.create({ name: 'Main Pharmacy Store', address: '123 Health Ave' });
    const rack1 = await Rack.findOne({ where: { name: 'Rack A' } }) || await Rack.create({ name: 'Rack A', storeId: store.id });
    const rack2 = await Rack.findOne({ where: { name: 'Rack B' } }) || await Rack.create({ name: 'Rack B', storeId: store.id });

    // HSN Codes
    const hsn1 = await HsnCode.findOne({ where: { hsnCode: '3004' } }) || await HsnCode.create({ hsnCode: '3004', description: 'Medicaments', gstRate: 12 });
    const hsn2 = await HsnCode.findOne({ where: { hsnCode: '3005' } }) || await HsnCode.create({ hsnCode: '3005', description: 'Bandages', gstRate: 5 });

    // Categories
    const catTab = await MedicineCategory.findOne({ where: { name: 'Tablets' } }) || await MedicineCategory.create({ name: 'Tablets' });
    const catSyp = await MedicineCategory.findOne({ where: { name: 'Syrups' } }) || await MedicineCategory.create({ name: 'Syrups' });
    const catInj = await MedicineCategory.findOne({ where: { name: 'Injections' } }) || await MedicineCategory.create({ name: 'Injections' });

    // Companies
    const compCipla = await MedicineCompany.findOne({ where: { name: 'Cipla Ltd' } }) || await MedicineCompany.create({ name: 'Cipla Ltd', phone: '9876543210' });
    const compSun = await MedicineCompany.findOne({ where: { name: 'Sun Pharma' } }) || await MedicineCompany.create({ name: 'Sun Pharma', phone: '9876543211' });

    // Dependencies from server.js seeding
    const unitTab = await Unit.findOne({ where: { shortName: 'TAB' } });
    const unitSyp = await Unit.findOne({ where: { shortName: 'SYP' } });
    const gst12 = await GstSlab.findOne({ where: { slab: '12%' } });
    
    if (!unitTab || !gst12) {
      console.error('Please ensure the server has started at least once to seed Units and GST Slabs.');
      process.exit(1);
    }

    // Suppliers & Customers
    const supplier = await Supplier.findOne({ where: { name: 'Apollo Distributors' } }) || await Supplier.create({ name: 'Apollo Distributors', mobile: '9988776655' });
    const customer = await Customer.findOne({ where: { name: 'Walk-in Customer' } }) || await Customer.create({ name: 'Walk-in Customer', mobile: '0000000000' });
    const doctor = await Doctor.findOne({ where: { name: 'Dr. Smith' } }) || await Doctor.create({ name: 'Dr. Smith', specialization: 'General Physician' });

    // Medicines
    const med1 = await Medicine.findOne({ where: { name: 'Dolo 650mg' } }) || await Medicine.create({
      name: 'Dolo 650mg', genericName: 'Paracetamol',
      companyId: compCipla.id, categoryId: catTab.id, hsnId: hsn1.id, gstSlabId: gst12.id,
      rackId: rack1.id, unitId: unitTab.id, barcode: '8901234567890',
      mrp: 30.50, purchaseRate: 20.00, saleRate: 30.50, minStock: 100
    });

    const med2 = await Medicine.findOne({ where: { name: 'Corex Syrup 100ml' } }) || await Medicine.create({
      name: 'Corex Syrup 100ml', genericName: 'Cough Syrup',
      companyId: compSun.id, categoryId: catSyp.id, hsnId: hsn1.id, gstSlabId: gst12.id,
      rackId: rack2.id, unitId: unitSyp.id, barcode: '8901234567891',
      mrp: 120.00, purchaseRate: 90.00, saleRate: 120.00, minStock: 50
    });

    // Batches
    const batch1 = await Batch.findOne({ where: { batchNo: 'B-1001' } }) || await Batch.create({
      medicineId: med1.id, batchNo: 'B-1001', expiryDate: '2028-12-31',
      qty: 500, mrp: 30.50, purchaseRate: 20.00, saleRate: 30.50, supplierId: supplier.id
    });

    const batch2 = await Batch.findOne({ where: { batchNo: 'B-1002' } }) || await Batch.create({
      medicineId: med2.id, batchNo: 'B-1002', expiryDate: '2027-06-30',
      qty: 150, mrp: 120.00, purchaseRate: 90.00, saleRate: 120.00, supplierId: supplier.id
    });

    // Dummy Sale
    const sale = await SaleInvoice.findOne({ where: { invoiceNo: 'INV-DEMO-01' } }) || await SaleInvoice.create({
      invoiceNo: 'INV-DEMO-01', customerId: customer.id, doctorId: doctor.id,
      invoiceDate: new Date(), subtotal: 150.50, taxAmount: 18.06, grandTotal: 168.56, status: 'completed'
    });

    const saleItem1 = await SaleItem.findOne({ where: { saleId: sale.id, medicineId: med1.id } }) || await SaleItem.create({
      saleId: sale.id, medicineId: med1.id, batchId: batch1.id, batchNo: batch1.batchNo,
      qty: 1, mrp: 30.50, rate: 30.50, amount: 30.50
    });

    const saleItem2 = await SaleItem.findOne({ where: { saleId: sale.id, medicineId: med2.id } }) || await SaleItem.create({
      saleId: sale.id, medicineId: med2.id, batchId: batch2.id, batchNo: batch2.batchNo,
      qty: 1, mrp: 120.00, rate: 120.00, amount: 120.00
    });

    console.log('Demo data seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding demo data:', error);
    process.exit(1);
  }
}

seedData();
