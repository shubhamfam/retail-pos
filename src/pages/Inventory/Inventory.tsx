import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { Product, ProductVariant } from '../../types';

interface InventoryProps {
  setCurrentPage: (page: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ setCurrentPage }) => {
  const [lowStockItems, setLowStockItems] = useState<ProductVariant[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showBulkAdjustmentModal, setShowBulkAdjustmentModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);

  useEffect(() => {
    loadSettingsAndData();
  }, []);

  const loadSettingsAndData = async () => {
    try {
      // Load settings first
      const savedThreshold = await DatabaseService.getSetting('lowStockThreshold');
      if (savedThreshold) {
        setLowStockThreshold(parseInt(savedThreshold));
      }
      
      // Then load inventory data
      await loadInventoryData();
    } catch (error) {
      console.error('Error loading settings:', error);
      // Continue with default values
      await loadInventoryData();
    }
  };

  useEffect(() => {
    if (lowStockThreshold > 0) {
      loadInventoryData();
    }
  }, [lowStockThreshold]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [lowStock, outOfStock] = await Promise.all([
        DatabaseService.getLowStockItems(lowStockThreshold),
        DatabaseService.getOutOfStockItems()
      ]);
      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant) return;

    try {
      await DatabaseService.adjustStockQuantity(selectedVariant.id!, adjustmentAmount);
      setShowAdjustmentModal(false);
      setSelectedVariant(null);
      setAdjustmentAmount(0);
      loadInventoryData(); // Refresh data
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading inventory data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Monitor stock levels and manage inventory</p>
        </div>
        <button
          onClick={loadInventoryData}
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
      
      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Variants</p>
              <p className="text-2xl font-bold text-gray-900">
                {lowStockItems.length + outOfStockItems.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {lowStockItems.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {outOfStockItems.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {lowStockItems.length + outOfStockItems.length - outOfStockItems.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Management Actions */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowBulkAdjustmentModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            📦 Bulk Stock Adjustment
          </button>
        </div>
      </div>



      {/* Low Stock Items */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Low Stock Items ({lowStockItems.length})
        </h2>
        {lowStockItems.length === 0 ? (
          <p className="text-gray-500">No low stock items found.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockItems.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.color}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        variant.stock_quantity === 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {variant.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setSelectedVariant(variant);
                          setShowAdjustmentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Out of Stock Items */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Out of Stock Items ({outOfStockItems.length})
        </h2>
        {outOfStockItems.length === 0 ? (
          <p className="text-gray-500">No out of stock items found.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outOfStockItems.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.color}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {variant.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setSelectedVariant(variant);
                          setShowAdjustmentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Stock</h3>
            
            <div className="mb-4">
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
                  setShowAdjustmentModal(false);
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

      {/* Bulk Stock Adjustment Modal */}
      {showBulkAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Stock Adjustment</h3>
            
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

            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Select Items to Adjust:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[...lowStockItems, ...outOfStockItems].map((variant) => (
                  <label key={variant.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariant(variant);
                        } else {
                          setSelectedVariant(null);
                        }
                      }}
                    />
                    <span className="text-sm">
                      {variant.sku} - {variant.size} {variant.color} (Current: {variant.stock_quantity})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkAdjustmentModal(false);
                  setSelectedVariant(null);
                  setAdjustmentAmount(0);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedVariant && adjustmentAmount !== 0) {
                    handleStockAdjustment();
                    setShowBulkAdjustmentModal(false);
                  }
                }}
                disabled={!selectedVariant || adjustmentAmount === 0}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply to Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory; 