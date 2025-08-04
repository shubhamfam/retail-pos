import { invoke } from '@tauri-apps/api/core';
import { 
  Product, 
  Customer, 
  Sale, 
  SaleItem, 
  ProductVariant, 
  User,
  Salesperson,
  SalespersonStats,
  PaymentMethod,
  SaleStatus
} from '../types';

export class DatabaseService {
  // Test backend connectivity
  static async ping(): Promise<string> {
    try {
      return await invoke('ping');
    } catch (error) {
      console.error('Error pinging backend:', error);
      throw error;
    }
  }

  // Get database version
  static async getDbVersion(): Promise<number> {
    try {
      return await invoke('get_db_version');
    } catch (error) {
      console.error('Error getting database version:', error);
      throw error;
    }
  }

  // Reset database
  static async resetDatabase(): Promise<string> {
    try {
      return await invoke('reset_database');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  // Product operations
  static async getProducts(): Promise<Product[]> {
    try {
      return await invoke('get_products');
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  static async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    try {
      console.log('DatabaseService: Creating product with data:', product);
      const result = await invoke('create_product', { product }) as number;
      console.log('DatabaseService: Product created successfully, ID:', result);
      return result;
    } catch (error) {
      console.error('DatabaseService: Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(product: Product): Promise<void> {
    try {
      await invoke('update_product', { product });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id: number): Promise<void> {
    try {
      await invoke('delete_product', { id });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Customer operations
  static async getCustomers(): Promise<Customer[]> {
    try {
      return await invoke('get_customers');
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  static async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    try {
      console.log('DatabaseService: Creating customer with data:', customer);
      const result = await invoke('create_customer', { customer }) as Customer;
      console.log('DatabaseService: Customer created successfully:', result);
      return result;
    } catch (error) {
      console.error('DatabaseService: Error creating customer:', error);
      throw error;
    }
  }

  static async updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    try {
      await invoke('update_customer', { id, customer });
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  static async deleteCustomer(id: number): Promise<void> {
    try {
      await invoke('delete_customer', { id });
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Sale operations
  static async createSale(
    customerId: number | null,
    userId: number,
    salespersonId: number | null,
    totalAmount: number,
    taxAmount: number,
    discountAmount: number,
    paymentMethod: PaymentMethod,
    status: SaleStatus,
    items: Array<{
      product_variant_id: number;
      quantity: number;
      unit_price: number;
      total: number;
    }>
  ): Promise<Sale> {
    try {
      console.log('=== DatabaseService.createSale START ===');
      console.log('Creating sale with data:', {
        customerId,
        userId,
        salespersonId,
        totalAmount,
        taxAmount,
        discountAmount,
        paymentMethod,
        status,
        items
      });

      console.log('About to invoke create_sale command...');
      const result = await invoke('create_sale', {
        customerId,
        userId,
        salespersonId,
        totalAmount,
        taxAmount,
        discountAmount,
        paymentMethod,
        status,
        items
      });
      console.log('Invoke completed, result:', result);

      console.log('Sale created successfully:', result);
      console.log('=== DatabaseService.createSale END ===');
      return result as Sale;
    } catch (error) {
      console.error('=== DatabaseService.createSale ERROR ===');
      console.error('Error creating sale:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to create sale: ${error}`);
    }
  }

  static async getRecentSales(limit: number = 10): Promise<Sale[]> {
    try {
      return await invoke('get_recent_sales', { limit });
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      return [];
    }
  }

  static async getTodaySales(): Promise<Sale[]> {
    try {
      return await invoke('get_today_sales');
    } catch (error) {
      console.error('Error fetching today sales:', error);
      return [];
    }
  }

  static async createSaleItem(saleItem: Omit<SaleItem, 'id'>): Promise<number> {
    console.log('DatabaseService: Creating sale item:', saleItem);
    try {
      const result = await invoke('create_sale_item', { saleItem });
      console.log('DatabaseService: Sale item created successfully:', result);
      return result as number;
    } catch (error) {
      console.error('DatabaseService: Error creating sale item:', error);
      throw error;
    }
  }

  // User methods
  static async createDefaultUser(): Promise<number> {
    console.log('DatabaseService: Creating default user...');
    try {
      const result = await invoke('create_default_user');
      console.log('DatabaseService: Default user created successfully:', result);
      return result as number;
    } catch (error) {
      console.error('DatabaseService: Error creating default user:', error);
      throw error;
    }
  }

  static async getUserById(id: number): Promise<User | null> {
    console.log('DatabaseService: Getting user by ID:', id);
    try {
      const result = await invoke('get_user_by_id', { id });
      console.log('DatabaseService: User retrieved successfully:', result);
      return result as User | null;
    } catch (error) {
      console.error('DatabaseService: Error getting user by ID:', error);
      throw error;
    }
  }

  static async getOrCreateDefaultVariant(productId: number): Promise<number> {
    console.log('DatabaseService: Getting or creating default variant for product:', productId);
    try {
      const result = await invoke('get_or_create_default_variant', { productId });
      console.log('DatabaseService: Default variant created/retrieved successfully:', result);
      return result as number;
    } catch (error) {
      console.error('DatabaseService: Error getting/creating default variant:', error);
      throw error;
    }
  }

  // Inventory management methods
  static async getLowStockItems(threshold: number): Promise<ProductVariant[]> {
    console.log('DatabaseService: Getting low stock items with threshold:', threshold);
    try {
      const result = await invoke('get_low_stock_items', { threshold });
      console.log('DatabaseService: Low stock items retrieved successfully:', result);
      return result as ProductVariant[];
    } catch (error) {
      console.error('DatabaseService: Error getting low stock items:', error);
      throw error;
    }
  }

  static async getOutOfStockItems(): Promise<ProductVariant[]> {
    console.log('DatabaseService: Getting out of stock items...');
    try {
      const result = await invoke('get_out_of_stock_items');
      console.log('DatabaseService: Out of stock items retrieved successfully:', result);
      return result as ProductVariant[];
    } catch (error) {
      console.error('DatabaseService: Error getting out of stock items:', error);
      throw error;
    }
  }

  static async adjustStockQuantity(variantId: number, adjustment: number): Promise<void> {
    console.log('DatabaseService: Adjusting stock quantity for variant:', variantId, 'by:', adjustment);
    try {
      await invoke('adjust_stock_quantity', { variantId, adjustment });
      console.log('DatabaseService: Stock quantity adjusted successfully');
    } catch (error) {
      console.error('DatabaseService: Error adjusting stock quantity:', error);
      throw error;
    }
  }

  // Product Variant Methods
  static async getProductVariants(productId: number): Promise<ProductVariant[]> {
    console.log('DatabaseService: Getting product variants for product:', productId);
    try {
      const result = await invoke('get_product_variants', { productId });
      console.log('DatabaseService: Product variants retrieved successfully:', result);
      return result as ProductVariant[];
    } catch (error) {
      console.error('DatabaseService: Error getting product variants:', error);
      throw error;
    }
  }

  static async createProductVariant(variant: Omit<ProductVariant, 'id'>): Promise<number> {
    console.log('DatabaseService: Creating product variant:', variant);
    try {
      const result = await invoke('create_product_variant', { variant });
      console.log('DatabaseService: Product variant created successfully:', result);
      return result as number;
    } catch (error) {
      console.error('DatabaseService: Error creating product variant:', error);
      throw error;
    }
  }

  static async updateProductVariant(variantId: number, variant: Omit<ProductVariant, 'id'>): Promise<void> {
    console.log('DatabaseService: Updating product variant:', variantId, variant);
    try {
      await invoke('update_product_variant', { variantId, variant });
      console.log('DatabaseService: Product variant updated successfully');
    } catch (error) {
      console.error('DatabaseService: Error updating product variant:', error);
      throw error;
    }
  }

  static async deleteProductVariant(variantId: number): Promise<void> {
    console.log('DatabaseService: Deleting product variant:', variantId);
    try {
      await invoke('delete_product_variant', { variantId });
      console.log('DatabaseService: Product variant deleted successfully');
    } catch (error) {
      console.error('DatabaseService: Error deleting product variant:', error);
      throw error;
    }
  }

  // Salesperson Management
  static async createSalesperson(
    userId: number,
    name: string,
    email?: string,
    phone?: string,
    commissionRate: number = 0
  ): Promise<Salesperson> {
    try {
      console.log('Creating salesperson:', { userId, name, email, phone, commissionRate });
      const result = await invoke('create_salesperson', {
        userId,
        name,
        email,
        phone,
        commissionRate
      });
      console.log('Salesperson created successfully:', result);
      return result as Salesperson;
    } catch (error) {
      console.error('Error creating salesperson:', error);
      throw new Error(`Failed to create salesperson: ${error}`);
    }
  }

  static async getAllSalespersons(): Promise<Salesperson[]> {
    try {
      console.log('Fetching all salespersons...');
      const result = await invoke('get_all_salespersons');
      console.log('Salespersons fetched successfully:', result);
      return result as Salesperson[];
    } catch (error) {
      console.error('Error fetching salespersons:', error);
      throw new Error(`Failed to fetch salespersons: ${error}`);
    }
  }

  static async updateSalesperson(
    id: number,
    name: string,
    email?: string,
    phone?: string,
    commissionRate: number = 0
  ): Promise<Salesperson> {
    try {
      console.log('Updating salesperson:', { id, name, email, phone, commissionRate });
      const result = await invoke('update_salesperson', {
        id,
        name,
        email,
        phone,
        commissionRate
      });
      console.log('Salesperson updated successfully:', result);
      return result as Salesperson;
    } catch (error) {
      console.error('Error updating salesperson:', error);
      throw new Error(`Failed to update salesperson: ${error}`);
    }
  }

  static async getSalespersonPerformance(
    salespersonId: number,
    period: string = 'all'
  ): Promise<Sale[]> {
    try {
      console.log('Fetching salesperson performance:', { salespersonId, period });
      const result = await invoke('get_salesperson_performance', {
        salespersonId,
        period
      });
      console.log('Salesperson performance fetched successfully:', result);
      return result as Sale[];
    } catch (error) {
      console.error('Error fetching salesperson performance:', error);
      throw new Error(`Failed to fetch salesperson performance: ${error}`);
    }
  }

  static async getTopPerformers(period: string = 'all', limit: number = 5): Promise<SalespersonStats[]> {
    try {
      console.log('Fetching top performers:', { period, limit });
      const result = await invoke('get_top_performers', {
        period,
        limit
      });
      console.log('Top performers fetched successfully:', result);
      
      // Transform the result into SalespersonStats objects
      const performers = result as Array<[number, string, number, number]>;
      return performers.map((performer, index) => ({
        salespersonId: performer[0],
        salespersonName: performer[1],
        totalSales: performer[3], // transaction count
        totalAmount: performer[2], // total sales amount
        totalTransactions: performer[3],
        averageSaleValue: performer[3] > 0 ? performer[2] / performer[3] : 0,
        commissionEarned: performer[2] * 0.05, // Assuming 5% commission
        period
      })) as SalespersonStats[];
    } catch (error) {
      console.error('Error fetching top performers:', error);
      throw new Error(`Failed to fetch top performers: ${error}`);
    }
  }
} 