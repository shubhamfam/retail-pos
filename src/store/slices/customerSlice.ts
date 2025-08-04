import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Customer } from '../../types';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  selectedCustomer: Customer | null;
  searchQuery: string;
}

// Sample data
const sampleCustomers: Customer[] = [
  {
    id: 1,
    name: 'John Doe',
    phone: '+91 9876543210',
    email: 'john.doe@email.com',
    address: '123 Main Street, Mumbai',
    birthday: '1990-05-15',
    loyalty_points: 150,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Jane Smith',
    phone: '+91 9876543211',
    email: 'jane.smith@email.com',
    address: '456 Oak Avenue, Delhi',
    birthday: '1988-12-20',
    loyalty_points: 75,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Mike Johnson',
    phone: '+91 9876543212',
    email: 'mike.johnson@email.com',
    address: '789 Pine Road, Bangalore',
    birthday: '1992-08-10',
    loyalty_points: 200,
    created_at: new Date().toISOString(),
  },
];

const initialState: CustomerState = {
  customers: sampleCustomers,
  loading: false,
  error: null,
  selectedCustomer: null,
  searchQuery: '',
};

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setCustomers: (state, action: PayloadAction<Customer[]>) => {
      state.customers = action.payload;
    },
    
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customers.push(action.payload);
    },
    
    updateCustomer: (state, action: PayloadAction<Customer>) => {
      const index = state.customers.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
    },
    
    deleteCustomer: (state, action: PayloadAction<number>) => {
      state.customers = state.customers.filter(c => c.id !== action.payload);
    },
    
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  setSelectedCustomer,
  setSearchQuery,
} = customerSlice.actions;

export default customerSlice.reducer; 