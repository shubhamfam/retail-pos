import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { Product, Customer, Sale, ProductVariant } from '../../types';

interface ReportsProps {
  setCurrentPage: (page: string) => void;
}

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  todaySales: number;
  thisWeekSales: number;
  thisMonthSales: number;
}

interface InventorySummary {
  totalProducts: number;
  totalVariants: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
}

const Reports: React.FC<ReportsProps> = ({ setCurrentPage }) => {
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);

  useEffect(() => {
    // Debounce rapid period changes to prevent multiple loads
    const timeoutId = setTimeout(() => {
      loadReportsData();
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [selectedPeriod]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      // Add timeout wrapper for database calls to prevent blocking
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
          )
        ]);
      };
      
      // Load critical data first with reduced limits and timeouts
      const [recentSalesData, todaySales] = await Promise.all([
        withTimeout(DatabaseService.getRecentSales(20), 2000),
        withTimeout(DatabaseService.getTodaySales(), 2000)
      ]);
      
      // Show critical data immediately
      setRecentSales(recentSalesData);
      setLoading(false);
      
      // Load remaining data in background with fallbacks
      const results = await Promise.allSettled([
        withTimeout(DatabaseService.getProducts(), 3000),
        withTimeout(DatabaseService.getCustomers(), 3000),
        withTimeout(DatabaseService.getLowStockItems(10), 2000),
        withTimeout(DatabaseService.getOutOfStockItems(), 2000)
      ]);
      
      const productsData = results[0].status === 'fulfilled' ? results[0].value : [];
      const customersData = results[1].status === 'fulfilled' ? results[1].value : [];
      const lowStockItemsData = results[2].status === 'fulfilled' ? results[2].value : [];
      const outOfStockItemsData = results[3].status === 'fulfilled' ? results[3].value : [];
      
      setProducts(productsData);
      setCustomers(customersData);
      setLowStockItems(lowStockItemsData);
      
      // Calculate sales summary based on selected period
      const now = new Date();
      const filteredSales = recentSalesData.filter(sale => {
        const saleDate = new Date(sale.created_at);
        switch (selectedPeriod) {
          case 'today':
            return saleDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return saleDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return saleDate >= monthAgo;
          default:
            return true;
        }
      });
      
      const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const averageTransactionValue = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;
      
      setSalesSummary({
        totalSales,
        totalTransactions: filteredSales.length,
        averageTransactionValue,
        todaySales: todaySales.reduce((sum, sale) => sum + sale.total_amount, 0),
        thisWeekSales: recentSalesData.filter(sale => {
          const saleDate = new Date(sale.created_at);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        }).reduce((sum, sale) => sum + sale.total_amount, 0),
        thisMonthSales: recentSalesData.filter(sale => {
          const saleDate = new Date(sale.created_at);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return saleDate >= monthAgo;
        }).reduce((sum, sale) => sum + sale.total_amount, 0),
      });
      
      // Calculate inventory summary with real data
      const totalVariants = productsData.reduce((sum, product) => {
        // This is an approximation since we don't have a direct count
        return sum + 1; // Each product has at least one variant
      }, 0);
      
      const totalStockValue = lowStockItemsData.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.product_id);
        if (product) {
          const unitPrice = product.base_price + (item.price_adjustment || 0);
          return sum + (unitPrice * item.stock_quantity);
        }
        return sum;
      }, 0);
      
      setInventorySummary({
        totalProducts: productsData.length,
        totalVariants: totalVariants,
        lowStockItems: lowStockItemsData.length,
        outOfStockItems: outOfStockItemsData.length,
        totalStockValue,
      });
      
    } catch (error) {
      console.error('Error loading reports data:', error);
      // Show fallback data instead of blocking
      setSalesSummary({
        totalSales: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        todaySales: 0,
        thisWeekSales: 0,
        thisMonthSales: 0,
      });
      setInventorySummary({
        totalProducts: 0,
        totalVariants: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalStockValue: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getCustomerName = (customerId?: number) => {
    if (!customerId) return 'Walk-in Customer';
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant) return;

    try {
      await DatabaseService.adjustStockQuantity(selectedVariant.id!, adjustmentAmount);
      setShowStockModal(false);
      setSelectedVariant(null);
      setAdjustmentAmount(0);
      loadReportsData(); // Refresh data
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <button
          onClick={loadReportsData}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'today' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      {salesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesSummary.totalSales)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🛒</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {salesSummary.totalTransactions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Transaction</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesSummary.averageTransactionValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesSummary.todaySales)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Summary Cards */}
      {inventorySummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventorySummary.totalProducts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Variants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventorySummary.totalVariants}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventorySummary.lowStockItems}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventorySummary.outOfStockItems}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">💎</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(inventorySummary.totalStockValue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Recent Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{sale.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCustomerName(sale.customer_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                      sale.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.payment_method.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Low Stock Alerts</h2>
        </div>
        <div className="p-6">
          {lowStockItems.length === 0 ? (
            <p className="text-gray-500">No low stock items found.</p>
          ) : (
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{getProductName(item.product_id)}</p>
                    <p className="text-sm text-gray-600">
                      {item.size} - {item.color} (SKU: {item.sku})
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.stock_quantity === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Stock: {item.stock_quantity}
                    </span>
                    <button 
                      onClick={() => {
                        setSelectedVariant(item);
                        setShowStockModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Adjust Stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Stock</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Product: {getProductName(selectedVariant.product_id)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                SKU: {selectedVariant.sku}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Current Stock: {selectedVariant.stock_quantity}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Amount (+/-)
              </label>
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10 for +10, -5 for -5"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedVariant(null);
                  setAdjustmentAmount(0);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports; 