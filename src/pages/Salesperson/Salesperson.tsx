import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import type { Salesperson, SalespersonStats, User, Sale } from '../../types';
import { SaleStatus } from '../../types';
import { useKeyboardShortcuts, createNavigationShortcuts, createFormShortcuts } from '../../hooks/useKeyboardShortcuts';

interface SalespersonProps {
  setCurrentPage: (page: string) => void;
}

const Salesperson: React.FC<SalespersonProps> = ({ setCurrentPage }) => {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [topPerformers, setTopPerformers] = useState<SalespersonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedSalespersonForPerformance, setSelectedSalespersonForPerformance] = useState<Salesperson | null>(null);
  const [performanceData, setPerformanceData] = useState<Sale[]>([]);
  const [performancePeriod, setPerformancePeriod] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 0
  });

  useEffect(() => {
    loadSalespersons();
    loadTopPerformers();
  }, [selectedPeriod]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      ...createNavigationShortcuts(setCurrentPage),
      ...createFormShortcuts(() => {
        if (showAddForm) {
          setShowAddForm(false);
          setFormData({ name: '', email: '', phone: '', commissionRate: 0 });
        }
        if (showPerformanceModal) {
          setShowPerformanceModal(false);
        }
      })
    ]
  });

  // Auto-focus on name input when form opens
  useEffect(() => {
    if (showAddForm) {
      const nameInput = document.getElementById('salesperson-name-input');
      if (nameInput) {
        nameInput.focus();
      }
    }
    if (showEditForm) {
      const nameInput = document.getElementById('edit-salesperson-name-input');
      if (nameInput) {
        nameInput.focus();
      }
    }
  }, [showAddForm, showEditForm]);

  const loadSalespersons = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getAllSalespersons();
      setSalespersons(data);
    } catch (error) {
      console.error('Error loading salespersons:', error);
      alert('Error loading salespersons');
    } finally {
      setLoading(false);
    }
  };

  const loadTopPerformers = async () => {
    try {
      const data = await DatabaseService.getTopPerformers(selectedPeriod, 5);
      setTopPerformers(data);
    } catch (error) {
      console.error('Error loading top performers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create a default user first if needed
      const userId = await DatabaseService.createDefaultUser();
      
      const newSalesperson = await DatabaseService.createSalesperson(
        userId,
        formData.name,
        formData.email || undefined,
        formData.phone || undefined,
        formData.commissionRate
      );
      
      setSalespersons([...salespersons, newSalesperson]);
      setShowAddForm(false);
      setFormData({ name: '', email: '', phone: '', commissionRate: 0 });
      alert('Salesperson added successfully!');
    } catch (error) {
      console.error('Error adding salesperson:', error);
      alert(`Error adding salesperson: ${error}`);
    }
  };

  const handleViewPerformance = async (salesperson: Salesperson) => {
    try {
      setSelectedSalespersonForPerformance(salesperson);
      setShowPerformanceModal(true);
      
      // Load performance data
      const performance = await DatabaseService.getSalespersonPerformance(salesperson.id, performancePeriod);
      setPerformanceData(performance);
    } catch (error) {
      console.error('Error loading performance data:', error);
      alert('Error loading performance data');
    }
  };

  const handleEdit = (salesperson: Salesperson) => {
    console.log('Edit button clicked for salesperson:', salesperson);
    setEditingSalesperson(salesperson);
    setFormData({
      name: salesperson.name,
      email: salesperson.email || '',
      phone: salesperson.phone || '',
      commissionRate: salesperson.commission_rate
    });
    setShowEditForm(true);
    console.log('Edit modal should now be open');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSalesperson) return;
    
    try {
      const updatedSalesperson = await DatabaseService.updateSalesperson(
        editingSalesperson.id,
        formData.name,
        formData.email || undefined,
        formData.phone || undefined,
        formData.commissionRate
      );
      
      setSalespersons(salespersons.map(sp => 
        sp.id === editingSalesperson.id ? updatedSalesperson : sp
      ));
      setShowEditForm(false);
      setEditingSalesperson(null);
      setFormData({ name: '', email: '', phone: '', commissionRate: 0 });
      alert('Salesperson updated successfully!');
    } catch (error) {
      console.error('Error updating salesperson:', error);
      alert(`Error updating salesperson: ${error}`);
    }
  };

  const loadPerformanceData = async () => {
    if (selectedSalespersonForPerformance) {
      try {
        const performance = await DatabaseService.getSalespersonPerformance(
          selectedSalespersonForPerformance.id, 
          performancePeriod
        );
        setPerformanceData(performance);
      } catch (error) {
        console.error('Error loading performance data:', error);
      }
    }
  };

  useEffect(() => {
    if (showPerformanceModal) {
      loadPerformanceData();
    }
  }, [performancePeriod, showPerformanceModal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Salesperson Management</h1>
            <p className="text-gray-600">Track and manage salesperson performance</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadSalespersons}
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
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Salesperson
            </button>
          </div>
        </div>

        {/* Top Performers Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {topPerformers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No performance data available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerformers.map((performer, index) => (
                <div key={performer.salespersonId} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="ml-2 font-medium text-gray-900">{performer.salespersonName}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">{formatCurrency(performer.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transactions:</span>
                      <span className="font-medium">{performer.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Sale:</span>
                      <span className="font-medium">{formatCurrency(performer.averageSaleValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission:</span>
                      <span className="font-medium text-green-600">{formatCurrency(performer.commissionEarned)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salesperson List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Salespersons</h2>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading salespersons...</p>
            </div>
          ) : salespersons.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No salespersons found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salespersons.map((salesperson) => (
                    <tr key={salesperson.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{salesperson.name}</div>
                        <div className="text-sm text-gray-500">ID: {salesperson.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{salesperson.email || '-'}</div>
                        <div className="text-sm text-gray-500">{salesperson.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{salesperson.commission_rate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          salesperson.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {salesperson.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleViewPerformance(salesperson)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Performance
                        </button>
                        <button 
                          onClick={() => handleEdit(salesperson)}
                          className="text-green-600 hover:text-green-900 font-medium underline"
                        >
                          Edit
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

      {/* Add Salesperson Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Salesperson</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="salesperson-name-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  id="salesperson-name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                >
                  Add Salesperson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salesperson Modal */}
      {showEditForm && editingSalesperson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Salesperson</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-salesperson-name-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  id="edit-salesperson-name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingSalesperson(null);
                    setFormData({ name: '', email: '', phone: '', commissionRate: 0 });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                >
                  Update Salesperson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && selectedSalespersonForPerformance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Performance for {selectedSalespersonForPerformance.name}
            </h3>
            <div className="flex justify-between items-center mb-4">
              <select
                value={performancePeriod}
                onChange={(e) => setPerformancePeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {performanceData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No performance data available for this period.</p>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600">Total Sales</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(performanceData.reduce((sum, sale) => sum + sale.total_amount, 0))}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600">Transactions</div>
                    <div className="text-2xl font-bold text-green-900">{performanceData.length}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600">Average Sale</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(performanceData.length > 0 ? 
                        performanceData.reduce((sum, sale) => sum + sale.total_amount, 0) / performanceData.length : 0
                      )}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-orange-600">Commission</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {formatCurrency(performanceData.reduce((sum, sale) => sum + sale.total_amount, 0) * 0.05)}
                    </div>
                  </div>
                </div>

                {/* Sales List */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {performanceData.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.payment_method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              sale.status === SaleStatus.COMPLETED 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salesperson; 