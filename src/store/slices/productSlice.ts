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

// Sample data
const sampleProducts: Product[] = [
  {
    id: 1,
    name: 'Classic White T-Shirt',
    brand: 'Fashion Brand',
    category: 'Men',
    subcategory: 'T-Shirts',
    description: 'Comfortable cotton t-shirt',
    base_price: 599,
    cost_price: 300,
    barcode: '123456789',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Blue Denim Jeans',
    brand: 'Denim Co.',
    category: 'Men',
    subcategory: 'Jeans',
    description: 'Classic blue denim jeans',
    base_price: 1299,
    cost_price: 650,
    barcode: '123456790',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Floral Summer Dress',
    brand: 'Elegant Fashion',
    category: 'Women',
    subcategory: 'Dresses',
    description: 'Beautiful floral summer dress',
    base_price: 899,
    costPrice: 450,
    barcode: '123456791',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Kids Polo Shirt',
    brand: 'Kids Fashion',
    category: 'Kids',
    subcategory: 'Shirts',
    description: 'Comfortable polo shirt for kids',
    base_price: 399,
    costPrice: 200,
    barcode: '123456792',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const sampleProductVariants: ProductVariant[] = [
  {
    id: 1,
    product_id: 1,
    size: 'M',
    color: 'White',
    sku: 'TS-WH-M',
    stockQuantity: 25,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 2,
    product_id: 1,
    size: 'L',
    color: 'White',
    sku: 'TS-WH-L',
    stockQuantity: 20,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 3,
    product_id: 2,
    size: '32',
    color: 'Blue',
    sku: 'DJ-BL-32',
    stockQuantity: 15,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 4,
    product_id: 2,
    size: '34',
    color: 'Blue',
    sku: 'DJ-BL-34',
    stockQuantity: 12,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 5,
    product_id: 3,
    size: 'S',
    color: 'Pink',
    sku: 'SD-PK-S',
    stockQuantity: 8,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 6,
    product_id: 3,
    size: 'M',
    color: 'Pink',
    sku: 'SD-PK-M',
    stockQuantity: 10,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 7,
    product_id: 4,
    size: '8',
    color: 'Red',
    sku: 'PS-RD-8',
    stockQuantity: 5,
    priceAdjustment: 0,
    imageUrl: '',
  },
  {
    id: 8,
    productId: 4,
    size: '10',
    color: 'Red',
    sku: 'PS-RD-10',
    stockQuantity: 7,
    priceAdjustment: 0,
    imageUrl: '',
  },
];

const sampleCategories: Category[] = [
  { id: 1, name: 'Men', description: 'Men\'s clothing' },
  { id: 2, name: 'Women', description: 'Women\'s clothing' },
  { id: 3, name: 'Kids', description: 'Kids clothing' },
  { id: 4, name: 'Accessories', description: 'Fashion accessories' },
];

const initialState: ProductState = {
  products: sampleProducts,
  productVariants: sampleProductVariants,
  categories: sampleCategories,
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