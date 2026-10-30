import React, { useState, useMemo } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import { Product } from '../../types/database';
import {
  Package,
  Plus,
  Search,
  Tag,
  Edit3,
  Trash2,
  ShoppingCart,
  Grid,
  List,
  Layers,
  MapPin,
  RotateCcw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  TrendingUp,
  X
} from 'lucide-react';
import { AddProductSellModal } from './AddProductSellModal';
import { EditProductModal } from './EditProductModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { BulkProductImportModal } from './BulkProductImportModal';
import { exportProductsToWorkbook } from '../../utils/spreadsheetUtils';
import { formatNaira } from '../../utils/nigerianBanks';

interface ProductCatalogProps {
  dbState: DatabaseState;
  onNavigateToPosWithProduct?: (productId: string) => void;
  onOpenLocationManager?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  dbState,
  onNavigateToPosWithProduct,
  onOpenLocationManager
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Active location
  const activeLocationId = dbStore.getActiveLocationId();
  const activeLocation = dbState.locations.find((l) => l.id === activeLocationId) || dbState.locations[0];

  // Categories list from store
  const allCategories = useMemo(() => {
    return dbStore.getCategories();
  }, [dbState.products, dbState.customCategories]);

  // Category counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { All: dbState.products.length };
    allCategories.forEach((c) => {
      counts[c] = 0;
    });
    dbState.products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [dbState.products, allCategories]);

  const categoryOptions = ['All', ...allCategories];

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return dbState.products.filter((product) => {
      if (selectedCategory !== 'All' && product.category !== selectedCategory) {
        return false;
      }

      const stock = dbStore.getProductStock(product.id);
      if (stockFilter === 'in_stock' && stock <= 0) return false;
      if (stockFilter === 'low_stock' && (stock > product.reorderThreshold || stock === 0)) return false;
      if (stockFilter === 'out_of_stock' && stock > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = product.name.toLowerCase().includes(q);
        const matchCat = product.category.toLowerCase().includes(q);
        const matchDesc = (product.description || '').toLowerCase().includes(q);
        const matchSku = (product.sku || '').toLowerCase().includes(q);
        return matchName || matchCat || matchDesc || matchSku;
      }

      return true;
    });
  }, [dbState.products, selectedCategory, stockFilter, searchQuery, dbState.inventory]);

  // Overall catalog metrics
  const catalogStats = useMemo(() => {
    let totalStockUnits = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outStockCount = 0;

    dbState.products.forEach((p) => {
      const stock = dbStore.getProductStock(p.id);
      totalStockUnits += stock;
      totalRetailValue += stock * p.retailPrice;
      if (stock === 0) outStockCount++;
      else if (stock <= p.reorderThreshold) lowStockCount++;
    });

    return {
      totalProducts: dbState.products.length,
      totalStockUnits,
      totalRetailValue,
      lowStockCount,
      outStockCount
    };
  }, [dbState.products, dbState.inventory]);

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to remove this product from your selling catalog?')) {
      dbStore.deleteProduct(productId);
    }
  };

  const handleClearAllProducts = () => {
    if (window.confirm('Clear all demo products to start with a blank catalog?')) {
      dbStore.clearAllProducts();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Product Catalog</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {activeLocation?.name || 'Main Branch'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Products
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your goods, retail pricing, wholesale tiers, and stock levels.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenLocationManager && (
            <button
              onClick={onOpenLocationManager}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Location</span>
            </button>
          )}

          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => exportProductsToWorkbook(dbState.products, dbState.inventory)}
            title="Export catalog to Excel workbook (.xlsx)"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowBulkImportModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel / CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>

          {dbState.products.length > 0 && (
            <button
              onClick={handleClearAllProducts}
              title="Clear all demo products"
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Minimal KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Products</div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {catalogStats.totalProducts}
          </div>
          <div className="text-xs text-slate-400">Active catalog items</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Stock on Hand</div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {catalogStats.totalStockUnits.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">Total units available</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Catalog Retail Value</div>
          <div className="text-2xl font-semibold text-emerald-400 tracking-tight">
            {formatNaira(catalogStats.totalRetailValue)}
          </div>
          <div className="text-xs text-slate-400">Valued at selling prices</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Inventory Health</div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {catalogStats.lowStockCount > 0 ? (
              <span className="text-amber-400">{catalogStats.lowStockCount} to reorder</span>
            ) : (
              <span className="text-emerald-400">All Healthy</span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {catalogStats.outStockCount > 0 ? `${catalogStats.outStockCount} out of stock` : 'Zero stockouts'}
          </div>
        </div>
      </div>

      {/* Search, Category Navigation & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Stock Filter & View Mode */}
          <div className="flex items-center gap-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table view"
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs (Segmented bar style, anti-slop, clean) */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-1 no-scrollbar text-xs">
          {categoryOptions.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoriesWithCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[11px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Content: Grid or Table */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {dbState.products.length === 0 ? 'Your product catalog is empty' : 'No products found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {dbState.products.length === 0
                ? 'Get started by adding your first product or importing an existing Excel/CSV spreadsheet.'
                : searchQuery
                ? `No items match "${searchQuery}". Clear your search or add a new product.`
                : 'No products found in this category.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Minimal Clean Grid Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stock = dbStore.getProductStock(product.id);
            const isLow = stock > 0 && stock <= product.reorderThreshold;
            const isOut = stock === 0;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden flex flex-col justify-between transition-colors shadow-xs group"
              >
                {/* Product Image Box */}
                <div className="aspect-4/3 w-full bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800/80">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-1 p-4 text-center">
                      <Package className="w-8 h-8 opacity-30" />
                      <span className="text-[11px] text-slate-400">
                        {product.category}
                      </span>
                    </div>
                  )}

                  {/* Stock Status Indicator: Clean quiet badge */}
                  <div className="absolute top-2.5 right-2.5 bg-slate-900/90 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] border border-slate-800 text-slate-300">
                    {isOut ? (
                      <span className="text-rose-400 font-medium">Out of stock</span>
                    ) : isLow ? (
                      <span className="text-amber-400 font-medium">{stock} low</span>
                    ) : (
                      <span>{stock} in stock</span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Unboxed Metadata Line */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                      <span>{product.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{product.sku}</span>
                    </div>

                    <h3 className="font-medium text-white text-sm tracking-tight leading-snug">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Variations Preview Tag */}
                    {product.hasVariations && product.variations && product.variations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5 text-teal-300 font-bold font-mono uppercase tracking-wider">
                            <Layers className="w-3 h-3 text-teal-400" />
                            <span>{product.variations.length} {product.variationType || 'Variants'}:</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {product.variations.slice(0, 3).map((v) => (
                            <span
                              key={v.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-slate-950 to-slate-900 text-slate-200 border border-slate-700/80 font-mono font-medium flex items-center gap-1.5 shadow-xs"
                            >
                              <span>{v.name}</span>
                              <span className="text-emerald-300 font-extrabold">· {formatNaira(v.retailPrice)}</span>
                            </span>
                          ))}
                          {product.variations.length > 3 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700 font-mono font-semibold">
                              +{product.variations.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">
                          {product.hasVariations && product.variations && product.variations.length > 0
                            ? 'Price Range'
                            : 'Retail Price'}
                        </div>
                        <div className="text-base sm:text-lg font-semibold text-emerald-400 font-mono">
                          {product.hasVariations && product.variations && product.variations.length > 0
                            ? `${formatNaira(Math.min(...product.variations.map((v) => v.retailPrice)))} - ${formatNaira(Math.max(...product.variations.map((v) => v.retailPrice)))}`
                            : formatNaira(product.retailPrice)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Wholesale</div>
                        <div className="text-xs text-slate-300 font-medium font-mono">
                          {formatNaira(product.wholesaleBasePrice)}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingProduct(product)}
                          title="Edit product"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Delete product"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {onNavigateToPosWithProduct && (
                        <button
                          onClick={() => onNavigateToPosWithProduct(product.id)}
                          disabled={isOut}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            isOut
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Sell</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Minimal Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Retail Price</th>
                  <th className="py-3 px-4">Wholesale Price</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((product) => {
                  const stock = dbStore.getProductStock(product.id);
                  const isLow = stock > 0 && stock <= product.reorderThreshold;
                  const isOut = stock === 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-500 opacity-50" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white text-xs">{product.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400">{product.category}</span>
                              {product.hasVariations && product.variations && product.variations.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs">
                                  <Layers className="w-2.5 h-2.5 text-teal-400" />
                                  <span>{product.variations.length} options</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">{product.sku}</td>

                      <td className="py-3 px-4 font-semibold text-emerald-400 text-xs font-mono">
                        {product.hasVariations && product.variations && product.variations.length > 0 ? (
                          <span>
                            {formatNaira(Math.min(...product.variations.map((v) => v.retailPrice)))} -{' '}
                            {formatNaira(Math.max(...product.variations.map((v) => v.retailPrice)))}
                          </span>
                        ) : (
                          formatNaira(product.retailPrice)
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {formatNaira(product.wholesaleBasePrice)}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {formatNaira(product.costPrice)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={
                            isOut
                              ? 'text-rose-400 font-medium'
                              : isLow
                              ? 'text-amber-400 font-medium'
                              : 'text-slate-300'
                          }
                        >
                          {stock}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onNavigateToPosWithProduct && (
                            <button
                              onClick={() => onNavigateToPosWithProduct(product.id)}
                              disabled={isOut}
                              className="px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              Sell
                            </button>
                          )}
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProductSellModal dbState={dbState} onClose={() => setShowAddModal(false)} />
      )}

      {showBulkImportModal && (
        <BulkProductImportModal
          dbState={dbState}
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={() => setShowBulkImportModal(false)}
        />
      )}

      {showCategoryModal && (
        <CategoryManagerModal dbState={dbState} onClose={() => setShowCategoryModal(false)} />
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          dbState={dbState}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};
