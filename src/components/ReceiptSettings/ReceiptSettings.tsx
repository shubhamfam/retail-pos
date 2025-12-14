import React, { useState, useEffect } from 'react';
import { ReceiptSettings, ReceiptTemplate, ReceiptCustomField, PaymentMethod, SaleStatus } from '../../types';
import { ReceiptSettingsService } from '../../services/receiptSettingsService';
import { ReceiptService } from '../../services/receiptService';

const ReceiptSettingsComponent: React.FC = () => {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ReceiptTemplate | null>(null);
  const [settings, setSettings] = useState<ReceiptSettings>(ReceiptSettingsService.getDefaultSettings());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [customField, setCustomField] = useState<Omit<ReceiptCustomField, 'id'>>({
    label: '',
    value: '',
    position: 'footer'
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  // Track changes to settings
  useEffect(() => {
    if (activeTemplate) {
      const originalSettings = activeTemplate.settings;
      const hasChanges = JSON.stringify(originalSettings) !== JSON.stringify(settings);
      setHasUnsavedChanges(hasChanges);
    }
  }, [settings, activeTemplate]);

  const loadTemplates = () => {
    // One-time cleanup - TODO: Remove this after running once
    if (localStorage.getItem('cleanup_done') !== 'true') {
      ReceiptSettingsService.oneTimeCleanup();
      localStorage.setItem('cleanup_done', 'true');
    }
    
    const loadedTemplates = ReceiptSettingsService.loadTemplates();
    setTemplates(loadedTemplates);
    const active = ReceiptSettingsService.getActiveTemplate();
    setActiveTemplate(active);
    
    // Ensure critical settings are always correct
    const correctedSettings = {
      ...active.settings,
      showTaxBreakdown: true,
      taxDisplay: 'inclusive' as 'inclusive' | 'exclusive'
    };
    
    console.log('Loading settings:', correctedSettings);
    setSettings(correctedSettings);
    
    // Save the corrected settings immediately
    if (active && (active.settings.showTaxBreakdown !== true || active.settings.taxDisplay !== 'inclusive')) {
      ReceiptSettingsService.updateTemplate(active.id, { settings: correctedSettings });
      console.log('Auto-saved corrected settings');
    }
  };

  const handleSaveSettings = () => {
    if (activeTemplate) {
      // Validate settings before saving
      const validation = ReceiptSettingsService.validateSettings(settings);
      if (!validation.isValid) {
        alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
        return;
      }

      // Save the settings
      ReceiptSettingsService.updateTemplate(activeTemplate.id, { settings });
      loadTemplates();
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success message
      alert('Receipt settings saved successfully!');
    } else {
      alert('No active template selected. Please select a template first.');
    }
  };

  const handleCreateTemplate = () => {
    if (templateName.trim()) {
      ReceiptSettingsService.createTemplate(templateName, settings);
      setTemplateName('');
      setShowTemplateModal(false);
      loadTemplates();
    }
  };

  const handleSetDefault = (templateId: string) => {
    ReceiptSettingsService.setDefaultTemplate(templateId);
    loadTemplates();
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      ReceiptSettingsService.deleteTemplate(templateId);
      loadTemplates();
    }
  };

  const handleAddCustomField = () => {
    if (customField.label.trim() && customField.value.trim() && activeTemplate) {
      ReceiptSettingsService.addCustomField(activeTemplate.id, customField);
      setCustomField({ label: '', value: '', position: 'footer' });
      setShowCustomFieldModal(false);
      loadTemplates();
    }
  };

  const handleRemoveCustomField = (fieldId: string) => {
    if (activeTemplate) {
      ReceiptSettingsService.removeCustomField(activeTemplate.id, fieldId);
      loadTemplates();
    }
  };

  const handleTemplateChange = (template: ReceiptTemplate) => {
    setActiveTemplate(template);
    setSettings(template.settings);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Receipt Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Management */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Templates</h3>
              {/* Hide + New button for now - will add back in later version
              <button
                onClick={() => setShowTemplateModal(true)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                + New
              </button>
              */}
            </div>
            
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded border cursor-pointer ${
                    activeTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateChange(template)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{template.name}</span>
                    {template.isDefault && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {!template.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(template.id);
                        }}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                      >
                        Set Default
                      </button>
                    )}
                    {!template.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* Receipt Configuration */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Receipt Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Receipt Width (characters)</label>
                  <input
                    type="number"
                    min="20"
                    max="50"
                    value={settings.receiptWidth}
                    onChange={(e) => setSettings({ ...settings, receiptWidth: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Display</label>
                  <select
                    value={settings.taxDisplay}
                    onChange={(e) => setSettings({ ...settings, taxDisplay: e.target.value as 'inclusive' | 'exclusive' })}
                    className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                    disabled
                  >
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">This setting is locked for consistency</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size</label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ ...settings, fontSize: e.target.value as 'small' | 'medium' | 'large' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Display Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.printHeader}
                    onChange={(e) => setSettings({ ...settings, printHeader: e.target.checked })}
                    className="mr-2"
                  />
                  Print Header
                </label>
                <label className="flex items-center opacity-50 cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={settings.showTaxBreakdown}
                    onChange={(e) => setSettings({ ...settings, showTaxBreakdown: e.target.checked })}
                    className="mr-2"
                    disabled
                  />
                  Show Tax Breakdown
                  <span className="ml-2 text-xs text-gray-500">(locked)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showPaymentMethod}
                    onChange={(e) => setSettings({ ...settings, showPaymentMethod: e.target.checked })}
                    className="mr-2"
                  />
                  Show Payment Method
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showCustomerInfo}
                    onChange={(e) => setSettings({ ...settings, showCustomerInfo: e.target.checked })}
                    className="mr-2"
                  />
                  Show Customer Info
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showSalespersonInfo}
                    onChange={(e) => setSettings({ ...settings, showSalespersonInfo: e.target.checked })}
                    className="mr-2"
                  />
                  Show Salesperson Info
                </label>
              </div>
            </div>

            {/* Custom Footer */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Custom Footer</h3>
              <textarea
                value={settings.customFooter || ''}
                onChange={(e) => setSettings({ ...settings, customFooter: e.target.value })}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Enter custom footer text..."
              />
            </div>

            {/* Custom Fields */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Custom Fields</h3>
                <button
                  onClick={() => setShowCustomFieldModal(true)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  + Add Field
                </button>
              </div>
              
              <div className="space-y-2">
                {settings.customFields.map((field) => (
                  <div key={field.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{field.label}:</span>
                      <span className="ml-2 text-gray-600">{field.value}</span>
                      <span className="ml-2 text-xs text-gray-500">({field.position})</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomField(field.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-3">
            {hasUnsavedChanges && (
              <div className="mr-4 text-sm text-orange-600 flex items-center">
                <span className="mr-2">●</span>
                Unsaved changes
              </div>
            )}
            <button
              onClick={() => {
                // Show preview of receipt with current settings
                const sampleData = {
                  sale: {
                    id: 1,
                    customer_id: 1,
                    user_id: 1,
                    salesperson_id: 1,
                    total_amount: 1200.00, // Adjusted for better calculations
                    tax_amount: 120.00, // 10% tax rate
                    discount_amount: 0,
                    payment_method: PaymentMethod.CASH,
                    status: SaleStatus.COMPLETED,
                    created_at: new Date().toISOString()
                  },
                  customer: { 
                    id: 1, 
                    name: 'Sample Customer',
                    phone: '+91 98765 43210',
                    loyalty_points: 0,
                    created_at: new Date().toISOString()
                  },
                  items: [
                    {
                      productName: 'Sample Product',
                      variant: 'M Red',
                      quantity: 2,
                      unitPrice: 500.00, // Will be adjusted based on tax display
                      total: 1000.00
                    },
                    {
                      productName: 'Another Product',
                      variant: 'L Blue',
                      quantity: 1,
                      unitPrice: 200.00, // Will be adjusted based on tax display
                      total: 200.00
                    }
                  ],
                  storeInfo: {
                    name: 'Your Store Name',
                    address: 'Your Store Address',
                    phone: 'Your Phone Number',
                    email: 'your@email.com',
                    gstNumber: 'Your GST Number'
                  }
                };
                
                const receipt = ReceiptService.generateReceipt(sampleData, { id: 'preview', name: 'Preview', settings, isDefault: false, createdAt: '', updatedAt: '' });
                
                // Show receipt in a modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0, 0, 0, 0.5);
                  z-index: 10000;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                `;
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                  background: white;
                  padding: 24px;
                  border-radius: 12px;
                  max-width: 600px;
                  width: 90%;
                  max-height: 90vh;
                  overflow: auto;
                `;
                
                const taxDisplayText = settings.taxDisplay === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive';
                const breakdownText = settings.showTaxBreakdown ? 'with Tax Breakdown' : 'without Tax Breakdown';
                
                modalContent.innerHTML = `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Receipt Preview (${taxDisplayText} - ${breakdownText})</h3>
                    <button id="close-preview-btn" style="
                      background: #dc3545;
                      color: white;
                      border: none;
                      padding: 8px 12px;
                      border-radius: 6px;
                      cursor: pointer;
                    ">Close</button>
                  </div>
                  <div style="
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    white-space: pre-wrap;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    max-height: 500px;
                    overflow-y: auto;
                  ">${receipt}</div>
                `;
                
                modalContent.className = 'receipt-preview-modal';
                modal.appendChild(modalContent);
                document.body.appendChild(modal);
                
                // Add event listeners for closing
                const closeBtn = modalContent.querySelector('#close-preview-btn') as HTMLButtonElement;
                if (closeBtn) {
                  closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                  });
                }
                
                // Close on click outside
                modal.addEventListener('click', (e) => {
                  if (e.target === modal) {
                    document.body.removeChild(modal);
                  }
                });
                
                // Close on Escape key
                const handleEscape = (e: KeyboardEvent) => {
                  if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEscape);
                  }
                };
                document.addEventListener('keydown', handleEscape);
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Preview Receipt
            </button>
            <button
              onClick={handleSaveSettings}
              className={`px-6 py-2 rounded font-medium ${
                hasUnsavedChanges
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={!activeTemplate}
            >
              {hasUnsavedChanges ? 'Save Changes' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Field Modal */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Custom Field</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                  type="text"
                  value={customField.label}
                  onChange={(e) => setCustomField({ ...customField, label: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input
                  type="text"
                  value={customField.value}
                  onChange={(e) => setCustomField({ ...customField, value: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <select
                  value={customField.position}
                  onChange={(e) => setCustomField({ ...customField, position: e.target.value as any })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="header">Header</option>
                  <option value="after_items">After Items</option>
                  <option value="before_total">Before Total</option>
                  <option value="footer">Footer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCustomFieldModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomField}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptSettingsComponent; 