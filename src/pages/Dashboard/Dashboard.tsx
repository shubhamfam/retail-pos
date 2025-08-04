import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { Product, Sale, SalespersonStats } from '../../types';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  todaySales: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentSales: Sale[];
  topProducts: Product[];
}



interface DashboardProps {
  setCurrentPage: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    todaySales: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentSales: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const [topPerformers, setTopPerformers] = useState<SalespersonStats[]>([]);

  useEffect(() => {
    console.log('Dashboard component mounted');
    loadDashboardData();
  }, []);

  

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [products, customers, recentSales, lowStockItems, outOfStockItems, topPerformersData] = await Promise.all([
        DatabaseService.getProducts(),
        DatabaseService.getCustomers(),
        DatabaseService.getRecentSales(),
        DatabaseService.getLowStockItems(lowStockThreshold),
        DatabaseService.getOutOfStockItems(),
        DatabaseService.getTopPerformers('all', 3)
      ]);

      console.log('Dashboard Data Loaded:', {
        products: products.length,
        customers: customers.length,
        recentSales: recentSales.length,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        lowStockThreshold
      });

      // Calculate today's sales
      const today = new Date().toDateString();
      const todaySales = recentSales.filter(sale => 
        new Date(sale.created_at).toDateString() === today
      ).reduce((total, sale) => total + sale.total_amount, 0);

      // Get top products (products with most variants)
      const topProducts = products.slice(0, 5);

      setStats({
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalSales: recentSales.reduce((total, sale) => total + sale.total_amount, 0),
        todaySales,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        recentSales: recentSales.slice(0, 5),
        topProducts
      });

      setTopPerformers(topPerformersData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your business</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadDashboardData}
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              <p className="text-xs text-gray-500">≤ {lowStockThreshold} items</p>
            </div>
          </div>
          {stats.lowStockItems > 0 && (
            <button
              onClick={() => setCurrentPage('inventory')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              View details →
            </button>
          )}
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sales</h3>
          {stats.recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent sales</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => setCurrentPage('sales')}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer w-full text-left"
                >
                  <div>
                    <p className="font-medium text-gray-900">Sale #{sale.id}</p>
                    <p className="text-sm text-gray-500">{formatDate(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-sm text-gray-500">{sale.payment_method}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setCurrentPage('pos')}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="font-medium text-gray-900">New Sale</div>
              </div>
            </button>
            <button
              onClick={() => setCurrentPage('products')}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors cursor-pointer transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-medium text-gray-900">Add Product</div>
              </div>
            </button>
            <button
              onClick={() => setCurrentPage('customers')}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-900">Add Customer</div>
              </div>
            </button>
            <button
              onClick={() => setCurrentPage('salesperson')}
              className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">👨‍💼</div>
                <div className="font-medium text-gray-900">Add Salesperson</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Alerts</h3>
          <div className="space-y-3">
            <button
              onClick={() => setCurrentPage('inventory')}
              className="w-full text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-red-800 font-medium">Low Stock Items</span>
                <span className="text-red-600 font-bold text-xl">{stats.lowStockItems}</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentPage('inventory')}
              className="w-full text-left p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-orange-800 font-medium">Out of Stock Items</span>
                <span className="text-orange-600 font-bold text-xl">{stats.outOfStockItems}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <button
              onClick={() => setCurrentPage('salesperson')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All →
            </button>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No performance data available</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.salespersonId} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">{performer.salespersonName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{performer.totalSales.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{performer.totalTransactions} sales</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 