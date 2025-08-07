import React, { useState, useEffect } from 'react';
import ReceiptSettingsComponent from '../../components/ReceiptSettings/ReceiptSettings';
import { DatabaseService } from '../../services/databaseService';

interface SettingsProps {
  setCurrentPage: (page: string) => void;
}

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  taxRate: number;
  currency: string;
}

const Settings: React.FC<SettingsProps> = ({ setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState<'store' | 'system' | 'users' | 'receipt'>('store');
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'Clothes Shop POS',
    address: '123 Main Street, City, State 12345',
    phone: '+91 98765 43210',
    email: 'info@clothesshop.com',
    gstNumber: 'GST123456789',
    taxRate: 12,
    currency: 'INR'
  });
  const [systemSettings, setSystemSettings] = useState({
    lowStockThreshold: 10,
    enableBackups: true,
    showLowStockAlerts: true,
    enableKeyboardShortcuts: true,
    autoPrintReceipts: false
  });
  const [loading, setLoading] = useState(false);

  const handleStoreSettingsChange = (field: keyof StoreSettings, value: string | number) => {
    setStoreSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSystemSettingsChange = (field: string, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load system settings
      const savedThreshold = await DatabaseService.getSetting('lowStockThreshold');
      if (savedThreshold) {
        setSystemSettings(prev => ({
          ...prev,
          lowStockThreshold: parseInt(savedThreshold)
        }));
      }

      const enableBackups = await DatabaseService.getSetting('enableBackups');
      if (enableBackups) {
        setSystemSettings(prev => ({
          ...prev,
          enableBackups: enableBackups === 'true'
        }));
      }

      const showLowStockAlerts = await DatabaseService.getSetting('showLowStockAlerts');
      if (showLowStockAlerts) {
        setSystemSettings(prev => ({
          ...prev,
          showLowStockAlerts: showLowStockAlerts === 'true'
        }));
      }

      const enableKeyboardShortcuts = await DatabaseService.getSetting('enableKeyboardShortcuts');
      if (enableKeyboardShortcuts) {
        setSystemSettings(prev => ({
          ...prev,
          enableKeyboardShortcuts: enableKeyboardShortcuts === 'true'
        }));
      }

      const autoPrintReceipts = await DatabaseService.getSetting('autoPrintReceipts');
      if (autoPrintReceipts) {
        setSystemSettings(prev => ({
          ...prev,
          autoPrintReceipts: autoPrintReceipts === 'true'
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStoreSettings = () => {
    // In a real app, this would save to database
    console.log('Saving store settings:', storeSettings);
    alert('Store settings saved successfully!');
  };

  const saveSystemSettings = async () => {
    try {
      setLoading(true);
      
      // Save all system settings
      await Promise.all([
        DatabaseService.setSetting('lowStockThreshold', systemSettings.lowStockThreshold.toString(), 'Low stock threshold for inventory alerts'),
        DatabaseService.setSetting('enableBackups', systemSettings.enableBackups.toString(), 'Enable automatic backups'),
        DatabaseService.setSetting('showLowStockAlerts', systemSettings.showLowStockAlerts.toString(), 'Show low stock alerts'),
        DatabaseService.setSetting('enableKeyboardShortcuts', systemSettings.enableKeyboardShortcuts.toString(), 'Enable keyboard shortcuts'),
        DatabaseService.setSetting('autoPrintReceipts', systemSettings.autoPrintReceipts.toString(), 'Auto-print receipts')
      ]);
      
      alert('System settings saved successfully!');
    } catch (error) {
      console.error('Error saving system settings:', error);
      alert('Error saving system settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'store'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Store Settings
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'receipt'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Receipt Settings
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'system'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            System Preferences
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'users'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Management
          </button>
        </div>
      </div>

      {/* Receipt Settings Tab */}
      {activeTab === 'receipt' && (
        <ReceiptSettingsComponent />
      )}

      {/* Store Settings Tab */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Store Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name
              </label>
              <input
                type="text"
                value={storeSettings.name}
                onChange={(e) => handleStoreSettingsChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Address
              </label>
              <input
                type="text"
                value={storeSettings.address}
                onChange={(e) => handleStoreSettingsChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={storeSettings.phone}
                onChange={(e) => handleStoreSettingsChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={storeSettings.email}
                onChange={(e) => handleStoreSettingsChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={storeSettings.gstNumber}
                onChange={(e) => handleStoreSettingsChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={storeSettings.taxRate}
                onChange={(e) => handleStoreSettingsChange('taxRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={storeSettings.currency}
                onChange={(e) => handleStoreSettingsChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={saveStoreSettings}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* System Preferences Tab */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Preferences</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Low Stock Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Low Stock Threshold
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={systemSettings.lowStockThreshold}
                    onChange={(e) => handleSystemSettingsChange('lowStockThreshold', parseInt(e.target.value) || 1)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">items</span>
                  <span className="text-xs text-gray-400">
                    Products with stock ≤ this number will be flagged as low stock
                  </span>
                </div>
              </div>

              {/* Checkbox Settings */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={systemSettings.enableBackups}
                      onChange={(e) => handleSystemSettingsChange('enableBackups', e.target.checked)}
                    />
                    Enable automatic backups
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={systemSettings.showLowStockAlerts}
                      onChange={(e) => handleSystemSettingsChange('showLowStockAlerts', e.target.checked)}
                    />
                    Show low stock alerts
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={systemSettings.enableKeyboardShortcuts}
                      onChange={(e) => handleSystemSettingsChange('enableKeyboardShortcuts', e.target.checked)}
                    />
                    Enable keyboard shortcuts
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={systemSettings.autoPrintReceipts}
                      onChange={(e) => handleSystemSettingsChange('autoPrintReceipts', e.target.checked)}
                    />
                    Auto-print receipts
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={saveSystemSettings}
                  disabled={loading}
                  className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Management</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">Admin User</h3>
                <p className="text-sm text-gray-600">admin@clothesshop.com</p>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            
            <div className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">Cashier 1</h3>
                <p className="text-sm text-gray-600">cashier1@clothesshop.com</p>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            
            <div className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">Manager</h3>
                <p className="text-sm text-gray-600">manager@clothesshop.com</p>
              </div>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">Inactive</span>
            </div>
          </div>
          
          <div className="mt-6">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              Add New User
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 