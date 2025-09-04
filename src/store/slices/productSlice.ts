import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product, ProductVariant, Category } from '../../types';

interface ProductState {
  products: Product[];
  productVariants: ProductVariant[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  searchQuery: string;
  selectedCategory: string | null;
}

// Sample data - not used in production as data comes from database
const sampleProducts: Product[] = [];
const sampleProductVariants: ProductVariant[] = [];

// Categories are now loaded dynamically from the backend

const initialState: ProductState = {
  products: sampleProducts,
  productVariants: sampleProductVariants,
  categories: [], // Categories are now loaded dynamically from the backend
  loading: false,
  error: null,
  selectedProduct: null,
  searchQuery: '',
  selectedCategory: null,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload);
    },
    
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    
    deleteProduct: (state, action: PayloadAction<number>) => {
      state.products = state.products.filter(p => p.id !== action.payload);
    },
    
    setProductVariants: (state, action: PayloadAction<ProductVariant[]>) => {
      state.productVariants = action.payload;
    },
    
    addProductVariant: (state, action: PayloadAction<ProductVariant>) => {
      state.productVariants.push(action.payload);
    },
    
    updateProductVariant: (state, action: PayloadAction<ProductVariant>) => {
      const index = state.productVariants.findIndex(pv => pv.id === action.payload.id);
      if (index !== -1) {
        state.productVariants[index] = action.payload;
      }
    },
    
    deleteProductVariant: (state, action: PayloadAction<number>) => {
      state.productVariants = state.productVariants.filter(pv => pv.id !== action.payload);
    },
    
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload);
    },
    
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    
    deleteCategory: (state, action: PayloadAction<number>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    },
    
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  setProductVariants,
  addProductVariant,
  updateProductVariant,
  deleteProductVariant,
  setCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setSelectedProduct,
  setSearchQuery,
  setSelectedCategory,
} = productSlice.actions;

export default productSlice.reducer; 