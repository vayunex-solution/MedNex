import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SaleItem } from '../../types';

interface BillingState {
  items: SaleItem[];
  customerId: number | null;
  doctorId: number | null;
  invoiceDate: string;
  paymentMode: string;
  discount: number;
}

const initialState: BillingState = {
  items: [],
  customerId: null,
  doctorId: null,
  invoiceDate: new Date().toISOString().split('T')[0],
  paymentMode: 'Cash',
  discount: 0,
};

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<SaleItem>) => {
      const existing = state.items.findIndex((i) => i.medicineId === action.payload.medicineId && i.batchId === action.payload.batchId);
      if (existing >= 0) state.items[existing].qty += action.payload.qty;
      else state.items.push(action.payload);
    },
    updateItem: (state, action: PayloadAction<{ index: number; item: Partial<SaleItem> }>) => {
      state.items[action.payload.index] = { ...state.items[action.payload.index], ...action.payload.item };
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items.splice(action.payload, 1);
    },
    clearBilling: () => initialState,
    setCustomer: (state, action: PayloadAction<number | null>) => { state.customerId = action.payload; },
    setDoctor: (state, action: PayloadAction<number | null>) => { state.doctorId = action.payload; },
    setPaymentMode: (state, action: PayloadAction<string>) => { state.paymentMode = action.payload; },
    setDiscount: (state, action: PayloadAction<number>) => { state.discount = action.payload; },
  },
});

export const { addItem, updateItem, removeItem, clearBilling, setCustomer, setDoctor, setPaymentMode, setDiscount } = billingSlice.actions;
export default billingSlice.reducer;
