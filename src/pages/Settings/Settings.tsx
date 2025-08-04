import React, { useState } from 'react';
import ReceiptSettingsComponent from '../../components/ReceiptSettings/ReceiptSettings';

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

  const handleStoreSettingsChange = (field: keyof StoreSettings, value: string | number) => {
    setStoreSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSettings = () => {
    // In a real app, this would save to database
    console.log('Saving settings:', storeSettings);
    alert('Settings saved successfully!');
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
              onClick={saveSettings}
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
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Enable automatic backups
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Show low stock alerts
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Enable keyboard shortcuts
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Auto-print receipts
              </label>
            </div>
          </div>
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