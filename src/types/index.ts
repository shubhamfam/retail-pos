// Product Types
export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  base_price: number;
  cost_price: number;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  color: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
  image_url?: string;
}

export interface Category {
  id: number;
  name: string;
  parentId?: number;
  description?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Analytics Types
export interface AnalyticsSummary {
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  total_customers: number;
  total_products: number;
  low_stock_items: number;
  out_of_stock_items: number;
  today_sales: number;
  today_orders: number;
  monthly_sales: number;
  monthly_orders: number;
  top_selling_products: ProductPerformance[];
  top_customers: CustomerPerformance[];
  sales_trends: SalesTrend[];
  profit_margins: ProfitMarginData[];
}

export interface ProductPerformance {
  product_id: number;
  product_name: string;
  total_sales: number;
  total_quantity: number;
  profit_margin: number;
  views: number;
}

export interface CustomerPerformance {
  customer_id: number;
  customer_name: string;
  total_spent: number;
  total_orders: number;
  average_order_value: number;
  last_order_date?: string;
}

export interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface ProfitMarginData {
  product_id: number;
  product_name: string;
  cost_price: number;
  selling_price: number;
  profit_margin: number;
  profit_percentage: number;
  total_quantity: number;
}

export interface SalesForecast {
  id?: number;
  product_id: number;
  forecast_date: string;
  predicted_quantity: number;
  confidence_level?: number;
  created_at?: string;
}

// Receipt Types
export interface ReceiptSettings {
  storeLogo?: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeGST: string;
  customFooter?: string;
  taxDisplay: 'inclusive' | 'exclusive';
  currencySymbol: string;
  currencyCode: string;
  printHeader: boolean;
  printLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  receiptWidth: number; // in characters for thermal printers
  fontSize: 'small' | 'medium' | 'large';
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showCustomerInfo: boolean;
  showSalespersonInfo: boolean;
  customFields: ReceiptCustomField[];
}

export interface ReceiptCustomField {
  id: string;
  label: string;
  value: string;
  position: 'header' | 'footer' | 'after_items' | 'before_total';
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  settings: ReceiptSettings;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  loyalty_points: number;
  created_at: string;
}

// Sales Types
export interface Sale {
  id: number;
  customer_id?: number;
  user_id: number;
  salesperson_id?: number; // Track which salesperson made the sale
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  created_at: string;
  customer?: Customer;
  salesperson?: Salesperson; // Related salesperson data
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  productVariant?: ProductVariant;
  product?: Product;
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  STORE_CREDIT = 'store_credit'
}

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Salesperson {
  id: number;
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  commission_rate: number; // Percentage commission
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User; // Related user account
}

export interface SalespersonStats {
  salespersonId: number;
  salespersonName: string;
  totalSales: number;
  totalAmount: number;
  totalTransactions: number;
  averageSaleValue: number;
  commissionEarned: number;
  period: string; // 'today', 'week', 'month', 'all'
}

export interface SalespersonPerformance {
  salespersonId: number;
  salespersonName: string;
  sales: Sale[];
  stats: SalespersonStats;
  rank: number;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier'
}

// Cart Types
export interface CartItem {
  productVariantId: number;
  quantity: number;
  unitPrice: number;
  productVariant?: ProductVariant;
  product?: Product;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
}

// Report Types
export interface SalesReport {
  period: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topProducts: Array<{ product: Product; quantity: number; revenue: number }>;
  paymentMethodBreakdown: Record<PaymentMethod, number>;
}

export interface InventoryReport {
  totalProducts: number;
  totalStockValue: number;
  lowStockItems: ProductVariant[];
  outOfStockItems: ProductVariant[];
  fastMovingItems: Array<{ product: Product; quantity: number }>;
  slowMovingItems: Array<{ product: Product; quantity: number }>;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Refund Types
export interface Refund {
  id: number;
  sale_id: number;
  user_id: number;
  refund_amount: number;
  refund_reason: string;
  refund_type: 'full' | 'partial';
  status: RefundStatus;
  notes?: string;
  created_at: string;
  processed_at?: string;
}

export interface RefundItem {
  id: number;
  refund_id: number;
  sale_item_id: number;
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason?: string;
  productVariant?: ProductVariant;
  product?: Product;
}

export interface RefundWithItems {
  refund: Refund;
  items: RefundItem[];
}

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface RefundStatistics {
  total_amount: number;
  total_count: number;
  today_count: number;
} 