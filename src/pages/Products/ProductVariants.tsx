import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { Product, ProductVariant } from '../../types';

interface ProductVariantsProps {
  productId: number;
  onClose: () => void;
}

const ProductVariants: React.FC<ProductVariantsProps> = ({ productId, onClose }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    size: '',
    color: '',
    stockQuantity: 0,
    priceAdjustment: 0,
    sku: ''
  });

  useEffect(() => {
    loadProductAndVariants();
  }, [productId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddForm) {
          setShowAddForm(false);
          setEditingVariant(null);
          setFormData({
            size: '',
            color: '',
            stockQuantity: 0,
            priceAdjustment: 0,
            sku: ''
          });
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
          setVariantToDelete(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showAddForm, showDeleteConfirm, onClose]);

  // Auto-focus on size field when form is shown
  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => {
        const sizeInput = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
        if (sizeInput) {
          sizeInput.focus();
        }
      }, 100);
    }
  }, [showAddForm]);

  const loadProductAndVariants = async () => {
    try {
      setLoading(true);
      
      const [products, variantsData] = await Promise.all([
        DatabaseService.getProducts(),
        DatabaseService.getProductVariants(productId)
      ]);
      
      const productData = products.find(p => p.id === productId);
      
      // Ensure variants have proper data structure
      const validatedVariants = variantsData.map(variant => ({
        ...variant,
        price_adjustment: variant.price_adjustment || 0,
        stock_quantity: variant.stock_quantity || 0,
        size: variant.size || 'Default',
        color: variant.color || 'Default',
        sku: variant.sku || `${product?.brand?.charAt(0) || 'P'}${product?.name?.charAt(0) || 'R'}D${productId}-DEFAULT`
      }));
      
      setProduct(productData || null);
      setVariants(validatedVariants);
    } catch (error) {
      console.error('Error loading product variants:', error);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Check if this exact variant already exists (for new variants)
      if (!editingVariant) {
        const existingVariant = variants.find(v => 
          v.size === formData.size && v.color === formData.color
        );
        
        if (existingVariant) {
          alert(`Variant ${formData.size} - ${formData.color} already exists for this product!`);
          return;
        }
      }
      
      // Generate unique SKU if not provided
      let finalSku = formData.sku;
      if (!finalSku) {
        // Get product details for SKU generation
        const brandFirst = product?.brand?.charAt(0).toUpperCase() || 'P';
        const productFirst = product?.name?.charAt(0).toUpperCase() || 'R';
        const colorFirst = formData.color.charAt(0).toUpperCase();
        const baseSku = `${brandFirst}${productFirst}${colorFirst}${productId}-${formData.size.toUpperCase()}`;
        let counter = 1;
        finalSku = baseSku;
        
        // Check if SKU exists and generate unique one
        while (variants.find(v => v.sku === finalSku && v.id !== editingVariant?.id)) {
          finalSku = `${baseSku}-${counter}`;
          counter++;
        }
      } else {
        // Validate manually entered SKU uniqueness
        const existingVariant = variants.find(v => 
          v.sku === finalSku && v.id !== editingVariant?.id
        );
        
        if (existingVariant) {
          alert('SKU already exists. Please use a unique SKU.');
          return;
        }
      }

      const newVariant: Omit<ProductVariant, 'id'> = {
        product_id: productId,
        size: formData.size,
        color: formData.color,
        sku: finalSku,
        stock_quantity: formData.stockQuantity,
        price_adjustment: formData.priceAdjustment || 0,
        image_url: undefined
      };

      if (editingVariant) {
        // Update existing variant
        await DatabaseService.updateProductVariant(editingVariant.id!, newVariant);
      } else {
        // Create new variant
        await DatabaseService.createProductVariant(newVariant);
      }

      setShowAddForm(false);
      setEditingVariant(null);
      resetForm();
      loadProductAndVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Error saving variant. Please try again.');
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      size: variant.size,
      color: variant.color,
      stockQuantity: variant.stock_quantity,
      priceAdjustment: variant.price_adjustment || 0,
      sku: variant.sku
    });
    setShowAddForm(true);
  };

  const handleDelete = async (variantId: number) => {
    console.log('Attempting to delete variant with ID:', variantId);
    if (!variantId) {
      alert('Cannot delete variant: Invalid variant ID');
      return;
    }
    
    try {
      await DatabaseService.deleteProductVariant(variantId);
      console.log('Variant deleted successfully');
      loadProductAndVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Error deleting variant. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (variantToDelete && variantToDelete.id) {
      await handleDelete(variantToDelete.id);
      setShowDeleteConfirm(false);
      setVariantToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setVariantToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      size: '',
      color: '',
      stockQuantity: 0,
      priceAdjustment: 0,
      sku: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading variants...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Product not found.</p>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
        >
          Back to Products
        </button>
      </div>
    );
  }

  // Fallback in case of any other issues
  if (!variants) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Error loading variants.</p>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Variants</h1>
              <div className="flex items-center mt-2">
                <span className="text-lg text-gray-600">{product.name}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-lg text-gray-600">{product.brand}</span>
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  ₹{product.base_price}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Products
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Variants</p>
                <p className="text-2xl font-semibold text-gray-900">{variants.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {variants.filter(v => v.stock_quantity > 0).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {variants.filter(v => v.stock_quantity > 0 && v.stock_quantity <= 5).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {variants.filter(v => v.stock_quantity === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Variant Button */}
        <div className="mb-8">
          {!showAddForm ? (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingVariant(null);
                resetForm();
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Variant
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {editingVariant ? `Editing: ${editingVariant.size} - ${editingVariant.color}` : 'Adding new variant'}
              </span>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingVariant(null);
                  resetForm();
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      {/* Add/Edit Variant Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingVariant ? 'Edit Variant' : 'Add New Variant'}
          </h2>
          
          {/* Pricing Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-blue-800 mb-2">
              <strong>Pricing Explanation:</strong>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
                              <div>• <strong>Base Price:</strong> ₹{product.base_price} (product base price)</div>
              <div>• <strong>Price Adjustment:</strong> Additional amount for this specific variant</div>
                              <div>• <strong>Final Price:</strong> Base Price + Price Adjustment = ₹{product.base_price + formData.priceAdjustment}</div>
              <div>• <strong>Example:</strong> If base price is ₹500 and adjustment is ₹50, final price will be ₹550</div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select
                  required
                  value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Red, Blue, Black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({...formData, stockQuantity: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Adjustment (₹)
                  <span className="text-xs text-gray-500 block">+/- from base price</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceAdjustment}
                  onChange={(e) => setFormData({...formData, priceAdjustment: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00 (optional)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.priceAdjustment > 0 ? `+₹${formData.priceAdjustment}` : 
                   formData.priceAdjustment < 0 ? `-₹${Math.abs(formData.priceAdjustment)}` : 
                   'No adjustment'} → Final Price: ₹{product.base_price + formData.priceAdjustment}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for auto-generation"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.sku ? 'Custom SKU' : `Auto-generated: ${product?.brand?.charAt(0) || 'P'}${product?.name?.charAt(0) || 'R'}${formData.color.charAt(0).toUpperCase()}${productId}-${formData.size.toUpperCase()}`}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                {editingVariant ? 'Update Variant' : 'Add Variant'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingVariant(null);
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

      {/* Variants List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Variants</h3>
        </div>
        
        {variants.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No variants found. Add your first variant above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Adj.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.color}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        variant.stock_quantity === 0 
                          ? 'bg-red-100 text-red-800' 
                          : variant.stock_quantity <= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {variant.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{(variant.price_adjustment || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEdit(variant)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setVariantToDelete(variant);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && variantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the variant "{variantToDelete.size} - {variantToDelete.color}" (SKU: {variantToDelete.sku})? This action cannot be undone.
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
    </div>
  );
};

export default ProductVariants; 