import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Sale, SaleItem, PaymentMethod, SaleStatus } from '../../types';

interface SaleState {
  sales: Sale[];
  saleItems: SaleItem[];
  loading: boolean;
  error: string | null;
  selectedSale: Sale | null;
  searchQuery: string;
  dateRange: { start: string; end: string };
}

// Sample data
const sampleSales: Sale[] = [
  {
    id: 1,
    customerId: 1,
    userId: 1,
    totalAmount: 1797,
    taxAmount: 323.46,
    discountAmount: 100,
    paymentMethod: PaymentMethod.CASH,
    status: SaleStatus.COMPLETED,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: 2,
    customerId: 2,
    userId: 1,
    totalAmount: 899,
    taxAmount: 161.82,
    discountAmount: 0,
    paymentMethod: PaymentMethod.CARD,
    status: SaleStatus.COMPLETED,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 3,
    customerId: 3,
    userId: 1,
    totalAmount: 399,
    taxAmount: 71.82,
    discountAmount: 50,
    paymentMethod: PaymentMethod.UPI,
    status: SaleStatus.COMPLETED,
    createdAt: new Date().toISOString(), // Today
  },
];

const sampleSaleItems: SaleItem[] = [
  {
    id: 1,
    saleId: 1,
    productVariantId: 1,
    quantity: 2,
    unitPrice: 599,
    discount: 50,
    total: 1148,
  },
  {
    id: 2,
    saleId: 1,
    productVariantId: 3,
    quantity: 1,
    unitPrice: 1299,
    discount: 50,
    total: 1249,
  },
  {
    id: 3,
    saleId: 2,
    productVariantId: 5,
    quantity: 1,
    unitPrice: 899,
    discount: 0,
    total: 899,
  },
  {
    id: 4,
    saleId: 3,
    productVariantId: 7,
    quantity: 1,
    unitPrice: 399,
    discount: 50,
    total: 349,
  },
];

const initialState: SaleState = {
  sales: sampleSales,
  saleItems: sampleSaleItems,
  loading: false,
  error: null,
  selectedSale: null,
  searchQuery: '',
  dateRange: { start: '', end: '' },
};

const saleSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setSales: (state, action: PayloadAction<Sale[]>) => {
      state.sales = action.payload;
    },
    
    addSale: (state, action: PayloadAction<Sale>) => {
      state.sales.push(action.payload);
    },
    
    updateSale: (state, action: PayloadAction<Sale>) => {
      const index = state.sales.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.sales[index] = action.payload;
      }
    },
    
    deleteSale: (state, action: PayloadAction<number>) => {
      state.sales = state.sales.filter(s => s.id !== action.payload);
    },
    
    setSaleItems: (state, action: PayloadAction<SaleItem[]>) => {
      state.saleItems = action.payload;
    },
    
    addSaleItem: (state, action: PayloadAction<SaleItem>) => {
      state.saleItems.push(action.payload);
    },
    
    updateSaleItem: (state, action: PayloadAction<SaleItem>) => {
      const index = state.saleItems.findIndex(si => si.id === action.payload.id);
      if (index !== -1) {
        state.saleItems[index] = action.payload;
      }
    },
    
    deleteSaleItem: (state, action: PayloadAction<number>) => {
      state.saleItems = state.saleItems.filter(si => si.id !== action.payload);
    },
    
    setSelectedSale: (state, action: PayloadAction<Sale | null>) => {
      state.selectedSale = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.dateRange = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setSales,
  addSale,
  updateSale,
  deleteSale,
  setSaleItems,
  addSaleItem,
  updateSaleItem,
  deleteSaleItem,
  setSelectedSale,
  setSearchQuery,
  setDateRange,
} = saleSlice.actions;

export default saleSlice.reducer; 