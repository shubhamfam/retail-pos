import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { ReceiptService } from '../../services/receiptService';
import { Product, Customer, Sale, SaleItem, PaymentMethod, SaleStatus, ProductVariant, Salesperson, User } from '../../types';
import { useKeyboardShortcuts, createNavigationShortcuts, createFormShortcuts, createPOSShortcuts } from '../../hooks/useKeyboardShortcuts';

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  total: number;
  originalPrice?: number; // Track original price for reference
}

interface POSProps {
  setCurrentPage: (page: string) => void;
  user: User;
}

const POS: React.FC<POSProps> = ({ setCurrentPage, user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [discount, setDiscount] = useState(0);
  const [taxRate] = useState(0.12); // 12% tax rate
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<{ [productId: number]: ProductVariant[] }>({});
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  // Quick billing features
  const [expressMode, setExpressMode] = useState(false);
  const [frequentlyUsedProducts, setFrequentlyUsedProducts] = useState<Product[]>([]);

  // Customer search features
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddCustomerData, setQuickAddCustomerData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Salesperson state
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<number | null>(null);

  // Debug modal state changes
  useEffect(() => {
    console.log('Modal state changed:', showPaymentModal);
  }, [showPaymentModal]);

  // Load products and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, customersData] = await Promise.all([
          DatabaseService.getProducts(),
          DatabaseService.getCustomers()
        ]);
        setProducts(productsData);
        setCustomers(customersData);
        
        // Set frequently used products (first 8 products for demo)
        setFrequentlyUsedProducts(productsData.slice(0, 8));
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading products and customers');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load salespersons
  useEffect(() => {
    const loadSalespersons = async () => {
      try {
        const salespersonsData = await DatabaseService.getAllSalespersons();
        setSalespersons(salespersonsData);
      } catch (error) {
        console.error('Error loading salespersons:', error);
        alert('Error loading salespersons');
      }
    };
    loadSalespersons();
  }, []);

  // Filter customers based on search query
  useEffect(() => {
    if (customerSearchQuery.trim() === '') {
      setFilteredCustomers([]);
      return;
    }

    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(customerSearchQuery.toLowerCase()))
    );
    setFilteredCustomers(filtered);
  }, [customerSearchQuery, customers]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick add customer function
  const handleQuickAddCustomer = async () => {
    try {
      if (!quickAddCustomerData.name.trim() || !quickAddCustomerData.phone.trim()) {
        alert('Name and phone are required');
        return;
      }

      const newCustomer = await DatabaseService.createCustomer({
        name: quickAddCustomerData.name,
        phone: quickAddCustomerData.phone,
        email: quickAddCustomerData.email || '',
        address: '',
        loyalty_points: 0
      });

      // Add to customers list
      setCustomers([...customers, newCustomer]);
      
      // Select the new customer
      setSelectedCustomer(newCustomer);
      setCustomerSearchQuery(newCustomer.name);
      setShowCustomerSearch(false);
      setShowQuickAddCustomer(false);
      
      // Reset form
      setQuickAddCustomerData({
        name: '',
        phone: '',
        email: ''
      });

      alert('Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer');
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      ...createNavigationShortcuts(setCurrentPage),
      ...createFormShortcuts(() => {
        if (showPaymentModal) {
          setShowPaymentModal(false);
        }
        if (showCustomerModal) {
          setShowCustomerModal(false);
        }
        if (showVariantModal) {
          setShowVariantModal(false);
        }
        if (showBarcodeScanner) {
          setShowBarcodeScanner(false);
        }
      }),
      ...createPOSShortcuts(() => {
        // Focus on the first price input in the cart
        setTimeout(() => {
          const priceInputs = document.querySelectorAll('.cart-price-input');
          if (priceInputs.length > 0) {
            const firstPriceInput = priceInputs[0] as HTMLInputElement;
            firstPriceInput.focus();
            firstPriceInput.select();
          }
        }, 100);
      })
    ]
  });

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchQuery)) ||
    // Search by SKU in variants
    productVariants[product.id]?.some(variant => 
      variant.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Add product to cart
  const addToCart = async (product: Product) => {
    // Check if product has variants
    if (!productVariants[product.id]) {
      try {
        const variants = await DatabaseService.getProductVariants(product.id);
        setProductVariants(prev => ({ ...prev, [product.id]: variants }));
        
        // If product has multiple variants, show variant selection
        if (variants.length > 1) {
          setSelectedProductForVariant(product);
          setShowVariantModal(true);
          return;
        }
      } catch (error) {
        console.error('Error loading variants:', error);
      }
    } else {
      // If we already have variants loaded
      const variants = productVariants[product.id];
      if (variants.length > 1) {
        setSelectedProductForVariant(product);
        setShowVariantModal(true);
        return;
      }
    }

    // If no variants or only one variant, add to cart directly
    addProductToCart(product);
  };

  // Quick add with quantity
  const quickAddToCart = (product: Product, quantity: number = 1) => {
    addProductToCart(product);
  };

  // Add product to cart with specific variant
  const addProductToCart = (product: Product, variant?: ProductVariant) => {
    // Check stock availability
    if (variant && variant.stock_quantity <= 0) {
      alert(`Sorry, ${product.name} - ${variant.size} ${variant.color} is out of stock!`);
      return;
    }

    const existingItem = cart.find(item => 
      item.product.id === product.id && 
      (!variant || item.variant?.id === variant.id)
    );
    
            const unitPrice = variant ? product.base_price + variant.price_adjustment : product.base_price;
    
    if (existingItem) {
      // Check if adding more would exceed stock
      if (variant && existingItem.quantity >= variant.stock_quantity) {
        alert(`Sorry, only ${variant.stock_quantity} units available for ${product.name} - ${variant.size} ${variant.color}!`);
        return;
      }
      
      setCart(cart.map(item =>
        item.product.id === product.id && (!variant || item.variant?.id === variant.id)
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product,
        variant,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        originalPrice: unitPrice // Track original price
      };
      setCart([...cart, newItem]);
    }
  };

  // Reset price to original
  const resetToOriginalPrice = (cartItem: CartItem) => {
    if (!cartItem.originalPrice) return;

    setCart(cart.map(item => {
      if (item === cartItem) {
        return {
          ...item,
          unitPrice: cartItem.originalPrice!,
          total: cartItem.originalPrice! * item.quantity
        };
      }
      return item;
    }));
  };

  // Update cart item quantity
  const updateQuantity = (productId: number, quantity: number, variantId?: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => 
        !(item.product.id === productId && (!variantId || item.variant?.id === variantId))
      ));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId && (!variantId || item.variant?.id === variantId)
          ? { ...item, quantity, total: quantity * item.unitPrice }
          : item
      ));
    }
  };

  // Remove item from cart
  const removeFromCart = (productId: number, variantId?: number) => {
    setCart(cart.filter(item => 
      !(item.product.id === productId && (!variantId || item.variant?.id === variantId))
    ));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxRate);
  const total = subtotal - discountAmount + taxAmount;

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      setSuccessMessage('Cart is empty!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      return;
    }

    try {
      console.log('=== Starting full sale process ===');
      console.log('Cart items:', cart.length);

      // Use the logged-in user's ID
      console.log('User object:', user);
      const userId = user.id;
      console.log('User ID type:', typeof userId);
      console.log('User ID value:', userId);
      console.log('Using logged-in user ID:', userId);
      
      if (!user || userId <= 0) {
        console.error('Invalid user ID:', userId);
        alert('Error: Invalid user session. Please log in again.');
        return;
      }
      
      // Create sale
      console.log('About to create sale with data:', {
        customerId: selectedCustomer?.id || null,
        userId,
        salespersonId: selectedSalesperson || null,
        total,
        taxAmount,
        discountAmount,
        paymentMethod,
        status: SaleStatus.COMPLETED,
        items: cart.map(item => ({
          product_variant_id: item.variant?.id || 1,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }))
      });
      
      const sale = await DatabaseService.createSale(
        selectedCustomer?.id || null,
        userId,
        selectedSalesperson || null,
        total,
        taxAmount,
        discountAmount,
        paymentMethod as PaymentMethod,
        SaleStatus.COMPLETED,
        cart.map(item => ({
          product_variant_id: item.variant?.id || 1, // Default variant ID
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }))
      );
      console.log('Sale created successfully with ID:', sale.id);
      
      // Update stock quantities
      console.log('Updating stock quantities...');
      console.log('Cart has', cart.length, 'items');
      
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        console.log(`Processing item ${i + 1}/${cart.length}:`, item.product.name);
        
        // Reduce stock for the variant
        if (item.variant) {
          console.log(`Reducing stock for variant ${item.variant.id} by ${item.quantity}`);
          await DatabaseService.adjustStockQuantity(item.variant.id, -item.quantity);
        } else {
          // For products without specific variants, get the default variant and reduce stock
          console.log(`Getting default variant for product ${item.product.id}...`);
          const variantId = await DatabaseService.getOrCreateDefaultVariant(item.product.id);
          console.log(`Reducing stock for default variant ${variantId} by ${item.quantity}`);
          await DatabaseService.adjustStockQuantity(variantId, -item.quantity);
        }
      }

      console.log('=== All database operations completed ===');
      
      // Print receipt
      console.log('Printing receipt...');
      const storeInfo = {
        name: 'Clothes Shop POS',
        address: '123 Main Street, City, State 12345',
        phone: '+91 98765 43210',
        email: 'info@clothesshop.com',
        gstNumber: 'GST123456789'
      };

      const receiptData = {
        sale: {
          ...sale,
          id: sale.id,
          createdAt: new Date().toISOString()
        },
        items: cart.map(item => ({
          productName: item.product.name,
          variant: item.variant ? `${item.variant.size} ${item.variant.color}` : undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        customer: selectedCustomer || undefined,
        storeInfo
      };

      // Save receipt to Documents folder first
      try {
        const savedPath = await ReceiptService.saveReceiptToDocuments(receiptData);
        console.log('Receipt saved to Documents folder:', savedPath);
        alert(`Receipt saved to: ${savedPath}`);
      } catch (error) {
        console.error('Error saving receipt:', error);
        alert('Warning: Could not save receipt to Documents folder');
        // Continue with printing even if saving fails
      }
      
      // Print receipt
      try {
        await ReceiptService.printReceipt(receiptData);
        console.log('Receipt printed successfully');
        alert('Receipt modal opened! You can print from the modal or it will auto-print.');
      } catch (error) {
        console.error('Error printing receipt:', error);
        alert('Receipt modal opened! Please use the print button in the modal.');
      }
      
      // Clear cart and close modal
      console.log('Clearing cart...');
      setCart([]);
      console.log('Clearing selected customer...');
      setSelectedCustomer(null);
      console.log('Resetting discount...');
      setDiscount(0);
      console.log('Closing modal...');
      setShowPaymentModal(false);
      
      // Show success message
      console.log('Showing success message...');
      setSuccessMessage(`Sale completed successfully! Total: ₹${total.toFixed(2)}`);
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
    } catch (error) {
      console.error('=== Error in sale process ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert(`Error processing sale: ${error}`);
      setSuccessMessage('Error processing sale. Please try again.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  // Manual close function for debugging
  const manualCloseModal = () => {
    console.log('Manual close called');
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading POS system...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <style>
        {`
          .no-spinner::-webkit-outer-spin-button,
          .no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .no-spinner {
            -moz-appearance: textfield;
          }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>
      
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
      
      {/* Left Side - Product Catalog */}
      <div className="w-2/3 p-6 overflow-auto">
        {/* Search and Customer Selection */}
        <div className="mb-6">
          {/* Product Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Customer Selection Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Customer:</span>
                {selectedCustomer ? (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {selectedCustomer.name}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    Walk-in Customer
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative customer-search-container">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {/* Customer Search Dropdown */}
                  {showCustomerSearch && (customerSearchQuery.trim() !== '' || filteredCustomers.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
                      {/* Walk-in Customer Option */}
                      <div
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchQuery('');
                          setShowCustomerSearch(false);
                        }}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      >
                        <div className="font-medium text-orange-800">Walk-in Customer</div>
                        <div className="text-xs text-orange-600">No customer assigned</div>
                      </div>
                      
                      {/* Quick Add Customer Option */}
                      <div
                        onClick={() => {
                          setShowQuickAddCustomer(true);
                          setShowCustomerSearch(false);
                        }}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 bg-blue-50"
                      >
                        <div className="font-medium text-blue-800">+ Quick Add Customer</div>
                        <div className="text-xs text-blue-600">Add new customer quickly</div>
                      </div>
                      
                      {/* Search Results */}
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearchQuery('');
                            setShowCustomerSearch(false);
                          }}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-gray-600">
                            {customer.email && `${customer.email} • `}{customer.phone}
                          </div>
                        </div>
                      ))}
                      
                      {customerSearchQuery.trim() !== '' && filteredCustomers.length === 0 && (
                        <div className="p-2 text-gray-500 text-sm">
                          No customers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Browse All
                </button>
              </div>
            </div>
            
            {/* Express Mode Toggle */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={expressMode}
                  onChange={(e) => setExpressMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Express Mode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quick Access Section */}
        {frequentlyUsedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Access</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {frequentlyUsedProducts.slice(0, 6).map((product) => {
                const variants = productVariants[product.id] || [];
                const totalStock = variants.length > 0 
                  ? variants.reduce((sum, v) => sum + v.stock_quantity, 0)
                  : 0;
                const isOutOfStock = variants.length > 0 && totalStock === 0;
                
                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow ${
                      isOutOfStock ? 'opacity-50' : ''
                    }`}
                    onClick={() => addToCart(product)}
                    title={`Quick add ${product.name}`}
                  >
                    <h4 className="font-medium text-gray-900 text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-gray-600 truncate">{product.brand}</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">₹{product.base_price.toFixed(2)}</p>
                    {isOutOfStock && (
                      <span className="text-xs text-red-600">Out of Stock</span>
                    )}
                    <div className="mt-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="flex-1 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600"
                      >
                        Add
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Rupee button clicked for:', product.name);
                          
                          // Check if product already exists in cart
                          const existingItem = cart.find(item => 
                            item.product.id === product.id && !item.variant
                          );
                          
                          if (existingItem) {
                            // If product exists, just focus on its price field
                            setTimeout(() => {
                              const priceInputs = document.querySelectorAll('.cart-price-input');
                              if (priceInputs.length > 0) {
                                // Find the price input for this specific product
                                const cartItems = document.querySelectorAll('.bg-gray-50.rounded-md');
                                for (let i = 0; i < cartItems.length; i++) {
                                  const itemElement = cartItems[i] as HTMLElement;
                                  const productName = itemElement.querySelector('.font-medium')?.textContent;
                                  if (productName === product.name) {
                                    const priceInput = itemElement.querySelector('.cart-price-input') as HTMLInputElement;
                                    if (priceInput) {
                                      priceInput.focus();
                                      priceInput.select();
                                      break;
                                    }
                                  }
                                }
                              }
                            }, 100);
                          } else {
                            // Add product with original price first
                            const newItem: CartItem = {
                              product,
                              quantity: 1,
                              unitPrice: product.base_price,
                              total: product.base_price,
                              originalPrice: product.base_price
                            };
                            console.log('Adding item with original price:', newItem);
                            setCart([...cart, newItem]);
                            
                            // Focus on the price field in the cart after a short delay
                            setTimeout(() => {
                              const priceInputs = document.querySelectorAll('.cart-price-input');
                              if (priceInputs.length > 0) {
                                const lastPriceInput = priceInputs[priceInputs.length - 1] as HTMLInputElement;
                                lastPriceInput.focus();
                                lastPriceInput.select();
                              }
                            }, 100);
                          }
                        }}
                        className="bg-orange-500 text-white text-xs py-1 px-2 rounded hover:bg-orange-600 font-bold"
                        title="Add to cart and edit price"
                      >
                        ₹
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const variants = productVariants[product.id] || [];
            const totalStock = variants.length > 0 
              ? variants.reduce((sum, v) => sum + v.stock_quantity, 0)
              : 0;
            const isOutOfStock = variants.length > 0 && totalStock === 0;
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow relative group ${
                  isOutOfStock ? 'opacity-50' : ''
                }`}
              >
                <div onClick={() => addToCart(product)}>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.brand}</p>
                  <p className="text-lg font-bold text-primary-600 mt-2">₹{product.base_price.toFixed(2)}</p>
                  {variants.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {isOutOfStock ? (
                        <span className="text-red-600">Out of Stock</span>
                      ) : (
                        <span className="text-green-600">Stock: {totalStock} units</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Quick Price Adjustment Button */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Rupee button clicked for:', product.name);
                      
                      // Check if product already exists in cart
                      const existingItem = cart.find(item => 
                        item.product.id === product.id && !item.variant
                      );
                      
                      if (existingItem) {
                        // If product exists, just focus on its price field
                        setTimeout(() => {
                          const priceInputs = document.querySelectorAll('.cart-price-input');
                          if (priceInputs.length > 0) {
                            // Find the price input for this specific product
                            const cartItems = document.querySelectorAll('.bg-gray-50.rounded-md');
                            for (let i = 0; i < cartItems.length; i++) {
                              const itemElement = cartItems[i] as HTMLElement;
                              const productName = itemElement.querySelector('.font-medium')?.textContent;
                              if (productName === product.name) {
                                const priceInput = itemElement.querySelector('.cart-price-input') as HTMLInputElement;
                                if (priceInput) {
                                  priceInput.focus();
                                  priceInput.select();
                                  break;
                                }
                              }
                            }
                          }
                        }, 100);
                      } else {
                        // Add product with original price first
                        const newItem: CartItem = {
                          product,
                          quantity: 1,
                          unitPrice: product.base_price,
                          total: product.base_price,
                          originalPrice: product.base_price
                        };
                        console.log('Adding item with original price:', newItem);
                        setCart([...cart, newItem]);
                        
                        // Focus on the price field in the cart after a short delay
                        setTimeout(() => {
                          const priceInputs = document.querySelectorAll('.cart-price-input');
                          if (priceInputs.length > 0) {
                            const lastPriceInput = priceInputs[priceInputs.length - 1] as HTMLInputElement;
                            lastPriceInput.focus();
                            lastPriceInput.select();
                          }
                        }, 100);
                      }
                    }}
                    className="bg-orange-500 text-white text-xs px-3 py-2 rounded hover:bg-orange-600 font-bold shadow-lg"
                    title="Add to cart and edit price"
                  >
                    ₹
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found matching your search.
          </div>
        )}
      </div>

      {/* Right Side - Shopping Cart */}
      <div className="w-1/3 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                title="Clear cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Cart Items - Scrollable */}
          <div className="space-y-3 max-h-96 overflow-auto">
            {cart.map((item) => {
              const isPriceAdjusted = item.originalPrice && item.unitPrice !== item.originalPrice;
              return (
                <div key={`${item.product.id}-${item.variant?.id || 'default'}`} className="bg-gray-50 rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-sm text-gray-600">
                          {item.variant.size} - {item.variant.color}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, Number(e.target.value), item.variant?.id)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center text-sm"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                      />
                      <span className="text-sm text-gray-600">x</span>
                      <div className="flex items-center space-x-1 min-w-0 flex-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            if (!isNaN(newPrice) && newPrice >= 0) {
                              setCart(cart.map(cartItem => 
                                cartItem === item 
                                  ? { ...cartItem, unitPrice: newPrice, total: newPrice * cartItem.quantity }
                                  : cartItem
                              ));
                            }
                          }}
                          className={`text-sm font-medium border-none bg-transparent focus:ring-2 focus:ring-blue-500 rounded px-1 no-spinner flex-1 min-w-0 cart-price-input ${
                            isPriceAdjusted ? 'text-orange-600' : 'text-gray-700'
                          }`}
                          title="Click to edit price"
                          style={{ 
                            WebkitAppearance: 'none', 
                            MozAppearance: 'textfield',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none'
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        {isPriceAdjusted && (
                          <span className="text-xs text-gray-500 line-through flex-shrink-0">
                            ₹{item.originalPrice!.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800 ml-2 flex-shrink-0">₹{item.total.toFixed(2)}</span>
                  </div>
                  
                  {isPriceAdjusted && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => resetToOriginalPrice(item)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                        title="Reset to original price"
                      >
                        Reset Price
                      </button>
                      <span className="text-xs text-orange-600 font-medium">
                        Price adjusted
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {cart.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Cart is empty. Add products to get started.
            </div>
          )}
        </div>

        {/* Fixed Bottom Section */}
        <div className="mt-auto border-t bg-gray-50 p-6">
          {/* Cart Summary */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {(() => {
              const totalPriceAdjustment = cart.reduce((sum, item) => {
                if (item.originalPrice && item.unitPrice !== item.originalPrice) {
                  return sum + ((item.originalPrice - item.unitPrice) * item.quantity);
                }
                return sum;
              }, 0);
              
              if (totalPriceAdjustment > 0) {
                return (
                  <div className="flex justify-between text-orange-600">
                    <span>Price Adjustments:</span>
                    <span>-₹{totalPriceAdjustment.toFixed(2)}</span>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex justify-between">
              <span>Discount ({discount}%):</span>
              <span className={`${discount > 0 ? 'text-green-600 font-semibold' : ''}`}>
                -₹{discountAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({(taxRate * 100)}%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Discount Input */}
          <div className={`mb-4 p-3 rounded-lg border-2 transition-all duration-200 ${
            discount > 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-white border-gray-200'
          }`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount (%)
              {discount > 0 && (
                <span className="ml-2 text-green-600 font-bold">
                  ✓ Applied
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discount}
              onChange={(e) => {
                const newDiscount = Number(e.target.value);
                console.log('Discount changed:', newDiscount);
                setDiscount(newDiscount);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 transition-colors ${
                discount > 0 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter discount percentage"
            />
            <div className={`text-xs mt-1 ${
              discount > 0 ? 'text-green-700 font-medium' : 'text-gray-500'
            }`}>
              Current discount: {discount}% = -₹{discountAmount.toFixed(2)}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quick Actions
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Apply 10% discount to total cart value
                  setDiscount(10);
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                title="Apply 10% discount to total cart value"
              >
                -10%
              </button>
              <button
                onClick={() => {
                  // Apply 20% discount to total cart value
                  setDiscount(20);
                }}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                title="Apply 20% discount to total cart value"
              >
                -20%
              </button>
              <button
                onClick={() => {
                  // Reset all prices to original
                  setCart(cart.map(item => {
                    if (item.originalPrice) {
                      return {
                        ...item,
                        unitPrice: item.originalPrice,
                        total: item.originalPrice * item.quantity
                      };
                    }
                    return item;
                  }));
                  // Also reset the discount percentage field
                  setDiscount(0);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                title="Reset all prices to original"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Checkout Buttons */}
          <div className="space-y-2">
            {expressMode ? (
              <button
                onClick={processSale}
                disabled={cart.length === 0}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Express Sale - ₹{total.toFixed(2)}
              </button>
            ) : (
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Checkout - ₹{total.toFixed(2)}
              </button>
            )}
            
            {expressMode && (
              <p className="text-xs text-gray-500 text-center">
                Express mode: Direct sale with default payment method
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h3>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  // Filter customers based on search
                  const searchTerm = e.target.value.toLowerCase();
                  // This will be handled by filtering the customers list
                }}
              />
            </div>
            
            <div className="space-y-2">
              {/* Walk-in Customer Option */}
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                className="p-3 border rounded cursor-pointer hover:bg-gray-50 border-orange-200 bg-orange-50"
              >
                <div className="font-medium text-orange-800">Walk-in Customer</div>
                <div className="text-sm text-orange-600">No customer assigned</div>
              </div>
              
              {/* Customer List */}
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-gray-600">{customer.email} • {customer.phone}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.CARD}>Card</option>
                <option value={PaymentMethod.UPI}>UPI</option>
                <option value={PaymentMethod.STORE_CREDIT}>Store Credit</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesperson (Optional)
              </label>
              <select
                value={selectedSalesperson || ''}
                onChange={(e) => setSelectedSalesperson(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Salesperson</option>
                {salespersons.map((salesperson) => (
                  <option key={salesperson.id} value={salesperson.id}>
                    {salesperson.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <div className="text-lg font-semibold text-center">
                Total Amount: ₹{total.toFixed(2)}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={processSale}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProductForVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Variant - {selectedProductForVariant.name}
            </h3>
            
            <div className="space-y-3">
              {productVariants[selectedProductForVariant.id]
                ?.filter(variant => variant.stock_quantity > 0) // Only show variants with stock
                .map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => {
                    addProductToCart(selectedProductForVariant, variant);
                    setShowVariantModal(false);
                    setSelectedProductForVariant(null);
                  }}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {variant.size} - {variant.color}
                      </div>
                      <div className="text-sm text-gray-600">
                        Stock: {variant.stock_quantity} | SKU: {variant.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ₹{(selectedProductForVariant.base_price + variant.price_adjustment).toFixed(2)}
                      </div>
                      {variant.price_adjustment !== 0 && (
                        <div className="text-sm text-gray-500">
                          Base: ₹{selectedProductForVariant.base_price.toFixed(2)}
                          {variant.price_adjustment > 0 ? ' +' : ' '}₹{variant.price_adjustment.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show message if no variants with stock */}
              {productVariants[selectedProductForVariant.id]?.filter(variant => variant.stock_quantity > 0).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No variants available in stock.</p>
                  <p className="text-sm mt-2">All variants for this product are out of stock.</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  setSelectedProductForVariant(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add Customer</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={quickAddCustomerData.name}
                onChange={(e) => setQuickAddCustomerData({ ...quickAddCustomerData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={quickAddCustomerData.phone}
                onChange={(e) => setQuickAddCustomerData({ ...quickAddCustomerData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={quickAddCustomerData.email}
                onChange={(e) => setQuickAddCustomerData({ ...quickAddCustomerData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowQuickAddCustomer(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddCustomer}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS; 