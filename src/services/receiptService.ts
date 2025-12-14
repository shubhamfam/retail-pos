import { Sale, Customer, ReceiptSettings, ReceiptTemplate } from '../types';
import { ReceiptSettingsService } from './receiptSettingsService';
import { invoke } from '@tauri-apps/api/core';

export interface ReceiptData {
  sale: Sale;
  customer?: Customer;
  items: Array<{
    productName: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  storeInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNumber: string;
  };
}

export class ReceiptService {
  static generateReceipt(data: ReceiptData, template?: ReceiptTemplate): string {
    const { sale, customer, items, storeInfo } = data;
    const date = new Date(sale.created_at).toLocaleDateString('en-IN');
    const time = new Date(sale.created_at).toLocaleTimeString('en-IN');
    
    // Use provided template or get active template
    const activeTemplate = template || ReceiptSettingsService.getActiveTemplate();
    const settings = activeTemplate.settings;
    
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Debug logging
    console.log('=== RECEIPT DEBUG ===');
    console.log('Tax Display Mode:', settings.taxDisplay);
    console.log('Items subtotal (sum of item.total):', subtotal);
    console.log('Sale total_amount:', sale.total_amount);
    console.log('Sale tax_amount:', sale.tax_amount);
    console.log('Sale discount_amount:', sale.discount_amount);
    
    // Handle tax display logic - Clear and non-confusing approach
    let displaySubtotal: number;
    let displayTax: number;
    let displayTotal: number;
    let showTaxLine: boolean;
    
    if (settings.taxDisplay === 'inclusive') {
      // TAX INCLUSIVE: When tax is included in item prices, still show breakdown correctly
      displaySubtotal = sale.total_amount - sale.tax_amount + sale.discount_amount; // Base amount before tax
      displayTax = sale.tax_amount; // Tax amount for breakdown
      displayTotal = sale.total_amount; // Final amount (tax included)
      showTaxLine = settings.showTaxBreakdown && sale.tax_amount > 0; // Only show if breakdown is enabled
    } else {
      // TAX EXCLUSIVE: Prices are before tax
      displaySubtotal = subtotal; // Base amount before tax
      displayTax = sale.tax_amount; // Tax to be added
      displayTotal = sale.total_amount; // Final amount = subtotal + tax - discount
      showTaxLine = settings.showTaxBreakdown && sale.tax_amount > 0; // Only show if breakdown is enabled
    }
    
    // Debug the final display values
    console.log('Display Subtotal:', displaySubtotal);
    console.log('Display Tax:', displayTax);
    console.log('Display Total:', displayTotal);
    console.log('=== END RECEIPT DEBUG ===');
    
    // Define receipt width from settings
    const receiptWidth = settings.receiptWidth;
    const borderChar = '═';
    
    // Helper function to wrap text to multiple lines
    const wrapText = (text: string, maxLength: number): string[] => {
      const lines: string[] = [];
      
      // Handle explicit line breaks first
      const textLines = text.split('\n');
      
      for (const line of textLines) {
        if (line.length <= maxLength) {
          // Line fits, pad to exact width
          lines.push(line.padEnd(maxLength));
        } else {
          // Line needs wrapping
          let currentLine = '';
          const words = line.split(' ');
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxLength) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                lines.push(currentLine.padEnd(maxLength));
                currentLine = word;
              } else {
                // Single word longer than maxLength, force break
                while (word.length > maxLength) {
                  lines.push(word.substring(0, maxLength));
                  currentLine = word.substring(maxLength);
                  break;
                }
                if (word.length <= maxLength) {
                  currentLine = word;
                }
              }
            }
          }
          
          if (currentLine) {
            lines.push(currentLine.padEnd(maxLength));
          }
        }
      }
      
      return lines;
    };
    
    // Helper function to pad text to exact width
    const padToWidth = (text: string): string => {
      if (text.length > receiptWidth) {
        return text.substring(0, receiptWidth);
      }
      return text.padEnd(receiptWidth);
    };
    
    // Helper function to center text
    const centerText = (text: string): string => {
      if (text.length >= receiptWidth) {
        return text.substring(0, receiptWidth);
      }
      const padding = Math.max(0, Math.floor((receiptWidth - text.length) / 2));
      const rightPadding = receiptWidth - text.length - padding;
      return ' '.repeat(padding) + text + ' '.repeat(rightPadding);
    };
    
    let receipt = `
╔${borderChar.repeat(receiptWidth)}╗`;

    // Store information with wrapping
    if (settings.printHeader) {
      const storeNameLines = wrapText(storeInfo.name, receiptWidth);
      const storeAddressLines = wrapText(storeInfo.address, receiptWidth);
      const storePhoneLines = wrapText(`Phone: ${storeInfo.phone}`, receiptWidth);
      const storeEmailLines = wrapText(`Email: ${storeInfo.email}`, receiptWidth);
      const storeGstLines = wrapText(`GST: ${storeInfo.gstNumber}`, receiptWidth);
      
      // Add all store info lines
      storeNameLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
      storeAddressLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
      storePhoneLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
      storeEmailLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
      storeGstLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
    }

    receipt += `
╠${borderChar.repeat(receiptWidth)}╣
║${centerText('SALE RECEIPT')}║
╠${borderChar.repeat(receiptWidth)}╣
║${padToWidth(`Sale ID: ${sale.id}`)}║
║${padToWidth(`Date: ${date}`)}║
║${padToWidth(`Time: ${time}`)}║`;

    // Customer information with wrapping
    if (settings.showCustomerInfo) {
      const customerText = `Customer: ${customer?.name || 'Walk-in Customer'}`;
      const customerLines = wrapText(customerText, receiptWidth);
      customerLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
    }

    // Salesperson information
    if (settings.showSalespersonInfo && sale.salesperson_id) {
      const salespersonText = `Salesperson: ${sale.salesperson?.name || 'Unknown'}`;
      const salespersonLines = wrapText(salespersonText, receiptWidth);
      salespersonLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
    }

    receipt += `
╠${borderChar.repeat(receiptWidth)}╣
║${padToWidth('Item'.padEnd(receiptWidth - 14) + 'Qty'.padEnd(4) + 'Price'.padStart(8))}║
╠${borderChar.repeat(receiptWidth)}╣`;

    // Add items with wrapping for long item names
    items.forEach(item => {
      const itemName = item.variant ? `${item.productName} (${item.variant})` : item.productName;
      const nameWidth = receiptWidth - 14; // Leave 14 chars for qty (4) + price (8) + spacing (2)
      const itemNameLines = wrapText(itemName, nameWidth);
      
      // Calculate display price based on tax display setting
      let displayUnitPrice: number;
      let displayItemTotal: number;
      
      if (settings.taxDisplay === 'inclusive') {
        // TAX INCLUSIVE: Show final price (tax included)
        displayUnitPrice = item.unitPrice; // Price already includes tax
        displayItemTotal = item.total; // Total already includes tax
      } else {
        // TAX EXCLUSIVE: Show base price (before tax)
        // Calculate base price by removing tax from the unit price
        const taxRate = sale.tax_amount / subtotal;
        displayUnitPrice = item.unitPrice / (1 + taxRate);
        displayItemTotal = item.total / (1 + taxRate);
      }
      
      if (itemNameLines.length === 1) {
        // Single line item
        const qty = item.quantity.toString().padEnd(4);
        const price = `${settings.currencySymbol}${displayUnitPrice.toFixed(2)}`.padStart(8);
        const itemLineContent = itemNameLines[0] + qty + price;
        const itemLine = `║${padToWidth(itemLineContent)}║`;
        receipt += `\n${itemLine}`;
      } else {
        // Multi-line item
        itemNameLines.forEach((line, index) => {
          if (index === 0) {
            // First line with quantity and price
            const qty = item.quantity.toString().padEnd(4);
            const price = `${settings.currencySymbol}${displayUnitPrice.toFixed(2)}`.padStart(8);
            const itemLineContent = line + qty + price;
            const itemLine = `║${padToWidth(itemLineContent)}║`;
            receipt += `\n${itemLine}`;
          } else {
            // Additional lines (continuation of item name)
            const continuationContent = line + ' '.repeat(4) + ' '.repeat(8);
            const continuationLine = `║${padToWidth(continuationContent)}║`;
            receipt += `\n${continuationLine}`;
          }
        });
      }
    });

    // Custom fields after items
    settings.customFields
      .filter(field => field.position === 'after_items')
      .forEach(field => {
        const fieldText = `${field.label}: ${field.value}`;
        const fieldLines = wrapText(fieldText, receiptWidth);
        fieldLines.forEach(line => {
          receipt += `\n║${line}║`;
        });
      });

    receipt += `
╠${borderChar.repeat(receiptWidth)}╣
║${padToWidth('Subtotal:'.padEnd(receiptWidth - 8) + settings.currencySymbol + displaySubtotal.toFixed(2).padStart(7))}║`;

    if (showTaxLine) {
      receipt += `
║${padToWidth('Tax:'.padEnd(receiptWidth - 8) + settings.currencySymbol + displayTax.toFixed(2).padStart(7))}║`;
    }

    if (sale.discount_amount > 0) {
      receipt += `
║${padToWidth('Discount:'.padEnd(receiptWidth - 8) + settings.currencySymbol + sale.discount_amount.toFixed(2).padStart(7))}║`;
    }

    // Custom fields before total
    settings.customFields
      .filter(field => field.position === 'before_total')
      .forEach(field => {
        const fieldText = `${field.label}: ${field.value}`;
        const fieldLines = wrapText(fieldText, receiptWidth);
        fieldLines.forEach(line => {
          receipt += `\n║${line}║`;
        });
      });

    receipt += `
║${padToWidth('TOTAL:'.padEnd(receiptWidth - 8) + settings.currencySymbol + displayTotal.toFixed(2).padStart(7))}║`;

    if (settings.showPaymentMethod) {
      const paymentText = `Payment: ${sale.payment_method}`;
      const paymentLines = wrapText(paymentText, receiptWidth);
      paymentLines.forEach(line => {
        receipt += `\n║${line}║`;
      });
    }

    receipt += `
╠${borderChar.repeat(receiptWidth)}╣`;

    // Custom footer or default footer
    const footerText = settings.customFooter || 'Thank you for shopping!\nPlease visit again!';
    const footerLines = wrapText(footerText, receiptWidth);
    footerLines.forEach(line => {
      receipt += `\n║${line}║`;
    });

    // Custom fields in footer
    settings.customFields
      .filter(field => field.position === 'footer')
      .forEach(field => {
        const fieldText = `${field.label}: ${field.value}`;
        const fieldLines = wrapText(fieldText, receiptWidth);
        fieldLines.forEach(line => {
          receipt += `\n║${line}║`;
        });
      });

    receipt += `
╚${borderChar.repeat(receiptWidth)}╝
`;

    return receipt;
  }

  static async printReceipt(data: ReceiptData): Promise<void> {
    const receipt = this.generateReceipt(data);
    
    // Create a modal dialog to show the receipt
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
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e9ecef; padding-bottom: 15px;">
        <h3 style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">Receipt - Sale #${data.sale.id}</h3>
        <button id="close-header-btn" style="
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        ">Close</button>
      </div>
      <div id="receipt-content" style="
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
        background: #ffffff;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      ">${receipt}</div>
      <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: center;">
        <button id="print-btn" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
          min-width: 120px;
        ">Print Receipt</button>
        <button id="close-footer-btn" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
          min-width: 120px;
        ">Close</button>
      </div>
    `;
    
    modalContent.className = 'receipt-modal';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Function to close modal
    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };
    
    // Add event listeners
    const closeHeaderBtn = modalContent.querySelector('#close-header-btn') as HTMLButtonElement;
    const closeFooterBtn = modalContent.querySelector('#close-footer-btn') as HTMLButtonElement;
    const printBtn = modalContent.querySelector('#print-btn') as HTMLButtonElement;
    
    if (closeHeaderBtn) {
      closeHeaderBtn.addEventListener('click', closeModal);
      closeHeaderBtn.addEventListener('mouseover', () => {
        closeHeaderBtn.style.background = '#c82333';
      });
      closeHeaderBtn.addEventListener('mouseout', () => {
        closeHeaderBtn.style.background = '#dc3545';
      });
    }
    
    if (closeFooterBtn) {
      closeFooterBtn.addEventListener('click', closeModal);
      closeFooterBtn.addEventListener('mouseover', () => {
        closeFooterBtn.style.background = '#545b62';
      });
      closeFooterBtn.addEventListener('mouseout', () => {
        closeFooterBtn.style.background = '#6c757d';
      });
    }
    
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printCleanReceipt(receipt);
      });
      printBtn.addEventListener('mouseover', () => {
        printBtn.style.background = '#0056b3';
      });
      printBtn.addEventListener('mouseout', () => {
        printBtn.style.background = '#007bff';
      });
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close modal with Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Auto-print after a short delay
    setTimeout(() => {
      this.printCleanReceipt(receipt);
    }, 1000);
  }

  static printCleanReceipt(receipt: string): void {
    // Create a clean print element without modal UI
    const printElement = document.createElement('div');
    printElement.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.1;
      white-space: pre-wrap;
      background: white;
      padding: 0;
      margin: 0;
      border: none;
      box-shadow: none;
      width: 80mm;
      max-width: 80mm;
      min-width: 80mm;
    `;
    printElement.innerHTML = receipt;
    
    // Add print styles for thermal printer compatibility
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
          padding: 0;
        }
        
        body * {
          visibility: hidden;
        }
        
        #print-receipt, #print-receipt * {
          visibility: visible;
        }
        
        #print-receipt {
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm;
          max-width: 80mm;
          min-width: 80mm;
          margin: 0;
          padding: 2mm;
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.1;
          white-space: pre-wrap;
          color: black;
        }
        
        /* Ensure no page breaks within receipt */
        #print-receipt {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Hide any scrollbars */
        #print-receipt {
          overflow: visible;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Add to document temporarily
    printElement.id = 'print-receipt';
    document.body.appendChild(printElement);
    
    // Print
    window.print();
    
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(printElement);
      document.head.removeChild(style);
    }, 1000);
  }

  static async saveReceiptToDocuments(data: ReceiptData): Promise<string> {
    const receipt = this.generateReceipt(data);
    try {
      const filePath = await invoke('save_receipt', {
        receiptContent: receipt,
        saleId: data.sale.id
      });
      console.log('Receipt saved to:', filePath);
      return filePath as string;
    } catch (error) {
      console.error('Error saving receipt:', error);
      throw new Error(`Failed to save receipt: ${error}`);
    }
  }

  static saveReceiptAsFile(data: ReceiptData, filename?: string): void {
    const receipt = this.generateReceipt(data);
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `receipt_${data.sale.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static emailReceipt(data: ReceiptData, emailAddress: string): Promise<void> {
    // This would integrate with an email service
    return new Promise((resolve, reject) => {
      console.log('Email receipt functionality would be implemented here');
      console.log('Sending receipt to:', emailAddress);
      console.log('Receipt data:', data);
      
      // Simulate email sending
      setTimeout(() => {
        console.log('Receipt emailed successfully');
        resolve();
      }, 1000);
    });
  }

  static manualPrintReceipt(data: ReceiptData): void {
    const receipt = this.generateReceipt(data);
    
    // Create a temporary element to print
    const printElement = document.createElement('div');
    printElement.innerHTML = `
      <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; white-space: pre-wrap; background: white; padding: 20px;">
        ${receipt}
      </div>
    `;
    
    // Add to document temporarily
    document.body.appendChild(printElement);
    
    // Print
    window.print();
    
    // Remove from document
    document.body.removeChild(printElement);
  }

  static generateBarcode(productId: number, variantId?: number): string {
    // Generate a simple barcode format
    const timestamp = Date.now().toString().slice(-6);
    const variant = variantId ? variantId.toString().padStart(3, '0') : '000';
    return `${productId.toString().padStart(6, '0')}${variant}${timestamp}`;
  }

  static scanBarcode(barcode: string): { productId: number; variantId?: number } | null {
    // Parse barcode format: 6 digits product ID + 3 digits variant ID + 6 digits timestamp
    if (barcode.length >= 15) {
      const productId = parseInt(barcode.substring(0, 6));
      const variantId = parseInt(barcode.substring(6, 9));
      
      if (!isNaN(productId)) {
        return {
          productId,
          variantId: variantId > 0 ? variantId : undefined
        };
      }
    }
    return null;
  }
} 