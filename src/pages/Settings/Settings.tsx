import React, { useState, useEffect } from 'react';
import ReceiptSettingsComponent from '../../components/ReceiptSettings/ReceiptSettings';
import { DatabaseService } from '../../services/databaseService';
import { Category, Brand } from '../../types';
import { invoke } from '@tauri-apps/api/core';

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
  const [activeTab, setActiveTab] = useState<'store' | 'system' | 'users' | 'receipt' | 'categories' | 'brands' | 'importexport' | 'license'>('store');
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
            name: 'posly',
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

  // Load store settings from database
  const loadStoreSettings = async () => {
    try {
      const settings = await DatabaseService.getAllSettings();
      const settingsMap = new Map(settings.map(s => [s.key, s.value]));
      
      setStoreSettings({
        name: settingsMap.get('store_name') || 'posly',
        address: settingsMap.get('store_address') || '123 Main Street, City, State 12345',
        phone: settingsMap.get('store_phone') || '+91 98765 43210',
        email: settingsMap.get('store_email') || 'info@clothesshop.com',
        gstNumber: settingsMap.get('store_gst_number') || 'GST123456789',
        taxRate: parseInt(settingsMap.get('tax_rate') || '12'),
        currency: settingsMap.get('currency') || 'INR'
      });
    } catch (error) {
      console.error('Error loading store settings:', error);
    }
  };

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    parentId: undefined as number | undefined
  });

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [newBrand, setNewBrand] = useState({
    name: '',
    description: ''
  });

  // Import/Export state
  const [importExportActiveTab, setImportExportActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'products' | 'customers' | 'salespersons'>('products');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string; path?: string } | null>(null);

  // License state
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<{ valid: boolean; message: string; expired?: boolean } | null>(null);
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [hasActiveLicense, setHasActiveLicense] = useState(false);
  const [licenseExpired, setLicenseExpired] = useState(false);

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
    loadStoreSettings();
    loadSettings();
    loadCategories();
    loadBrands();
    checkLicenseStatus();
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

  const loadCategories = async () => {
    try {
      const categoriesData = await DatabaseService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await DatabaseService.createCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || undefined,
        parentId: newCategory.parentId
      });
      
      setNewCategory({ name: '', description: '', parentId: undefined });
      setShowAddCategory(false);
      await loadCategories();
      alert('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category. Please try again.');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await DatabaseService.updateCategory({
        ...editingCategory,
        name: editingCategory.name.trim(),
        description: editingCategory.description?.trim() || undefined
      });
      
      setEditingCategory(null);
      await loadCategories();
      alert('Category updated successfully!');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.deleteCategory(categoryId);
      await loadCategories();
      alert('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  };

  const loadBrands = async () => {
    try {
      const brandsData = await DatabaseService.getBrands();
      setBrands(brandsData);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.name.trim()) {
      alert('Please enter a brand name');
      return;
    }

    try {
      await DatabaseService.createBrand({
        name: newBrand.name.trim(),
        description: newBrand.description.trim() || undefined
      });
      
      setNewBrand({ name: '', description: '' });
      setShowAddBrand(false);
      await loadBrands();
      alert('Brand added successfully!');
    } catch (error) {
      console.error('Error adding brand:', error);
      alert('Error adding brand. Please try again.');
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand || !editingBrand.name.trim()) {
      alert('Please enter a brand name');
      return;
    }

    try {
      await DatabaseService.updateBrand({
        ...editingBrand,
        name: editingBrand.name.trim(),
        description: editingBrand.description?.trim() || undefined
      });
      
      setEditingBrand(null);
      await loadBrands();
      alert('Brand updated successfully!');
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Error updating brand. Please try again.');
    }
  };

  const handleDeleteBrand = async (brandId: number) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.deleteBrand(brandId);
      await loadBrands();
      alert('Brand deleted successfully!');
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand. Please try again.');
    }
  };

  const saveStoreSettings = async () => {
    try {
      setLoading(true);
      
      // Save all store settings to database
      await Promise.all([
        DatabaseService.setSetting('store_name', storeSettings.name, 'Store name'),
        DatabaseService.setSetting('store_address', storeSettings.address, 'Store address'),
        DatabaseService.setSetting('store_phone', storeSettings.phone, 'Store phone number'),
        DatabaseService.setSetting('store_email', storeSettings.email, 'Store email address'),
        DatabaseService.setSetting('store_gst_number', storeSettings.gstNumber, 'Store GST number'),
        DatabaseService.setSetting('tax_rate', storeSettings.taxRate.toString(), 'Tax rate percentage'),
        DatabaseService.setSetting('currency', storeSettings.currency, 'Store currency')
      ]);
      
      console.log('Store settings saved successfully:', storeSettings);
      alert('Store settings saved successfully!');
    } catch (error) {
      console.error('Error saving store settings:', error);
      alert('Error saving store settings. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // License functions
  const checkLicenseStatus = async () => {
    try {
      const activeLicense = await invoke<any>('get_active_license');
      const hasLicense = activeLicense !== null;
      setHasActiveLicense(hasLicense);
      
      if (hasLicense) {
        const expired = await invoke<boolean>('is_license_expired');
        setLicenseExpired(expired);
        setLicenseStatus({
          valid: !expired,
          message: expired ? 'License has expired' : 'License is valid',
          expired
        });
      } else {
        setLicenseStatus({
          valid: false,
          message: 'No active license found'
        });
      }
      
      setLicenseChecked(true);
    } catch (error) {
      console.error('Error checking license:', error);
      setLicenseStatus({
        valid: false,
        message: 'Error checking license status'
      });
      setLicenseChecked(true);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      alert('Please enter a license key');
      return;
    }

    try {
      setLoading(true);
      await invoke('activate_license', { licenseKey: licenseKey.trim() });
      setLicenseStatus({
        valid: true,
        message: 'License activated successfully!'
      });
      setHasActiveLicense(true);
      setLicenseExpired(false);
      setLicenseKey('');
      alert('License activated successfully!');
    } catch (error) {
      console.error('Error activating license:', error);
      setLicenseStatus({
        valid: false,
        message: 'Invalid license key'
      });
      alert('Invalid license key');
    } finally {
      setLoading(false);
    }
  };

  // Import/Export functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    try {
      setLoading(true);
      
      // FORCE EXCEL CONVERSION FOR SETTINGS PAGE TOO
      let content = await importFile.text();
      
      // Check if this is an Excel file that was read as binary text
      const fileName = importFile.name.toLowerCase();
      const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const hasPKSignature = content.startsWith('PK') || content.includes('PK\u0003\u0004');
      const hasExcelPaths = content.includes('xl/') || content.includes('drawings/') || content.includes('worksheets/');
      const hasXMLContent = content.includes('.xml');
      const isBinaryContent = hasPKSignature || hasExcelPaths || hasXMLContent;
      
      console.log('=== SETTINGS PAGE EXCEL DETECTION ===');
      console.log('File name:', importFile.name);
      console.log('Is Excel file?', isExcelFile);
      console.log('Is binary content?', isBinaryContent);
      console.log('Content length:', content.length);
      console.log('First 100 chars:', content.substring(0, 100));
      
      if (isExcelFile && isBinaryContent) {
        console.log('🔧 CONVERTING EXCEL TO CSV IN SETTINGS PAGE');
        
        try {
          // Import XLSX library dynamically
          const XLSX = await import('xlsx');
          
          // Re-read the file as ArrayBuffer and convert to CSV
          const arrayBuffer = await importFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
          
          console.log('✅ Excel converted to CSV in Settings');
          console.log('CSV length:', csvContent.length);
          console.log('CSV first 200 chars:', csvContent.substring(0, 200));
          
          content = csvContent;
        } catch (error) {
          console.error('❌ Error converting Excel to CSV in Settings:', error);
          setImportResult({
            success: false,
            message: 'Error converting Excel file: ' + (error instanceof Error ? error.message : String(error))
          });
          setLoading(false);
          return;
        }
      }
      
      let result;
      switch (importType) {
        case 'products':
          result = await DatabaseService.importProductsFromCSVContent(content);
          break;
        case 'customers':
          result = await DatabaseService.importCustomersFromCSVContent(content);
          break;
        case 'salespersons':
          result = await DatabaseService.importSalespersonsFromCSVContent(content);
          break;
        default:
          throw new Error('Invalid import type');
      }

      setImportResult({
        success: true,
        message: `Successfully imported ${result.success_count} items. ${result.error_count > 0 ? `${result.error_count} errors occurred.` : ''}`
      });
      setImportFile(null);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: `Import failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      let result;
      
      switch (importType) {
        case 'products':
          result = await DatabaseService.exportProductsToCSV('');
          break;
        case 'customers':
          result = await DatabaseService.exportCustomersToCSV('');
          break;
        case 'salespersons':
          result = await DatabaseService.exportSalespersonsToCSV('');
          break;
        default:
          throw new Error('Invalid export type');
      }

      setExportResult({
        success: true,
        message: 'Export completed successfully!',
        path: result
      });
    } catch (error) {
      console.error('Export error:', error);
      setExportResult({
        success: false,
        message: `Export failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemplate = async () => {
    try {
      setLoading(true);
      let result;
      
      switch (importType) {
        case 'products':
          result = await DatabaseService.saveTemplateWithDialog('products');
          break;
        case 'customers':
          result = await DatabaseService.saveTemplateWithDialog('customers');
          break;
        case 'salespersons':
          result = await DatabaseService.saveTemplateWithDialog('salespersons');
          break;
        default:
          throw new Error('Invalid template type');
      }

      setExportResult({
        success: true,
        message: 'Template generated successfully!',
        path: result
      });
    } catch (error) {
      console.error('Template generation error:', error);
      setExportResult({
        success: false,
        message: `Template generation failed: ${error}`
      });
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
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'categories'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'brands'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Brands
          </button>
          <button
            onClick={() => setActiveTab('importexport')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'importexport'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Import/Export
          </button>
          <button
            onClick={() => setActiveTab('license')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'license'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            License
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Category Management</h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Add Category
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                  {category.parentId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Parent: {categories.find(c => c.id === category.parentId)?.name || 'Unknown'}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No categories found. Click "Add Category" to create your first category.</p>
              </div>
            )}
          </div>

          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add Category</h3>
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter category description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category (Optional)
                    </label>
                    <select
                      value={newCategory.parentId || ''}
                      onChange={(e) => setNewCategory({...newCategory, parentId: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No parent category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Category Modal */}
          {editingCategory && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Edit Category</h3>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Category
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Brand Management</h2>
            <button
              onClick={() => setShowAddBrand(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Add Brand
            </button>
          </div>

          {/* Brands List */}
          <div className="space-y-4">
            {brands.map(brand => (
              <div key={brand.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-sm text-gray-600 mt-1">{brand.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingBrand(brand)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            {brands.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No brands found. Click "Add Brand" to create your first brand.</p>
              </div>
            )}
          </div>

          {/* Add Brand Modal */}
          {showAddBrand && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add Brand</h3>
                  <button
                    onClick={() => setShowAddBrand(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={newBrand.name}
                      onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter brand name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newBrand.description}
                      onChange={(e) => setNewBrand({...newBrand, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter brand description"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddBrand(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBrand}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Brand
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Brand Modal */}
          {editingBrand && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Edit Brand</h3>
                  <button
                    onClick={() => setEditingBrand(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={editingBrand.name}
                      onChange={(e) => setEditingBrand({...editingBrand, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={editingBrand.description || ''}
                      onChange={(e) => setEditingBrand({...editingBrand, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingBrand(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateBrand}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Brand
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import/Export Tab */}
      {activeTab === 'importexport' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Import/Export Data</h2>
          
          {/* Import/Export Tab Navigation */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setImportExportActiveTab('import')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  importExportActiveTab === 'import'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setImportExportActiveTab('export')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  importExportActiveTab === 'export'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Export
              </button>
              <button
                onClick={() => setImportExportActiveTab('templates')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  importExportActiveTab === 'templates'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Templates
              </button>
            </div>
          </div>

          {/* Data Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as 'products' | 'customers' | 'salespersons')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="products">Products</option>
              <option value="customers">Customers</option>
              <option value="salespersons">Salespersons</option>
            </select>
          </div>

          {/* Import Tab */}
          {importExportActiveTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {importFile && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">Selected file: {importFile.name}</p>
                </div>
              )}
              
              <button
                onClick={handleImport}
                disabled={!importFile || loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import Data'}
              </button>
              
              {importResult && (
                <div className={`p-3 rounded-md ${
                  importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {importResult.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Export Tab */}
          {importExportActiveTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Export your {importType} data to a CSV file. The file will be saved to your Documents folder.
              </p>
              
              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Exporting...' : `Export ${importType.charAt(0).toUpperCase() + importType.slice(1)}`}
              </button>
              
              {exportResult && (
                <div className={`p-3 rounded-md ${
                  exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${exportResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {exportResult.message}
                  </p>
                  {exportResult.path && (
                    <p className="text-xs text-gray-600 mt-1">File saved to: {exportResult.path}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {importExportActiveTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate CSV templates for importing {importType}. Download the template, fill it with your data, and then import it.
              </p>
              
              <button
                onClick={handleGenerateTemplate}
                disabled={loading}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : `Generate ${importType.charAt(0).toUpperCase() + importType.slice(1)} Template`}
              </button>
              
              {exportResult && (
                <div className={`p-3 rounded-md ${
                  exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${exportResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {exportResult.message}
                  </p>
                  {exportResult.path && (
                    <p className="text-xs text-gray-600 mt-1">Template saved to: {exportResult.path}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* License Tab */}
      {activeTab === 'license' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">License Management</h2>
          
          {!licenseChecked ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Checking license status...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* License Status */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-2">License Status</h3>
                {licenseStatus && (
                  <div className={`p-3 rounded-md ${
                    licenseStatus.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${licenseStatus.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {licenseStatus.message}
                    </p>
                  </div>
                )}
              </div>

              {/* License Activation */}
              {!hasActiveLicense && (
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Activate License</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Key
                      </label>
                      <input
                        type="text"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="Enter your license key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleActivateLicense}
                      disabled={!licenseKey.trim() || loading}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Activating...' : 'Activate License'}
                    </button>
                  </div>
                </div>
              )}

              {/* License Information */}
              {hasActiveLicense && (
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">License Information</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Status: {licenseExpired ? 'Expired' : 'Active'}</p>
                    <p>Type: Trial License</p>
                    <p>Contact: gaikwad.shubham1311@gmail.com</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings; 