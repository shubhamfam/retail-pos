import React, { useState } from 'react';
import { DatabaseService } from '../../services/databaseService';
import * as XLSX from 'xlsx';

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
    alert('🔥 FILE SELECTED!');
    console.log('🔥 handleFileSelect CALLED!');
    console.log('Event:', event);
    console.log('Files:', event.target.files);
    
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    
    if (file) {
      setSelectedFile(file);
      
      const fileName = file.name.toLowerCase();
      const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      console.log('=== FILE DETECTION ===');
      console.log('File name:', file.name);
      console.log('File name (lowercase):', fileName);
      console.log('Is Excel file?', isXlsx);
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      console.log('=== END FILE DETECTION ===');
      
      if (isXlsx) {
        // Handle XLSX files - simple and direct approach
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            console.log('=== FRONTEND: READING EXCEL FILE ===');
            const data = e.target?.result as ArrayBuffer;
            console.log('ArrayBuffer length:', data.byteLength);
            console.log('ArrayBuffer type:', typeof data);
            
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Workbook read successfully');
            console.log('Sheet names:', workbook.SheetNames);
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            console.log('First sheet obtained');
            
            // Convert directly to CSV - let SheetJS handle the complexity
            const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
            console.log('CSV conversion completed');
            console.log('CSV is string?', typeof csvContent === 'string');
            console.log('=== END FRONTEND READING ===');
            
            console.log('=== STEP 1: RAW CSV FROM SHEETJS ===');
            console.log('Raw CSV length:', csvContent.length);
            console.log('Raw CSV (first 500 chars):');
            console.log(csvContent.substring(0, 500));
            console.log('Raw CSV (full content):');
            console.log(csvContent);
            console.log('=== END STEP 1 ===');
            
            // Validate that we have some content
            if (!csvContent || csvContent.trim().length === 0) {
              alert('Excel file appears to be empty');
              return;
            }
            
            // Validate that we have some content and basic structure
            console.log('=== STEP 2: ANALYZING CSV STRUCTURE ===');
            const allLines = csvContent.split('\n');
            const lines = allLines.filter(line => line.trim());
            
            console.log('Total lines (including empty):', allLines.length);
            console.log('Non-empty lines:', lines.length);
            console.log('First 5 raw lines:');
            allLines.slice(0, 5).forEach((line, i) => {
              console.log(`Raw Line ${i}: "${line}" (length: ${line.length})`);
            });
            
            if (lines.length < 2) {
              alert('Excel file must have at least a header row and one data row');
              return;
            }
            
            console.log('Header line:', lines[0]);
            console.log('Number of data lines:', lines.length - 1);
            console.log('=== END STEP 2 ===');
            
            // Since SheetJS already handles CSV formatting properly (including quoted fields),
            // and your Excel file has the correct structure, we'll use it as-is
            
            // Check if header contains expected fields (case-insensitive)
            console.log('=== STEP 3: HEADER VALIDATION ===');
            const headerLower = lines[0].toLowerCase();
            console.log('Header (lowercase):', headerLower);
            console.log('Contains name?', headerLower.includes('name'));
            console.log('Contains brand?', headerLower.includes('brand'));
            console.log('Contains category?', headerLower.includes('category'));
            console.log('Contains price_adjustment?', headerLower.includes('price_adjustment'));
            
            let finalCsvContent;
            
            if (headerLower.includes('name') && 
                headerLower.includes('brand') && 
                headerLower.includes('category') &&
                headerLower.includes('price_adjustment')) {
              
              console.log('✅ Excel file contains all expected fields - using SheetJS CSV output directly');
              finalCsvContent = csvContent;
              
            } else if (headerLower.includes('name') && 
                       headerLower.includes('brand') && 
                       headerLower.includes('category')) {
              
              console.log('⚠️ File missing some expected fields, but proceeding with conversion');
              finalCsvContent = csvContent;
              
            } else {
              console.error('❌ Header does not contain expected fields');
              console.error('Expected fields: name, brand, category, subcategory, description, base_price, cost_price, size, color, stock_quantity, price_adjustment');
              console.error('Found header:', lines[0]);
              finalCsvContent = csvContent;
            }
            console.log('=== END STEP 3 ===');
            
            console.log('Final CSV content (first 500 chars):');
            console.log(finalCsvContent.substring(0, 500));
            
            // Enhanced debugging - show exactly what will be sent to backend
            console.log('=== STEP 4: FINAL CSV CONTENT BEING SENT TO BACKEND ===');
            const debugLines = finalCsvContent.split('\n');
            console.log('Final CSV length:', finalCsvContent.length);
            console.log('Total lines:', debugLines.length);
            
            // Check for potential issues
            const nonEmptyLines = debugLines.filter(line => line.trim());
            console.log('Non-empty lines:', nonEmptyLines.length);
            
            console.log('First 10 lines with details:');
            debugLines.slice(0, 10).forEach((line, i) => {
              console.log(`Line ${i}: (${line.length} chars) "${line}"`);
            });
            
            // Show raw bytes for first few lines to check for encoding issues
            if (debugLines[0]) {
              console.log('Header line character codes:', Array.from(debugLines[0]).map(c => c.charCodeAt(0)));
            }
            
            if (nonEmptyLines.length > 1) {
              console.log('Sample data line:', nonEmptyLines[1]);
              console.log('Sample data line character codes:', Array.from(nonEmptyLines[1]).map(c => c.charCodeAt(0)));
            }
            
            // Show the exact content that will be sent to backend
            console.log('EXACT CONTENT BEING SENT TO BACKEND:');
            console.log('--- START CSV ---');
            console.log(finalCsvContent);
            console.log('--- END CSV ---');
            console.log('=== END STEP 4 ===');
            
            // Final validation before setting content
            console.log('=== FINAL VALIDATION ===');
            console.log('Final content type:', typeof finalCsvContent);
            console.log('Final content is string?', typeof finalCsvContent === 'string');
            console.log('Final content length:', finalCsvContent.length);
            console.log('Final content starts with header?', finalCsvContent.toLowerCase().includes('name'));
            
            if (typeof finalCsvContent !== 'string') {
              console.error('❌ ERROR: Final content is not a string!');
              alert('Error: Converted content is not text format');
              return;
            }
            
            if (!finalCsvContent.toLowerCase().includes('name')) {
              console.error('❌ ERROR: Final content does not contain expected header!');
              alert('Error: Converted content does not contain product headers');
              return;
            }
            
            console.log('✅ Validation passed - setting CSV content');
            setSelectedFileContent(finalCsvContent);
            
          } catch (error) {
            console.error('Error processing Excel file:', error);
            alert('Error reading Excel file: ' + (error instanceof Error ? error.message : String(error)));
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Handle CSV files (existing logic)
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setSelectedFileContent(content);
        };
        reader.readAsText(file);
      }
    } else {
      console.log('❌ No file selected');
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

      // FORCE EXCEL CONVERSION AT IMPORT TIME
      let contentToImport = selectedFileContent;
      
      // Check if this is an Excel file that was read as binary text
      const fileName = selectedFile.name.toLowerCase();
      const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      // Check for ZIP signature and Excel-specific paths in the content
      const hasPKSignature = selectedFileContent.startsWith('PK') || selectedFileContent.includes('PK\u0003\u0004');
      const hasExcelPaths = selectedFileContent.includes('xl/') || selectedFileContent.includes('drawings/') || selectedFileContent.includes('worksheets/');
      const hasXMLContent = selectedFileContent.includes('.xml');
      const isBinaryContent = hasPKSignature || hasExcelPaths || hasXMLContent;
      
      console.log('=== IMPORT TIME EXCEL DETECTION ===');
      console.log('File name:', selectedFile.name);
      console.log('File type:', selectedFile.type);
      console.log('Is Excel file?', isExcelFile);
      console.log('Has PK signature?', hasPKSignature);
      console.log('Has Excel paths?', hasExcelPaths);
      console.log('Has XML content?', hasXMLContent);
      console.log('Is binary content?', isBinaryContent);
      console.log('Content length:', selectedFileContent.length);
      console.log('Content starts with:', selectedFileContent.substring(0, 20));
      console.log('First 100 chars:', selectedFileContent.substring(0, 100));
      
      if (isExcelFile && isBinaryContent) {
        console.log('🔧 CONVERTING EXCEL TO CSV AT IMPORT TIME');
        
        try {
          // Re-read the file as ArrayBuffer and convert to CSV
          console.log('Reading file as ArrayBuffer...');
          const arrayBuffer = await selectedFile.arrayBuffer();
          console.log('ArrayBuffer size:', arrayBuffer.byteLength);
          
          console.log('Parsing with XLSX...');
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          console.log('Sheet names:', workbook.SheetNames);
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          console.log('Converting to CSV...');
          const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
          
          console.log('✅ Excel converted to CSV');
          console.log('CSV length:', csvContent.length);
          console.log('CSV first 200 chars:', csvContent.substring(0, 200));
          console.log('CSV is string?', typeof csvContent === 'string');
          
          contentToImport = csvContent;
        } catch (error) {
          console.error('❌ Error converting Excel to CSV:', error);
          alert('Error converting Excel file: ' + (error instanceof Error ? error.message : String(error)));
          return;
        }
      } else {
        console.log('⚠️ Not converting: isExcelFile=' + isExcelFile + ', isBinaryContent=' + isBinaryContent);
      }

      let result: ImportResult;
      if (type === 'products') {
        result = await DatabaseService.importProductsFromCSVContent(contentToImport);
      } else if (type === 'customers') {
        result = await DatabaseService.importCustomersFromCSVContent(contentToImport);
      } else {
        result = await DatabaseService.importSalespersonsFromCSVContent(contentToImport);
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
                  Select CSV or XLSX File
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {selectedFile.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Supports CSV and Excel (.xlsx, .xls) files
                </p>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Import Products</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import products with variants from CSV or Excel file
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
                    Import customer data from CSV or Excel file
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
                    Import salesperson data from CSV or Excel file
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