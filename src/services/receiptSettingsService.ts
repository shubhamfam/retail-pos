import { ReceiptSettings, ReceiptTemplate, ReceiptCustomField } from '../types';

export class ReceiptSettingsService {
  private static readonly STORAGE_KEY = 'receipt_settings';
  private static readonly TEMPLATES_KEY = 'receipt_templates';

  // Default receipt settings
  static getDefaultSettings(): ReceiptSettings {
    return {
      storeName: 'Posly',
      storeAddress: '123 Main Street, City, State 12345',
      storePhone: '+91 98765 43210',
      storeEmail: 'info@clothesshop.com',
      storeGST: 'GST123456789',
      customFooter: 'Thank you for shopping!\nPlease visit again!',
      taxDisplay: 'inclusive',
      currencySymbol: '₹',
      currencyCode: 'INR',
      printHeader: true,
      printLogo: false,
      logoPosition: 'center',
      receiptWidth: 32, // 80mm thermal printer
      fontSize: 'medium',
      showTaxBreakdown: true,
      showPaymentMethod: true,
      showCustomerInfo: true,
      showSalespersonInfo: false,
      customFields: []
    };
  }

  // Save receipt settings
  static saveSettings(settings: ReceiptSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving receipt settings:', error);
    }
  }

  // Load receipt settings
  static loadSettings(): ReceiptSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Error loading receipt settings:', error);
    }
    return this.getDefaultSettings();
  }

  // Save receipt templates
  static saveTemplates(templates: ReceiptTemplate[]): void {
    try {
      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving receipt templates:', error);
    }
  }

  // Load receipt templates
  static loadTemplates(): ReceiptTemplate[] {
    try {
      const saved = localStorage.getItem(this.TEMPLATES_KEY);
      console.log('Raw saved templates:', saved);
      
      if (saved) {
        const templates: ReceiptTemplate[] = JSON.parse(saved);
        console.log('Parsed templates before migration:', templates);
        
        // Migrate existing templates to ensure they have the correct defaults
        const migratedTemplates = templates.map(template => ({
          ...template,
          settings: {
            ...this.getDefaultSettings(),
            ...template.settings,
            // Force these critical settings to be correct
            showTaxBreakdown: true,
            taxDisplay: 'inclusive' as 'inclusive' | 'exclusive'
          }
        }));
        
        console.log('Migrated templates:', migratedTemplates);
        
        // Save the migrated templates back
        this.saveTemplates(migratedTemplates);
        return migratedTemplates;
      }
    } catch (error) {
      console.error('Error loading receipt templates:', error);
    }
    
    console.log('No saved templates, returning default');
    return [this.getDefaultTemplate()];
  }

  // Force reset templates to default (for debugging)
  static resetToDefaults(): void {
    console.log('Resetting receipt templates to defaults');
    localStorage.removeItem(this.TEMPLATES_KEY);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Get default template
  static getDefaultTemplate(): ReceiptTemplate {
    return {
      id: 'default',
      name: 'Default Template',
      settings: this.getDefaultSettings(),
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Create new template
  static createTemplate(name: string, settings: ReceiptSettings): ReceiptTemplate {
    const templates = this.loadTemplates();
    const newTemplate: ReceiptTemplate = {
      id: `template_${Date.now()}`,
      name,
      settings,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  // Update template
  static updateTemplate(id: string, updates: Partial<ReceiptTemplate>): ReceiptTemplate | null {
    const templates = this.loadTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index !== -1) {
      templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveTemplates(templates);
      return templates[index];
    }
    
    return null;
  }

  // Delete template
  static deleteTemplate(id: string): boolean {
    const templates = this.loadTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length !== templates.length) {
      this.saveTemplates(filtered);
      return true;
    }
    
    return false;
  }

  // Set default template
  static setDefaultTemplate(id: string): boolean {
    const templates = this.loadTemplates();
    const updated = templates.map(t => ({
      ...t,
      isDefault: t.id === id
    }));
    
    this.saveTemplates(updated);
    return true;
  }

  // Get current active template
  static getActiveTemplate(): ReceiptTemplate {
    const templates = this.loadTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);
    return defaultTemplate || this.getDefaultTemplate();
  }

  // Add custom field
  static addCustomField(templateId: string, field: Omit<ReceiptCustomField, 'id'>): ReceiptCustomField | null {
    const template = this.loadTemplates().find(t => t.id === templateId);
    if (!template) return null;

    const newField: ReceiptCustomField = {
      ...field,
      id: `field_${Date.now()}`
    };

    template.settings.customFields.push(newField);
    this.updateTemplate(templateId, template);
    return newField;
  }

  // Remove custom field
  static removeCustomField(templateId: string, fieldId: string): boolean {
    const template = this.loadTemplates().find(t => t.id === templateId);
    if (!template) return false;

    template.settings.customFields = template.settings.customFields.filter(f => f.id !== fieldId);
    this.updateTemplate(templateId, template);
    return true;
  }

  // Validate settings
  static validateSettings(settings: ReceiptSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!settings.storeName.trim()) {
      errors.push('Store name is required');
    }

    if (!settings.storeAddress.trim()) {
      errors.push('Store address is required');
    }

    if (!settings.storePhone.trim()) {
      errors.push('Store phone is required');
    }

    if (!settings.currencySymbol.trim()) {
      errors.push('Currency symbol is required');
    }

    if (settings.receiptWidth < 20 || settings.receiptWidth > 50) {
      errors.push('Receipt width must be between 20 and 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Export settings
  static exportSettings(templateId: string): string {
    const templates = this.loadTemplates();
    const template = templates.find(t => t.id === templateId);
    return template ? JSON.stringify(template, null, 2) : '';
  }

  // Import settings
  static importSettings(jsonData: string): ReceiptTemplate | null {
    try {
      const template = JSON.parse(jsonData) as ReceiptTemplate;
      const validation = this.validateSettings(template.settings);
      
      if (validation.isValid) {
        template.id = `imported_${Date.now()}`;
        template.isDefault = false;
        template.createdAt = new Date().toISOString();
        template.updatedAt = new Date().toISOString();
        
        const templates = this.loadTemplates();
        templates.push(template);
        this.saveTemplates(templates);
        
        return template;
      }
    } catch (error) {
      console.error('Error importing receipt settings:', error);
    }
    
    return null;
  }

  // One-time cleanup: Clear all templates and keep only default template
  static oneTimeCleanup(): void {
    const defaultTemplate = this.getDefaultTemplate();
    this.saveTemplates([defaultTemplate]);
    console.log('One-time cleanup: Reset to default template only');
  }
} 