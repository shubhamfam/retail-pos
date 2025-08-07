import React, { useState } from 'react';
import { DatabaseService } from '../../services/databaseService';

interface ImportExportProps {
  setCurrentPage: (page: string) => void;
}

interface ImportResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

const ImportExport: React.FC<ImportExportProps> = ({ setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [exportPath, setExportPath] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<{products: boolean, customers: boolean, salespersons: boolean}>({
    products: false,
    customers: false,
    salespersons: false
  });
  const [downloadPaths, setDownloadPaths] = useState<{products: string, customers: string, salespersons: string}>({
    products: '',
    customers: '',
    salespersons: ''
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSelectedFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async (type: 'products' | 'customers' | 'salespersons') => {
    if (!selectedFile || !selectedFileContent) {
      alert('Please select a file to import');
      return;
    }

    try {
      setLoading(true);
      setImportResult(null);

      let result: ImportResult;
      if (type === 'products') {
        result = await DatabaseService.importProductsFromCSVContent(selectedFileContent);
      } else if (type === 'customers') {
        result = await DatabaseService.importCustomersFromCSVContent(selectedFileContent);
      } else {
        result = await DatabaseService.importSalespersonsFromCSVContent(selectedFileContent);
      }

      setImportResult(result);
      
      if (result.error_count === 0) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} imported successfully! ${result.success_count} records imported.\n\nPlease refresh the Products page to see the imported data.`);
      } else {
        alert(`Import completed with ${result.error_count} errors. ${result.success_count} records imported successfully.`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'products' | 'customers' | 'salespersons') => {
    if (!exportPath) {
      alert('Please enter a file path for export');
      return;
    }

    try {
      setLoading(true);

      if (type === 'products') {
        await DatabaseService.exportProductsToCSV(exportPath);
      } else if (type === 'customers') {
        await DatabaseService.exportCustomersToCSV(exportPath);
      } else {
        // Note: Salesperson export not implemented yet, would need backend support
        alert('Salesperson export not implemented yet');
        return;
      }

      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully to ${exportPath}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemplate = async (type: 'products' | 'customers' | 'salespersons') => {
    try {
      setLoading(true);

      const result = await DatabaseService.saveTemplateWithDialog(type);
      
      // Show success message with better formatting
      const message = result.replace(/\n/g, '\n');
      alert(message);
      
      // Update download success state
      setDownloadSuccess(prev => ({ ...prev, [type]: true }));
      setDownloadPaths(prev => ({ 
        ...prev, 
        [type]: result.match(/Location: (.+)/)?.[1] || 'Unknown location'
      }));
    } catch (error) {
      console.error('Template generation error:', error);
      alert(`Template generation failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import/Export</h1>
          <p className="text-gray-600">Manage your data with import/export functionality</p>
        </div>
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'import'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📥 Import Data
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'export'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📤 Export Data
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'templates'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Download Templates
          </button>

        </div>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Import Data</h2>
            
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
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {selectedFile.name}</p>
                )}
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Import Products</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import products with variants from CSV file
                  </p>
                  <button
                    onClick={() => handleImport('products')}
                    disabled={loading || !selectedFileContent}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Importing...' : 'Import Products'}
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Import Customers</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import customer data from CSV file
                  </p>
                  <button
                    onClick={() => handleImport('customers')}
                    disabled={loading || !selectedFileContent}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Importing...' : 'Import Customers'}
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Import Salespersons</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import salesperson data from CSV file
                  </p>
                  <button
                    onClick={() => handleImport('salespersons')}
                    disabled={loading || !selectedFileContent}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Importing...' : 'Import Salespersons'}
                  </button>
                </div>
              </div>

              {importResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Import Results</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium text-green-600">✓ Success:</span> {importResult.success_count} records
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-red-600">✗ Errors:</span> {importResult.error_count} records
                    </p>
                    {importResult.errors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Error Details:</p>
                        <div className="max-h-32 overflow-y-auto text-xs text-red-600">
                          {importResult.errors.map((error, index) => (
                            <p key={index} className="mb-1">• {error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Export Data</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export File Path
                </label>
                <input
                  type="text"
                  value={exportPath}
                  onChange={(e) => setExportPath(e.target.value)}
                  placeholder="e.g., /path/to/export.csv"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Export Products</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Export all products with variants to CSV
                  </p>
                  <button
                    onClick={() => handleExport('products')}
                    disabled={loading || !exportPath}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Exporting...' : 'Export Products'}
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Export Customers</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Export all customer data to CSV
                  </p>
                  <button
                    onClick={() => handleExport('customers')}
                    disabled={loading || !exportPath}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Exporting...' : 'Export Customers'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Download Templates</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">📋 Template Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Download the template file to your computer</li>
                  <li>• Fill in your data following the example format</li>
                  <li>• Save the file as CSV format</li>
                  <li>• Use the Import tab to upload your data</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border rounded-lg p-4 ${downloadSuccess.products ? 'border-green-300 bg-green-50' : ''}`}>
                  <h3 className="font-medium text-gray-900 mb-2">Product Template</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Template for importing products with variants
                  </p>
                  <button
                    onClick={() => handleGenerateTemplate('products')}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Download Product Template'}
                  </button>
                  {downloadSuccess.products && (
                    <div className="mt-2 text-sm text-green-600">
                      <div className="flex items-center mb-1">
                        <span className="mr-1">✅</span>
                        Downloaded successfully
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        📁 {downloadPaths.products}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`border rounded-lg p-4 ${downloadSuccess.customers ? 'border-green-300 bg-green-50' : ''}`}>
                  <h3 className="font-medium text-gray-900 mb-2">Customer Template</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Template for importing customer data
                  </p>
                  <button
                    onClick={() => handleGenerateTemplate('customers')}
                    disabled={loading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Download Customer Template'}
                  </button>
                  {downloadSuccess.customers && (
                    <div className="mt-2 text-sm text-green-600">
                      <div className="flex items-center mb-1">
                        <span className="mr-1">✅</span>
                        Downloaded successfully
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        📁 {downloadPaths.customers}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`border rounded-lg p-4 ${downloadSuccess.salespersons ? 'border-green-300 bg-green-50' : ''}`}>
                  <h3 className="font-medium text-gray-900 mb-2">Salesperson Template</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Template for importing salesperson data
                  </p>
                  <button
                    onClick={() => handleGenerateTemplate('salespersons')}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Download Salesperson Template'}
                  </button>
                  {downloadSuccess.salespersons && (
                    <div className="mt-2 text-sm text-green-600">
                      <div className="flex items-center mb-1">
                        <span className="mr-1">✅</span>
                        Downloaded successfully
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        📁 {downloadPaths.salespersons}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Don't modify the header row in templates</li>
                  <li>• Ensure all required fields are filled</li>
                  <li>• Use proper date formats (YYYY-MM-DD)</li>
                  <li>• Backup your data before importing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport; 