import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Cart, CartItem } from '../../types';

interface CartState {
  items: CartItem[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  customerId?: number;
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  taxAmount: 0,
  discountAmount: 0,
  finalAmount: 0,
  customerId: undefined,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        item => item.productVariantId === action.payload.productVariantId
      );
      
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    updateItemQuantity: (state, action: PayloadAction<{ productVariantId: number; quantity: number }>) => {
      const item = state.items.find(
        item => item.productVariantId === action.payload.productVariantId
      );
      
      if (item) {
        item.quantity = action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter(
            item => item.productVariantId !== action.payload.productVariantId
          );
        }
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        item => item.productVariantId !== action.payload
      );
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.taxAmount = 0;
      state.discountAmount = 0;
      state.finalAmount = 0;
      state.customerId = undefined;
    },
    
    setCustomer: (state, action: PayloadAction<number>) => {
      state.customerId = action.payload;
    },
    
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discountAmount = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    calculateTotals: (state) => {
      state.totalAmount = state.items.reduce(
        (total, item) => total + (item.unitPrice * item.quantity),
        0
      );
      
      // Calculate tax (assuming 18% GST)
      state.taxAmount = (state.totalAmount - state.discountAmount) * 0.18;
      
      // Calculate final amount
      state.finalAmount = state.totalAmount - state.discountAmount + state.taxAmount;
    },
  },
});

export const {
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  setCustomer,
  setDiscount,
  calculateTotals,
} = cartSlice.actions;

export default cartSlice.reducer; 