import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { RefundWithItems, RefundStatus, RefundStatistics, Sale, SaleItem } from '../../types';

interface RefundsProps {
  setCurrentPage: (page: string) => void;
}

const Refunds: React.FC<RefundsProps> = ({ setCurrentPage }) => {
  const [refunds, setRefunds] = useState<RefundWithItems[]>([]);
  const [statistics, setStatistics] = useState<RefundStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundWithItems | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Refund creation state
  const [availableSales, setAvailableSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[key: number]: number}>({}); // sale_item_id -> quantity
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('partial');
  const [creatingRefund, setCreatingRefund] = useState(false);

  useEffect(() => {
    loadRefunds();
    loadStatistics();
    loadAvailableSales();
  }, []);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const refundsData = await DatabaseService.getAllRefunds(50);
      setRefunds(refundsData);
    } catch (error) {
      console.error('Error loading refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await DatabaseService.getRefundStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading refund statistics:', error);
    }
  };

  const loadAvailableSales = async () => {
    try {
      const sales = await DatabaseService.getRecentSales(100);
      setAvailableSales(sales);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const handleSaleSelect = async (sale: Sale) => {
    setSelectedSale(sale);
    try {
      const items = await DatabaseService.getSaleItems(sale.id);
      setSaleItems(items);
      setSelectedItems({});
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  const handleItemToggle = (saleItemId: number, maxQuantity: number) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[saleItemId]) {
        delete newItems[saleItemId];
      } else {
        newItems[saleItemId] = maxQuantity;
      }
      return newItems;
    });
  };

  const handleItemQuantityChange = (saleItemId: number, quantity: number, maxQuantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(prev => {
        const newItems = { ...prev };
        delete newItems[saleItemId];
        return newItems;
      });
    } else if (quantity <= maxQuantity) {
      setSelectedItems(prev => ({
        ...prev,
        [saleItemId]: quantity
      }));
    }
  };

  const calculateRefundAmount = () => {
    let total = 0;
    saleItems.forEach(item => {
      if (selectedItems[item.id!]) {
        const quantity = selectedItems[item.id!];
        const itemTotal = (item.unit_price - item.discount) * quantity;
        total += itemTotal;
      }
    });
    return total;
  };

  const handleCreateRefund = async () => {
    if (!selectedSale || Object.keys(selectedItems).length === 0 || !refundReason.trim()) {
      alert('Please select a sale, items to refund, and provide a reason.');
      return;
    }

    try {
      setCreatingRefund(true);
      
      const refundItems = Object.entries(selectedItems).map(([saleItemId, quantity]) => {
        const saleItem = saleItems.find(item => item.id === parseInt(saleItemId));
        const refundAmount = saleItem ? (saleItem.unit_price - saleItem.discount) * quantity : 0;
        return {
          sale_item_id: parseInt(saleItemId),
          quantity,
          refund_amount: refundAmount,
          reason: refundReason
        };
      });

      const totalRefundAmount = calculateRefundAmount();

      await DatabaseService.createRefund(
        selectedSale.id,
        1, // user_id - using default user for now
        totalRefundAmount,
        refundReason,
        refundType,
        refundNotes || undefined,
        refundItems
      );

      // Reset form
      setSelectedSale(null);
      setSaleItems([]);
      setSelectedItems({});
      setRefundReason('');
      setRefundNotes('');
      setRefundType('partial');
      setShowCreateModal(false);

      // Reload data
      await loadRefunds();
      await loadStatistics();
      
      alert('Refund created successfully!');
    } catch (error) {
      console.error('Error creating refund:', error);
      alert('Error creating refund. Please try again.');
    } finally {
      setCreatingRefund(false);
    }
  };

  const handleViewDetails = (refund: RefundWithItems) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (refundId: number, status: string) => {
    try {
      await DatabaseService.updateRefundStatus(refundId, status);
      await loadRefunds();
      await loadStatistics();
    } catch (error) {
      console.error('Error updating refund status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Refunds Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Refund
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Total Refunds</h3>
            <p className="text-3xl font-bold text-blue-600">{statistics.total_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Total Amount</h3>
            <p className="text-3xl font-bold text-green-600">₹{statistics.total_amount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Today's Refunds</h3>
            <p className="text-3xl font-bold text-orange-600">{statistics.today_count}</p>
          </div>
        </div>
      )}

      {/* Refunds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Refunds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {refunds.map((refundWithItems) => {
                const refund = refundWithItems.refund;
                return (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{refund.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{refund.sale_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{refund.refund_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">{refund.refund_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(refund.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(refundWithItems)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {refund.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(refund.id, 'approved')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(refund.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {refund.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(refund.id, 'completed')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Details Modal */}
      {showDetailsModal && selectedRefund && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Refund Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Refund ID</label>
                  <p className="text-sm text-gray-900">#{selectedRefund.refund.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sale ID</label>
                  <p className="text-sm text-gray-900">#{selectedRefund.refund.sale_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-sm text-gray-900">₹{selectedRefund.refund.refund_amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedRefund.refund.refund_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRefund.refund.status)}`}>
                    {selectedRefund.refund.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedRefund.refund.created_at)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm text-gray-900">{selectedRefund.refund.refund_reason}</p>
              </div>
              
              {selectedRefund.refund.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900">{selectedRefund.refund.notes}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Refunded Items</label>
                <div className="space-y-2">
                  {selectedRefund.items.map((item) => (
                    <div key={item.id} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Quantity: {item.quantity}</p>
                          <p className="text-sm text-gray-600">Unit Price: ₹{item.unit_price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Refund Amount: ₹{item.refund_amount.toFixed(2)}</p>
                        </div>
                        {item.reason && (
                          <div className="text-sm text-gray-600">
                            <p className="font-medium">Reason:</p>
                            <p>{item.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Refund Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Refund</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Step 1: Select Sale */}
              <div>
                <h4 className="text-md font-semibold mb-3">Step 1: Select Sale</h4>
                <select
                  value={selectedSale?.id || ''}
                  onChange={(e) => {
                    const sale = availableSales.find(s => s.id === parseInt(e.target.value));
                    if (sale) handleSaleSelect(sale);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a sale to refund</option>
                  {availableSales.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      Sale #{sale.id} - ₹{sale.total_amount.toFixed(2)} - {formatDate(sale.created_at)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Items (if sale is selected) */}
              {selectedSale && saleItems.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-3">Step 2: Select Items to Refund</h4>
                  <div className="space-y-3">
                    {saleItems.map(item => {
                      const isSelected = selectedItems[item.id!];
                      const maxQuantity = item.quantity;
                      return (
                        <div key={item.id} className="border rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">Item #{item.id}</p>
                              <p className="text-sm text-gray-600">
                                Unit Price: ₹{item.unit_price.toFixed(2)} | 
                                Quantity: {item.quantity} | 
                                Total: ₹{item.total.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => handleItemToggle(item.id!, maxQuantity)}
                                className="rounded border-gray-300"
                              />
                              {isSelected && (
                                <input
                                  type="number"
                                  min="1"
                                  max={maxQuantity}
                                  value={isSelected}
                                  onChange={(e) => handleItemQuantityChange(item.id!, parseInt(e.target.value), maxQuantity)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Refund Details */}
              {Object.keys(selectedItems).length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-3">Step 3: Refund Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refund Type
                      </label>
                      <select
                        value={refundType}
                        onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="partial">Partial Refund</option>
                        <option value="full">Full Refund</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Refund Amount
                      </label>
                      <p className="text-lg font-bold text-green-600">
                        ₹{calculateRefundAmount().toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Reason *
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the reason for this refund..."
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRefund}
                  disabled={creatingRefund || Object.keys(selectedItems).length === 0 || !refundReason.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingRefund ? 'Creating...' : 'Create Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Refunds; 