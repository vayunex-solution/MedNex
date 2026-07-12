'use strict';

const sequelize = require('../config/database');

/**
 * Offer Engine: Calculates applicable discounts based on promotions & active rules
 */
const calculateDiscounts = async (tenantId, { items, totalAmount, holderType = 'General', couponCode = null }) => {
  const now = new Date();
  let billDiscount = 0;
  const appliedOffers = [];

  // 1. Fetch all active offers for this tenant in the date range
  const [offers] = await sequelize.query(
    `SELECT * FROM plat_offers 
     WHERE tenantId = ? AND isActive = 1 AND startDate <= NOW() AND endDate >= NOW()`,
    { replacements: [tenantId] }
  );

  // 2. Resolve Holder/Membership offers first
  const holderOffer = offers.find(o => o.holderType.toLowerCase() === holderType.toLowerCase());
  if (holderOffer) {
    if (holderOffer.type === 'percentage') {
      const discount = totalAmount * (holderOffer.value / 100);
      billDiscount += discount;
      appliedOffers.push({ name: holderOffer.name, discount });
    } else if (holderOffer.type === 'flat' && totalAmount >= holderOffer.minBillAmount) {
      billDiscount += holderOffer.value;
      appliedOffers.push({ name: holderOffer.name, discount: holderOffer.value });
    }
  }

  // 3. Resolve Coupon code if provided
  if (couponCode) {
    const couponOffer = offers.find(o => o.name.toLowerCase() === couponCode.toLowerCase() && o.type !== 'buy_x_get_y');
    if (couponOffer && totalAmount >= couponOffer.minBillAmount) {
      if (couponOffer.type === 'percentage') {
        const discount = totalAmount * (couponOffer.value / 100);
        billDiscount += discount;
        appliedOffers.push({ name: `Coupon: ${couponCode}`, discount });
      } else if (couponOffer.type === 'flat') {
        billDiscount += couponOffer.value;
        appliedOffers.push({ name: `Coupon: ${couponCode}`, discount: couponOffer.value });
      }
    }
  }

  // 4. Resolve Festival/General Bill discount
  const festivalOffer = offers.find(o => o.holderType === 'General' && o.type !== 'buy_x_get_y' && o.name.toLowerCase() !== couponCode?.toLowerCase());
  if (festivalOffer && totalAmount >= festivalOffer.minBillAmount) {
    if (festivalOffer.type === 'percentage') {
      const discount = totalAmount * (festivalOffer.value / 100);
      billDiscount += discount;
      appliedOffers.push({ name: festivalOffer.name, discount });
    } else if (festivalOffer.type === 'flat') {
      billDiscount += festivalOffer.value;
      appliedOffers.push({ name: festivalOffer.name, discount: festivalOffer.value });
    }
  }

  // Calculate new items structure if Buy X Get Y applies
  const processedItems = items.map(item => {
    // Buy X Get Y Offer Check
    const buyXGetY = offers.find(o => o.type === 'buy_x_get_y' && o.description && o.description.includes(String(item.medicineId)));
    let freeQty = 0;
    if (buyXGetY) {
      // E.g., description format: "buy:10,get:1,medId:4"
      const parts = buyXGetY.description.split(',');
      const buyCount = parseInt(parts.find(p => p.startsWith('buy:'))?.split(':')[1]) || 10;
      const getCount = parseInt(parts.find(p => p.startsWith('get:'))?.split(':')[1]) || 1;
      
      if (item.qty >= buyCount) {
        freeQty = Math.floor(item.qty / buyCount) * getCount;
        appliedOffers.push({ name: buyXGetY.name, details: `Free qty: ${freeQty}` });
      }
    }

    return {
      ...item,
      free: (item.free || 0) + freeQty,
    };
  });

  return {
    items: processedItems,
    billDiscount: Math.min(billDiscount, totalAmount),
    appliedOffers,
  };
};

module.exports = { calculateDiscounts };
