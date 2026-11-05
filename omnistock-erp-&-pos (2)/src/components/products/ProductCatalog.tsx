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
  X,
  ArrowRight,
  SlidersHorizontal
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
  const [viewMode, setViewMode] = useState<'command_cards' | 'grid' | 'table'>('command_cards');

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
  }, [dbState.products, dbState.customCategories, dbState.hiddenCategories]);

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

  // Product and Category editing permissions: Owner, Admin, Manager, and Inventory only
  const canManageProducts = dbStore.hasPermission('manageProducts');

  const handleDeleteProduct = (productId: string) => {
    if (!canManageProducts) {
      alert('Access restricted: Only Owner, Admin, Manager, and Inventory can modify or delete products.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this product from your selling catalog?')) {
      dbStore.deleteProduct(productId);
    }
  };

  const handleClearAllProducts = () => {
    if (!canManageProducts) return;
    if (window.confirm('Clear all demo products to start with a blank catalog?')) {
      dbStore.clearAllProducts();
    }
  };

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white p-4 sm:p-6 lg:p-8">
      {/* Variation 27: Dark Command Center Layout Split */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Title & Subtitle */}
          <div>
            <div className="command-label mb-2">DIRECTORIES // CATALOG INDEX</div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl sm:text-6xl font-bold uppercase tracking-tight text-white leading-none">
                  Active<br className="hidden sm:inline" /> Inventory
                </h1>
                <p className="font-mono text-xs text-white/50 mt-2">
                  LOC: {activeLocation?.name || 'CENTRAL_CDC'} // {filteredProducts.length} ACTIVE ASSETS REGISTERED
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {onOpenLocationManager && (
                  <button
                    onClick={onOpenLocationManager}
                    className="px-3 py-1.5 bg-[#161616] hover:bg-[#222222] text-white/80 hover:text-white border border-[#2a2a2a] rounded-xs font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-white/50" />
                    <span>Location</span>
                  </button>
                )}

                {canManageProducts && (
                  <>
                    <button
                      onClick={() => setShowCategoryModal(true)}
                      className="px-3 py-1.5 bg-[#161616] hover:bg-[#222222] text-white/80 hover:text-white border border-[#2a2a2a] rounded-xs font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Tag className="w-3.5 h-3.5 text-white/50" />
                      <span>Categories</span>
                    </button>

                    <button
                      onClick={() => setShowBulkImportModal(true)}
                      className="px-3 py-1.5 bg-[#161616] hover:bg-[#222222] text-white/80 hover:text-white border border-[#2a2a2a] rounded-xs font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-white/50" />
                      <span>Import Excel</span>
                    </button>

                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-1.5 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Register Asset</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search, Filter Tabs & View Mode Bar */}
          <div className="bg-[#111111] border border-[#222222] p-4 rounded-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input with JetBrains Mono */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="QUERY_ASSET_NAME_OR_SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-white/30 rounded-xs focus:outline-none focus:border-white"
                />
              </div>

              {/* Stock Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="bg-[#161616] border border-[#262626] font-mono text-xs text-white/80 rounded-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-white"
                >
                  <option value="all">ALL_STOCK_LEVELS</option>
                  <option value="in_stock">IN_STOCK_ONLY</option>
                  <option value="low_stock">LOW_STOCK_ALERTS</option>
                  <option value="out_of_stock">DEPLETED_STOCK</option>
                </select>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-[#161616] border border-[#262626] rounded-xs p-0.5">
                  <button
                    onClick={() => setViewMode('command_cards')}
                    title="Variation 27 Command Cards"
                    className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                      viewMode === 'command_cards' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                    className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Segmented Category Filter Links */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 no-scrollbar font-mono text-xs">
              {categoryOptions.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = categoriesWithCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xs whitespace-nowrap transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#161616] text-white/50 hover:text-white border border-[#222222]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Items: Variation 27 Command Cards */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-[#111111] border border-[#222222] rounded-xs space-y-3 font-mono">
              <Package className="w-8 h-8 text-white/30 mx-auto" />
              <div className="text-white font-bold text-sm uppercase">NO_RECORDS_FOUND</div>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                No items match your filter. Register a new asset or reset category filters.
              </p>
              {canManageProducts && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 px-4 py-2 bg-white text-black font-bold text-xs uppercase"
                >
                  + Register Asset
                </button>
              )}
            </div>
          ) : viewMode === 'command_cards' ? (
            /* Variation 27: Exact Dark Command Center Card List */
            <div className="flex flex-col gap-[1px] bg-[#222222] border border-[#222222] rounded-xs overflow-hidden">
              {filteredProducts.map((product) => {
                const stock = dbStore.getProductStock(product.id);
                const isOut = stock === 0;
                const isLow = stock > 0 && stock <= product.reorderThreshold;

                const minPrice =
                  product.hasVariations && product.variations && product.variations.length > 0
                    ? Math.min(...product.variations.map((v) => v.retailPrice))
                    : product.retailPrice;
                const maxPrice =
                  product.hasVariations && product.variations && product.variations.length > 0
                    ? Math.max(...product.variations.map((v) => v.retailPrice))
                    : product.retailPrice;

                return (
                  <article
                    key={product.id}
                    className="grid grid-cols-[80px_1fr_auto] gap-4 sm:gap-6 bg-[#111111] hover:bg-[#141414] p-4 items-center transition-colors group"
                  >
                    {/* Variation 27 .img-box (80x80) */}
                    <div className="w-20 h-20 bg-[#1c1c1c] border border-[#262626] rounded-xs overflow-hidden shrink-0 flex items-center justify-center relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-white/30" />
                      )}

                      {isOut && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-[10px] font-mono text-rose-400 font-bold uppercase">
                          OUT
                        </div>
                      )}
                    </div>

                    {/* Card Info: SKU ID Tag, Oswald Title, Variations */}
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-white/50 tracking-wider">
                          {product.sku}
                        </span>
                        <span className="text-[#262626] font-mono text-[10px]">|</span>
                        <span className="font-mono text-[10px] uppercase text-white/40 tracking-wider">
                          {product.category}
                        </span>
                        {product.hasVariations && product.variations && (
                          <span className="font-mono text-[10px] text-emerald-400 uppercase">
                            // {product.variations.length} {product.variationType || 'Variants'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-bold text-lg sm:text-xl uppercase text-white tracking-tight mt-0.5 group-hover:text-neutral-200 transition-colors truncate">
                        {product.name}
                      </h3>

                      {/* Stock Level in monospace */}
                      <div className="flex items-center gap-3 text-xs font-mono mt-1 text-white/50">
                        <span className={isOut ? 'text-rose-400 font-bold' : isLow ? 'text-amber-400 font-bold' : 'text-white/70'}>
                          STOCK: {stock} UNITS
                        </span>
                        <span>•</span>
                        <span>WHOLESALE: {formatNaira(product.wholesaleBasePrice)}</span>
                      </div>
                    </div>

                    {/* Right Price & Quick Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="font-mono text-sm sm:text-base font-bold text-white text-right tracking-tight tabular-nums">
                        {minPrice === maxPrice
                          ? formatNaira(minPrice)
                          : `${formatNaira(minPrice)} — ${formatNaira(maxPrice)}`}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onNavigateToPosWithProduct && (
                          <button
                            onClick={() => onNavigateToPosWithProduct(product.id)}
                            disabled={isOut}
                            className="px-3 py-1 bg-white hover:bg-neutral-200 disabled:opacity-30 text-black font-mono font-bold text-[11px] uppercase rounded-xs transition-colors cursor-pointer"
                          >
                            Sell
                          </button>
                        )}
                        {canManageProducts && (
                          <>
                            <button
                              onClick={() => setEditingProduct(product)}
                              title="Edit product"
                              className="p-1 text-white/50 hover:text-white border border-[#2a2a2a] hover:border-white rounded-xs transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Delete product"
                              className="p-1 text-white/40 hover:text-rose-400 border border-[#2a2a2a] hover:border-rose-500 rounded-xs transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Multi-column Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const stock = dbStore.getProductStock(product.id);
                const isOut = stock === 0;
                const isLow = stock > 0 && stock <= product.reorderThreshold;

                return (
                  <div
                    key={product.id}
                    className="bg-[#111111] border border-[#222222] p-4 flex flex-col justify-between rounded-xs hover:border-[#333333] transition-colors"
                  >
                    <div>
                      <div className="w-full aspect-4/3 bg-[#1a1a1a] border border-[#222222] rounded-xs overflow-hidden mb-3 relative flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-white/20" />
                        )}
                        <div className="absolute top-2 left-2 font-mono text-[10px] bg-black/80 text-white/80 px-2 py-0.5">
                          {product.sku}
                        </div>
                      </div>

                      <div className="font-mono text-[10px] text-white/40 uppercase">
                        {product.category}
                      </div>
                      <h3 className="font-display font-bold text-lg text-white uppercase mt-0.5">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between">
                      <div className="font-mono text-sm font-bold text-white">
                        {formatNaira(product.retailPrice)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {onNavigateToPosWithProduct && (
                          <button
                            onClick={() => onNavigateToPosWithProduct(product.id)}
                            className="px-3 py-1 bg-white text-black font-mono font-bold text-xs uppercase"
                          >
                            Sell
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Variation 27: Dedicated Stats Pane */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#111111] border border-[#222222] p-6 flex flex-col justify-between rounded-xs space-y-6">
          <div className="space-y-6">
            {/* Stat Item 1: Unit Count */}
            <div className="border-b border-[#222222] pb-6">
              <div className="command-label">Unit Count</div>
              <div className="font-display text-5xl sm:text-6xl font-bold text-white tracking-tight leading-none mt-2 tabular-nums">
                {catalogStats.totalStockUnits.toLocaleString()}
              </div>
              <div className="font-mono text-[11px] text-white/40 mt-1">
                ACROSS {dbState.locations.length} ACTIVE STORE NODES
              </div>
            </div>

            {/* Stat Item 2: Estimated Value */}
            <div className="border-b border-[#222222] pb-6">
              <div className="command-label">Estimated Value</div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight leading-none mt-2 font-mono tabular-nums">
                {formatNaira(catalogStats.totalRetailValue)}
              </div>
              <div className="font-mono text-[11px] text-white/40 mt-1">
                COMBINED RETAIL ASSET VALUATION
              </div>
            </div>

            {/* Stat Item 3: Inventory Integrity */}
            <div>
              <div className="command-label">Inventory Health</div>
              <div className="space-y-2 mt-3 font-mono text-xs">
                <div className="flex justify-between items-center text-white/70">
                  <span>Registered Assets:</span>
                  <span className="font-bold text-white">{catalogStats.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center text-amber-400">
                  <span>Reorder Thresholds:</span>
                  <span className="font-bold">{catalogStats.lowStockCount} items</span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span>Stock Depleted:</span>
                  <span className="font-bold">{catalogStats.outStockCount} items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons from Variation 27 */}
          <div className="pt-4 border-t border-[#222222] space-y-2.5">
            {canManageProducts && (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center block"
              >
                + Register Asset
              </button>
            )}

            <button
              onClick={() => exportProductsToWorkbook(dbState.products, dbState.inventory)}
              className="w-full py-3 bg-transparent hover:bg-[#181818] border border-[#333333] hover:border-white text-white font-mono font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer text-center block"
            >
              Generate Report
            </button>

            {onNavigateToPosWithProduct && (
              <button
                onClick={() => onNavigateToPosWithProduct(filteredProducts[0]?.id || '')}
                className="w-full py-3 bg-[#181818] hover:bg-[#202020] border border-[#2a2a2a] text-white font-mono font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer text-center block"
              >
                Process All Orders →
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProductSellModal
          dbState={dbState}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          dbState={dbState}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {showCategoryModal && (
        <CategoryManagerModal
          dbState={dbState}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {showBulkImportModal && (
        <BulkProductImportModal
          dbState={dbState}
          onClose={() => setShowBulkImportModal(false)}
        />
      )}
    </div>
  );
};
