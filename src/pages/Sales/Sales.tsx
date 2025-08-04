import React, { useState, useEffect } from 'react';
import { Sale, Customer } from '../../types';
import { DatabaseService } from '../../services/databaseService';

interface SalesProps {
  setCurrentPage: (page: string) => void;
}

interface SalesWithDetails extends Sale {
  customer?: Customer;
  itemsCount: number;
}

const Sales: React.FC<SalesProps> = ({ setCurrentPage }) => {
  const [sales, setSales] = useState<SalesWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<SalesWithDetails | null>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  useEffect(() => {
    loadSales();
    loadCustomers();
  }, [selectedPeriod]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const recentSales = await DatabaseService.getRecentSales();
      
      // Add customer details and item count to sales
      const salesWithDetails = recentSales.map(sale => ({
        ...sale,
        customer: customers.find(c => c.id === sale.customer_id),
        itemsCount: 0 // Will be updated when we implement sale items
      }));
      
      setSales(salesWithDetails);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersData = await DatabaseService.getCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalSales = () => {
    return sales.reduce((total, sale) => total + sale.total_amount, 0);
  };

  const getTotalTransactions = () => {
    return sales.length;
  };

  const getAverageSale = () => {
    return sales.length > 0 ? getTotalSales() / sales.length : 0;
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sale.id.toString().includes(searchQuery);
    
    if (selectedPeriod === 'all') return matchesSearch;
    
            const saleDate = new Date(sale.created_at);
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        return saleDate.toDateString() === now.toDateString() && matchesSearch;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= weekAgo && matchesSearch;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= monthAgo && matchesSearch;
      default:
        return matchesSearch;
    }
  });

  const handleViewDetails = (sale: SalesWithDetails) => {
    setSelectedSale(sale);
    setShowSaleDetails(true);
  };

  const handleCloseDetails = () => {
    setShowSaleDetails(false);
    setSelectedSale(null);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
            <p className="text-gray-600">View and manage sales transactions</p>
          </div>
          <button
            onClick={loadSales}
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

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">₹{getTotalSales().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalTransactions()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <p className="text-2xl font-bold text-gray-900">₹{getAverageSale().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Period</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{selectedPeriod}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by customer name or sale ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Sales Transactions ({filteredSales.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading sales...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sales found for the selected criteria.
          </div>
        ) : (
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{sale.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{sale.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(sale)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Sale Details Modal */}
      {showSaleDetails && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Sale Details</h3>
                <button
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Sale ID:</span> #{selectedSale.id}
                </div>
                <div>
                  <span className="font-medium">Customer:</span> {selectedSale.customer?.name || 'Walk-in Customer'}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> ₹{selectedSale.total_amount.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Payment Method:</span> {selectedSale.payment_method}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {formatDate(selectedSale.created_at)}
                </div>
                {selectedSale.tax_amount > 0 && (
                  <div>
                    <span className="font-medium">Tax:</span> ₹{selectedSale.tax_amount.toFixed(2)}
                  </div>
                )}
                {selectedSale.discount_amount > 0 && (
                  <div>
                    <span className="font-medium">Discount:</span> ₹{selectedSale.discount_amount.toFixed(2)}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseDetails}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales; 