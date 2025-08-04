import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cartSlice';
import productReducer from './slices/productSlice';
import customerReducer from './slices/customerSlice';
import saleReducer from './slices/saleSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    products: productReducer,
    customers: customerReducer,
    sales: saleReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 