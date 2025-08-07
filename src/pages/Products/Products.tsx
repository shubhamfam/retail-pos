import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { Product, ProductVariant } from '../../types';
import { useKeyboardShortcuts, createNavigationShortcuts, createFormShortcuts } from '../../hooks/useKeyboardShortcuts';
import ProductVariants from './ProductVariants';

interface ProductsProps {
  setCurrentPage: (page: string) => void;
}

const Products: React.FC<ProductsProps> = ({ setCurrentPage }) => {
  console.log('Products component rendered');
  console.log('Running in Tauri:', typeof window !== 'undefined' && (window as any).__TAURI__);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showVariantsSection, setShowVariantsSection] = useState(false);
  const [productVariants, setProductVariants] = useState<{ [productId: number]: any[] }>({});
  const [variants, setVariants] = useState<Array<{
    size: string;
    color: string;
    stockQuantity: number;
    priceAdjustment: number;
    sku: string;
  }>>([]);

  // Pagination state
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // New variant form state
  const [newVariant, setNewVariant] = useState({
    size: '',
    color: '',
    stockQuantity: 0,
    priceAdjustment: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    subcategory: '',
    description: '',
    basePrice: 0,
    costPrice: 0,
    barcode: '',
    initialStock: 0
  });

  useEffect(() => {
    loadProducts();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      ...createNavigationShortcuts(setCurrentPage),
      ...createFormShortcuts(() => {
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
      })
    ]
  });

  // Auto-focus on product name field when form is shown
  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => {
          const productNameInput = document.getElementById('product-name-input') as HTMLInputElement;
        if (productNameInput) {
          productNameInput.focus();
        }
      }, 100);
    }
  }, [showAddForm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getProducts();
      console.log('Loaded products from database:', data);
      setProducts(data);
      
      // Load variants for all products
      const variantsData: { [productId: number]: any[] } = {};
      for (const product of data) {
        try {
          const variants = await DatabaseService.getProductVariants(product.id);
          variantsData[product.id] = variants;
        } catch (error) {
          console.error(`Error loading variants for product ${product.id}:`, error);
          variantsData[product.id] = [];
        }
      }
      setProductVariants(variantsData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        base_price: formData.basePrice,
        cost_price: formData.costPrice,
        barcode: formData.barcode
      };

      if (editingProduct) {
        // Update existing product
        const updatedProduct = { ...editingProduct, ...productData };
        await DatabaseService.updateProduct(updatedProduct);
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
        
        // Handle variants for existing product
        // For now, we'll just reload the product to refresh variants
        // In a more advanced implementation, we could update/delete variants
        loadProducts();
      } else {
        // Create new product
        const newProductId = await DatabaseService.createProduct({
          ...productData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Create variants if any were added
        if (variants.length > 0) {
          for (const variant of variants) {
            // Generate proper SKU for new product variants
            const brandFirst = formData.brand.charAt(0).toUpperCase();
            const productFirst = formData.name.charAt(0).toUpperCase();
            const colorFirst = variant.color.charAt(0).toUpperCase();
            const sku = `${brandFirst}${productFirst}${colorFirst}${newProductId}-${variant.size.toUpperCase()}`;
            
            await DatabaseService.createProductVariant({
              product_id: newProductId,
              size: variant.size,
              color: variant.color,
              sku: sku,
              stock_quantity: variant.stockQuantity,
              price_adjustment: variant.priceAdjustment,
              image_url: undefined
            });
          }
        } else {
          // Create a default variant if no variants were added
          const brandFirst = formData.brand.charAt(0).toUpperCase();
          const productFirst = formData.name.charAt(0).toUpperCase();
          await DatabaseService.createProductVariant({
            product_id: newProductId,
            size: 'Default',
            color: 'Default',
            sku: `${brandFirst}${productFirst}D${newProductId}-DEFAULT`,
            stock_quantity: formData.initialStock,
            price_adjustment: 0,
            image_url: undefined
          });
        }
        
        // Reload products to get the updated list
        loadProducts();
      }
      
      setShowAddForm(false);
      setEditingProduct(null);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description || '',
              basePrice: product.base_price,
              costPrice: product.cost_price,
      barcode: product.barcode || '',
      initialStock: 0
    });
    
    // Load existing variants for this product
    try {
      const existingVariants = await DatabaseService.getProductVariants(product.id);
      console.log('Loaded variants for editing:', existingVariants);
      
      const formattedVariants = existingVariants.map(variant => ({
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stock_quantity,
        priceAdjustment: variant.price_adjustment,
        sku: variant.sku
      }));
      console.log('Formatted variants:', formattedVariants);
      setVariants(formattedVariants);
      
      // Auto-expand variants section if product has variants
      if (formattedVariants.length > 0) {
        setShowVariantsSection(true);
      }
    } catch (error) {
      console.error('Error loading variants for editing:', error);
      setVariants([]);
    }
    
    setShowAddForm(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await DatabaseService.deleteProduct(productToDelete.id);
        setProducts(products.filter(p => p.id !== productToDelete.id));
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: '',
      subcategory: '',
      description: '',
      basePrice: 0,
      costPrice: 0,
      barcode: '',
      initialStock: 0
    });
    setVariants([]); // Reset variants when adding a new product
    setNewVariant({ size: '', color: '', stockQuantity: 0, priceAdjustment: 0 });
  };

  const addVariant = () => {
    if (newVariant.size && newVariant.color) {
      // Check if this exact variant already exists
      const existingVariant = variants.find(v => 
        v.size === newVariant.size && v.color === newVariant.color
      );
      
      if (existingVariant) {
        alert(`Variant ${newVariant.size} - ${newVariant.color} already exists for this product!`);
        return;
      }
      
      // For new products, we'll generate SKU when the product is created
      // For editing products, we can generate SKU now
      let sku = '';
      if (editingProduct?.id) {
        // Editing existing product - generate SKU now
        const brandFirst = formData.brand.charAt(0).toUpperCase();
        const productFirst = formData.name.charAt(0).toUpperCase();
        const colorFirst = newVariant.color.charAt(0).toUpperCase();
        const baseSku = `${brandFirst}${productFirst}${colorFirst}${editingProduct.id}-${newVariant.size.toUpperCase()}`;
        let finalSku = baseSku;
        let counter = 1;
        
        // Check if SKU exists and generate unique one
        while (variants.find(v => v.sku === finalSku)) {
          finalSku = `${baseSku}-${counter}`;
          counter++;
        }
        sku = finalSku;
      } else {
        // New product - will generate SKU when product is created
        sku = `TEMP-${newVariant.size.toUpperCase()}-${newVariant.color.toUpperCase()}`;
      }
      
      setVariants([...variants, { ...newVariant, sku }]);
      setNewVariant({ size: '', color: '', stockQuantity: 0, priceAdjustment: 0 });
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPageNum - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadProducts}
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
          <div className="flex space-x-2">
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
                setEditingProduct(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              + Add Product
            </button>
            <button
              onClick={loadProducts}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Footwear">Footwear</option>
                </select>
              </div>
              
                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Subcategory (Optional)
                 </label>
                 <input
                   type="text"
                   value={formData.subcategory}
                   onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                 />
               </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                                           <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({...formData, initialStock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Initial stock for default variant. Set to 0 if no stock available.
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Variants Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Product Variants
                  {variants.length > 0 && !showVariantsSection && (
                    <span className="ml-2 text-sm text-blue-600">({variants.length} existing variants)</span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVariantsSection(!showVariantsSection)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showVariantsSection ? 'Hide Variants' : `Add Variants${variants.length > 0 ? ` (${variants.length})` : ''}`}
                </button>
              </div>
              
              {showVariantsSection && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="text-sm text-blue-800 mb-2">
                      <strong>Pricing Explanation:</strong>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>• <strong>Base Price:</strong> ₹{formData.basePrice} (set above)</div>
                      <div>• <strong>Price Adjustment:</strong> Additional amount for this specific variant</div>
                      <div>• <strong>Final Price:</strong> Base Price + Price Adjustment</div>
                      <div>• <strong>Example:</strong> If base price is ₹500 and adjustment is ₹50, final price will be ₹550</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {editingProduct ? 
                      'Existing variants are shown below. Use the "Variants" button to manage them in detail.' :
                      'Add specific sizes and colors for this product. Leave empty to create a simple product with a default variant.'
                    }
                  </div>
                  
                  {/* Variants List */}
                  {variants.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Added Variants:</h4>
                      <div className="space-y-2">
                        {variants.map((variant, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                            <div className="text-sm">
                              <div className="font-medium">{variant.size} - {variant.color}</div>
                              <div className="text-xs text-gray-500">
                                Stock: {variant.stockQuantity} | 
                                Price: ₹{formData.basePrice + variant.priceAdjustment}
                                {variant.priceAdjustment !== 0 && (
                                  <span className="text-blue-600">
                                    {variant.priceAdjustment > 0 ? ` (+₹${variant.priceAdjustment})` : ` (-₹${Math.abs(variant.priceAdjustment)})`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setVariants(variants.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add Variant Form */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">Add New Variant</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                        <select
                          value={newVariant.size}
                          onChange={(e) => setNewVariant({...newVariant, size: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select Size</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                          <option value="One Size">One Size</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                        <input
                          type="text"
                          value={newVariant.color}
                          onChange={(e) => setNewVariant({...newVariant, color: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="e.g., Red"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={newVariant.stockQuantity}
                          onChange={(e) => setNewVariant({...newVariant, stockQuantity: parseInt(e.target.value) || 0})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Price Adjustment (₹)
                          <span className="text-xs text-gray-500 block">+/- from base price</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newVariant.priceAdjustment}
                          onChange={(e) => setNewVariant({...newVariant, priceAdjustment: parseFloat(e.target.value) || 0})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0.00"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {newVariant.priceAdjustment > 0 ? `+₹${newVariant.priceAdjustment}` : 
                           newVariant.priceAdjustment < 0 ? `-₹${Math.abs(newVariant.priceAdjustment)}` : 
                           'No adjustment'}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={addVariant}
                      disabled={!newVariant.size || !newVariant.color}
                      className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add Variant
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Products ({filteredProducts.length})
          </h3>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No products found matching your search.' : 'No products added yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{product.category}</div>
                        <div className="text-sm text-gray-500">{product.subcategory}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                             ₹{product.base_price.toLocaleString()}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       ₹{product.cost_price.toLocaleString()}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {(() => {
                         const variants = productVariants[product.id] || [];
                         const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                         return (
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                             totalStock === 0 
                               ? 'bg-red-100 text-red-800' 
                               : totalStock <= 5
                               ? 'bg-yellow-100 text-yellow-800'
                               : 'bg-green-100 text-green-800'
                           }`}>
                             {totalStock} units
                           </span>
                         );
                       })()}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {(() => {
                         const variants = productVariants[product.id] || [];
                         if (variants.length === 0) {
                           return <span className="text-gray-400 italic">No variants</span>;
                         }
                         
                         // Group variants by size and show colors
                         const sizeGroups: { [size: string]: string[] } = {};
                         variants.forEach(v => {
                           if (!sizeGroups[v.size]) {
                             sizeGroups[v.size] = [];
                           }
                           sizeGroups[v.size].push(v.color);
                         });
                         
                         return (
                           <div className="flex flex-wrap gap-1">
                             {Object.entries(sizeGroups).map(([size, colors]) => (
                               <span
                                 key={size}
                                 className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                 title={`${size}: ${colors.join(', ')}`}
                               >
                                 {size} ({colors.length})
                               </span>
                             ))}
                           </div>
                         );
                       })()}
                     </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            console.log('Variants button clicked for product:', product);
                            console.log('Setting selectedProductId to:', product.id);
                            setSelectedProductId(product.id);
                            setShowVariants(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Manage variants"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                </span>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Items per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPageNum(1);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                  disabled={currentPageNum === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPageNum <= 3) {
                      pageNum = i + 1;
                    } else if (currentPageNum >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPageNum - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPageNum(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPageNum === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPageNum(Math.min(totalPages, currentPageNum + 1))}
                  disabled={currentPageNum === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Variants Modal */}
      {showVariants && selectedProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full h-full max-w-6xl mx-4 my-4 overflow-hidden">
            <div className="h-full overflow-auto">
              <ProductVariants 
                productId={selectedProductId} 
                onClose={() => {
                  console.log('Closing variants modal');
                  setShowVariants(false);
                  setSelectedProductId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products; 