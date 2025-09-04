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
  SaleStatus,
  Category,
  Brand,
  AnalyticsSummary,
  SalesForecast,
  SalesTrend,
  ProfitMarginData,
  ProductPerformance,
  CustomerPerformance
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

  static async getSaleItems(saleId: number): Promise<SaleItem[]> {
    try {
      console.log('Fetching sale items for sale ID:', saleId);
      const result = await invoke('get_sale_items', { saleId });
      console.log('Sale items fetched successfully:', result);
      return result as SaleItem[];
    } catch (error) {
      console.error('Error fetching sale items:', error);
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

  static async getAllProductVariants(): Promise<ProductVariant[]> {
    console.log('DatabaseService: Getting all product variants');
    try {
      const result = await invoke('get_all_product_variants');
      console.log('DatabaseService: All product variants retrieved successfully:', result);
      return result as ProductVariant[];
    } catch (error) {
      console.error('DatabaseService: Error getting all product variants:', error);
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

  static async createDefaultSalesperson(): Promise<number> {
    try {
      console.log('Creating default salesperson...');
      const result = await invoke('create_default_salesperson');
      console.log('Default salesperson created successfully:', result);
      return result as number;
    } catch (error) {
      console.error('Error creating default salesperson:', error);
      throw error;
    }
  }

  // Settings management methods
  static async getSetting(key: string): Promise<string | null> {
    try {
      console.log('Getting setting:', key);
      const result = await invoke('get_setting', { key });
      console.log('Setting retrieved successfully:', result);
      return result as string | null;
    } catch (error) {
      console.error('Error getting setting:', error);
      throw new Error(`Failed to get setting: ${error}`);
    }
  }

  static async setSetting(key: string, value: string, description?: string): Promise<void> {
    try {
      console.log('Setting setting:', { key, value, description });
      await invoke('set_setting', { key, value, description });
      console.log('Setting saved successfully');
    } catch (error) {
      console.error('Error setting setting:', error);
      throw new Error(`Failed to set setting: ${error}`);
    }
  }

  static async getAllSettings(): Promise<Array<{key: string, value: string, description?: string}>> {
    try {
      console.log('Getting all settings...');
      const result = await invoke('get_all_settings');
      console.log('All settings retrieved successfully:', result);
      return result as Array<{key: string, value: string, description?: string}>;
    } catch (error) {
      console.error('Error getting all settings:', error);
      throw new Error(`Failed to get all settings: ${error}`);
    }
  }

  // Import/Export methods
  static async exportProductsToCSV(filePath: string): Promise<string> {
    try {
      console.log('Exporting products to CSV:', filePath);
      const result = await invoke('export_products_to_csv', { filePath });
      console.log('Products exported successfully');
      return result as string;
    } catch (error) {
      console.error('Error exporting products:', error);
      throw new Error(`Failed to export products: ${error}`);
    }
  }

  static async exportCustomersToCSV(filePath: string): Promise<string> {
    try {
      console.log('Exporting customers to CSV:', filePath);
      const result = await invoke('export_customers_to_csv', { filePath });
      console.log('Customers exported successfully');
      return result as string;
    } catch (error) {
      console.error('Error exporting customers:', error);
      throw new Error(`Failed to export customers: ${error}`);
    }
  }

  static async importProductsFromCSV(filePath: string): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('Importing products from CSV:', filePath);
      const result = await invoke('import_products_from_csv', { filePath });
      console.log('Products imported successfully:', result);
      return result as {
        success_count: number;
        error_count: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Error importing products:', error);
      throw new Error(`Failed to import products: ${error}`);
    }
  }

  static async importCustomersFromCSV(filePath: string): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('Importing customers from CSV:', filePath);
      const result = await invoke('import_customers_from_csv', { filePath });
      console.log('Customers imported successfully:', result);
      return result as {
        success_count: number;
        error_count: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Error importing customers:', error);
      throw new Error(`Failed to import customers: ${error}`);
    }
  }

  static async generateProductTemplate(filePath: string): Promise<string> {
    try {
      console.log('Generating product template:', filePath);
      const result = await invoke('generate_product_template', { filePath });
      console.log('Product template generated successfully');
      return result as string;
    } catch (error) {
      console.error('Error generating product template:', error);
      throw new Error(`Failed to generate product template: ${error}`);
    }
  }

  static async generateCustomerTemplate(filePath: string): Promise<string> {
    try {
      console.log('Generating customer template:', filePath);
      const result = await invoke('generate_customer_template', { filePath });
      console.log('Customer template generated successfully');
      return result as string;
    } catch (error) {
      console.error('Error generating customer template:', error);
      throw new Error(`Failed to generate customer template: ${error}`);
    }
  }

  static async saveTemplateWithDialog(templateType: 'products' | 'customers' | 'salespersons'): Promise<string> {
    try {
      console.log('Saving template with dialog for type:', templateType);
      const result = await invoke('save_template_with_dialog', { templateType });
      console.log('Template saved successfully with dialog');
      return result as string;
    } catch (error) {
      console.error('Error saving template with dialog:', error);
      throw new Error(`Failed to save template with dialog: ${error}`);
    }
  }

  static async importProductsFromCSVContent(content: string): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('=== FRONTEND: SENDING CSV TO BACKEND ===');
      console.log('Content length:', content.length);
      console.log('Content type:', typeof content);
      console.log('First 300 chars:', content.substring(0, 300));
      console.log('Last 100 chars:', content.substring(Math.max(0, content.length - 100)));
      console.log('=== END FRONTEND DEBUG ===');
      
      const result = await invoke('import_products_from_csv_content', { content });
      console.log('Products imported successfully from content:', result);
      return result as {
        success_count: number;
        error_count: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Error importing products from content:', error);
      throw new Error(`Failed to import products from content: ${error}`);
    }
  }

  static async importCustomersFromCSVContent(content: string): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('Importing customers from CSV content');
      const result = await invoke('import_customers_from_csv_content', { content });
      console.log('Customers imported successfully from content:', result);
      return result as {
        success_count: number;
        error_count: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Error importing customers from content:', error);
      throw new Error(`Failed to import customers from content: ${error}`);
    }
  }

  static async importSalespersonsFromCSVContent(content: string): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('Importing salespersons from CSV content');
      const result = await invoke('import_salespersons_from_csv_content', { content });
      console.log('Salespersons imported successfully from content:', result);
      return result as {
        success_count: number;
        error_count: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Error importing salespersons from content:', error);
      throw new Error(`Failed to import salespersons from content: ${error}`);
    }
  }

  static async generateSalespersonTemplate(filePath: string): Promise<string> {
    try {
      console.log('Generating salesperson template');
      const result = await invoke('generate_salesperson_template', { filePath });
      console.log('Salesperson template generated successfully:', result);
      return result as string;
    } catch (error) {
      console.error('Error generating salesperson template:', error);
      throw error;
    }
  }

  // Refund operations
  static async createRefund(
    saleId: number,
    userId: number,
    refundAmount: number,
    refundReason: string,
    refundType: 'full' | 'partial',
    notes?: string,
    items: Array<{
      sale_item_id: number;
      quantity: number;
      refund_amount: number;
      reason?: string;
    }> = []
  ): Promise<number> {
    try {
      return await invoke('create_refund', {
        saleid: saleId,
        userid: userId,
        refundamount: refundAmount,
        refundreason: refundReason,
        refundtype: refundType,
        notes,
        items
      });
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  static async getRefundById(refundId: number): Promise<any> {
    try {
      return await invoke('get_refund_by_id', { refund_id: refundId });
    } catch (error) {
      console.error('Error getting refund:', error);
      throw error;
    }
  }

  static async getRefundsBySaleId(saleId: number): Promise<any[]> {
    try {
      return await invoke('get_refunds_by_sale_id', { sale_id: saleId });
    } catch (error) {
      console.error('Error getting refunds for sale:', error);
      throw error;
    }
  }

  static async getAllRefunds(limit?: number): Promise<any[]> {
    try {
      return await invoke('get_all_refunds', { limit });
    } catch (error) {
      console.error('Error getting all refunds:', error);
      throw error;
    }
  }

  static async updateRefundStatus(refundId: number, status: string): Promise<void> {
    try {
      await invoke('update_refund_status', { refundid: refundId, status });
    } catch (error) {
      console.error('Error updating refund status:', error);
      throw error;
    }
  }

  static async getRefundStatistics(): Promise<{
    total_amount: number;
    total_count: number;
    today_count: number;
  }> {
    try {
      return await invoke('get_refund_statistics');
    } catch (error) {
      console.error('Error getting refund statistics:', error);
      throw error;
    }
  }

  // Category operations
  static async getCategories(): Promise<Category[]> {
    try {
      return await invoke('get_categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  static async createCategory(category: Omit<Category, 'id'>): Promise<number> {
    try {
      return await invoke('create_category', { category });
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  static async updateCategory(category: Category): Promise<void> {
    try {
      await invoke('update_category', { category });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  static async deleteCategory(id: number): Promise<void> {
    try {
      await invoke('delete_category', { id });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  static async createDefaultCategories(): Promise<void> {
    try {
      await invoke('create_default_categories');
    } catch (error) {
      console.error('Error creating default categories:', error);
      throw error;
    }
  }

  // Brand operations
  static async getBrands(): Promise<Brand[]> {
    try {
      return await invoke('get_brands');
    } catch (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
  }

  static async createBrand(brand: Omit<Brand, 'id'>): Promise<number> {
    try {
      return await invoke('create_brand', { brand });
    } catch (error) {
      console.error('Error creating brand:', error);
      throw error;
    }
  }

  static async updateBrand(brand: Brand): Promise<void> {
    try {
      await invoke('update_brand', { brand });
    } catch (error) {
      console.error('Error updating brand:', error);
      throw error;
    }
  }

  static async deleteBrand(id: number): Promise<void> {
    try {
      await invoke('delete_brand', { id });
    } catch (error) {
      console.error('Error deleting brand:', error);
      throw error;
    }
  }

  static async createDefaultBrands(): Promise<void> {
    try {
      await invoke('create_default_brands');
    } catch (error) {
      console.error('Error creating default brands:', error);
      throw error;
    }
  }

  // Analytics operations
  static async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    try {
      return await invoke('get_analytics_summary');
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }
  }

  static async trackAnalyticsEvent(eventType: string, eventData?: string, userId?: number): Promise<void> {
    try {
      await invoke('track_analytics_event', { eventType, eventData, userId });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }

  static async trackProductView(productId: number, userId?: number): Promise<void> {
    try {
      await invoke('track_product_view', { productId, userId });
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  static async generateSalesForecast(productId: number, days: number): Promise<SalesForecast[]> {
    try {
      return await invoke('generate_sales_forecast', { productId, days });
    } catch (error) {
      console.error('Error generating sales forecast:', error);
      throw error;
    }
  }

  static async getSalesTrends(): Promise<SalesTrend[]> {
    try {
      return await invoke('get_sales_trends');
    } catch (error) {
      console.error('Error fetching sales trends:', error);
      throw error;
    }
  }

  static async getProfitMargins(): Promise<ProfitMarginData[]> {
    try {
      return await invoke('get_profit_margins');
    } catch (error) {
      console.error('Error fetching profit margins:', error);
      throw error;
    }
  }

  static async getTopSellingProducts(): Promise<ProductPerformance[]> {
    try {
      return await invoke('get_top_selling_products');
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      throw error;
    }
  }

  static async getTopCustomers(): Promise<CustomerPerformance[]> {
    try {
      return await invoke('get_top_customers');
    } catch (error) {
      console.error('Error fetching top customers:', error);
      throw error;
    }
  }

  static async testAnalytics(): Promise<string> {
    try {
      return await invoke('test_analytics');
    } catch (error) {
      console.error('Error testing analytics:', error);
      throw error;
    }
  }

  static async createSettingsTable(): Promise<string> {
    try {
      return await invoke('create_settings_table');
    } catch (error) {
      console.error('Error creating settings table:', error);
      throw error;
    }
  }
} 