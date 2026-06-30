const { Supplier } = require('../src/models');

async function testSuppliers() {
  try {
    const suppliers = await Supplier.findAll();
    console.log('Suppliers:', suppliers.length);
    process.exit(0);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    process.exit(1);
  }
}

testSuppliers();
