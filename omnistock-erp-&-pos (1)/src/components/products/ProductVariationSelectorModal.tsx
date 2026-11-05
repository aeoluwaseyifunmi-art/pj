import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariation } from '../../types/database';
import { formatNaira } from '../../utils/nigerianBanks';
import {
  Layers,
  X,
  Check,
  ShoppingCart,
  Tag,
  Package,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  TrendingDown,
  Search,
  CheckCircle2
} from 'lucide-react';

interface ProductVariationSelectorModalProps {
  product: Product;
  channel: 'retail' | 'wholesale';
  onSelectVariation: (product: Product, variation: ProductVariation, quantity: number) => void;
  onClose: () => void;
}

export const ProductVariationSelectorModal: React.FC<ProductVariationSelectorModalProps> = ({
  product,
  channel,
  onSelectVariation,
  onClose
}) => {
  const variations = product.variations || [];
  const [selectedVariationId, setSelectedVariationId] = useState<string>(
    variations[0]?.id || ''
  );
  const [searchFilter, setSearchFilter] = useState('');

  const minWholesale = product.minWholesaleQty || 5;
  const [quantity, setQuantity] = useState<number>(
    channel === 'wholesale' ? minWholesale : 1
  );

  const selectedVariation = variations.find((v) => v.id === selectedVariationId) || variations[0];

  const getEffectivePrice = (v: ProductVariation) => {
    if (channel === 'wholesale') {
      return v.wholesalePrice || Math.round(v.retailPrice * 0.7);
    }
    return v.retailPrice;
  };

  // Keyboard navigation: Enter to add, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && selectedVariation) {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVariation, quantity]);

  const currentPrice = selectedVariation ? getEffectivePrice(selectedVariation) : product.retailPrice;
  const totalPrice = currentPrice * quantity;
  const basePrice = channel === 'wholesale'
    ? (product.wholesaleBasePrice || Math.round(product.retailPrice * 0.7))
    : product.retailPrice;

  // Filter variations if search query present
  const filteredVariations = useMemo(() => {
    if (!searchFilter.trim()) return variations;
    const q = searchFilter.toLowerCase();
    return variations.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.sku && v.sku.toLowerCase().includes(q)) ||
        (v.barcode && v.barcode.includes(q))
    );
  }, [variations, searchFilter]);

  const handleConfirm = () => {
    if (!selectedVariation) return;
    onSelectVariation(product, selectedVariation, quantity);
    onClose();
  };

  const handleQuickAddQty = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleSetExactQty = (val: number) => {
    setQuantity(Math.max(1, val));
  };

  const stockAvailable = selectedVariation?.stock ?? 999;
  const isOutOfStock = stockAvailable <= 0;
  const exceedsStock = stockAvailable > 0 && quantity > stockAvailable;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-gradient-to-b from-slate-900 via-[#0e1628] to-[#0a101d] border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] space-y-5 animate-in zoom-in-95 duration-200 relative my-auto overflow-hidden">
        {/* Subtle luminous top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Top Product Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 pt-1">
          <div className="flex items-center gap-3.5">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-700/80 shrink-0 shadow-md shadow-black/40"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-cyan-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-md shadow-black/40">
                <Layers className="w-7 h-7" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/80">
                  {product.category}
                </span>
                <span
                  className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-bold shadow-xs ${
                    channel === 'wholesale'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {channel === 'wholesale' ? 'Wholesale Bulk Mode' : 'Retail POS Mode'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                <span>SKU: <span className="text-slate-200 font-semibold">{product.sku}</span></span>
                <span>•</span>
                <span className="text-teal-400 font-sans font-medium">
                  {product.variationType || 'Select Option'} ({variations.length} available)
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search if > 4 variations */}
        {variations.length > 4 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${product.variationType || 'variations'}...`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        )}

        {/* Variation Selection Cards Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-teal-400" />
              <span>Choose {product.variationType || 'Variation'}</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Base: <strong className="text-slate-200">{formatNaira(basePrice)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {filteredVariations.map((v) => {
              const isSelected = v.id === selectedVariationId;
              const price = getEffectivePrice(v);
              const priceDelta = price - basePrice;
              const stock = v.stock ?? 99;
              const outOfStock = stock <= 0;
              const lowStock = stock > 0 && stock <= 5;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariationId(v.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm transition-colors ${
                          isSelected ? 'text-emerald-200' : 'text-white group-hover:text-emerald-300'
                        }`}>
                          {v.name}
                        </span>
                      </div>
                      {v.sku && (
                        <span className="text-[10px] font-mono text-slate-400 block">
                          SKU: {v.sku}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30 animate-in zoom-in-75 duration-100">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-500 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Stock status indicator pill */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          outOfStock
                            ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                            : lowStock
                            ? 'bg-amber-400 shadow-xs shadow-amber-400/50 animate-pulse'
                            : 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          outOfStock
                            ? 'text-rose-400'
                            : lowStock
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {outOfStock
                          ? 'Out of Stock'
                          : lowStock
                          ? `${stock} Left (Low)`
                          : `${stock} in stock`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-emerald-300 block">
                        {formatNaira(price)}
                      </span>
                      {priceDelta !== 0 && (
                        <span
                          className={`text-[9px] font-mono font-semibold block ${
                            priceDelta > 0 ? 'text-amber-300' : 'text-cyan-300'
                          }`}
                        >
                          {priceDelta > 0 ? `+${formatNaira(priceDelta)}` : formatNaira(priceDelta)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Stepper & Price Calculation Summary */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-300 font-semibold block uppercase tracking-wider">
                Quantity to Add:
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 active:scale-95 text-white font-bold flex items-center justify-center transition-all cursor-pointer border border-slate-700 shadow-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 text-center bg-slate-900 border border-slate-700 rounded-lg py-1.5 font-mono text-white text-sm font-bold focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 active:scale-95 text-white font-bold flex items-center justify-center transition-all cursor-pointer border border-slate-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* Quick Add Increment Pills */}
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAddQty(5)}
                    className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQty(10)}
                    className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                  {channel === 'wholesale' && (
                    <button
                      type="button"
                      onClick={() => handleSetExactQty(minWholesale)}
                      className="px-2.5 py-1 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 rounded-md text-[11px] font-mono border border-cyan-700 transition-colors cursor-pointer font-bold shadow-xs"
                    >
                      MOQ ({minWholesale})
                    </button>
                  )}
                  {stockAvailable > 0 && stockAvailable < 100 && (
                    <button
                      type="button"
                      onClick={() => handleSetExactQty(stockAvailable)}
                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 text-emerald-300 hover:text-white rounded-md text-[11px] font-mono border border-emerald-700 transition-colors cursor-pointer shadow-xs"
                    >
                      Max ({stockAvailable})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Price breakdown card */}
            <div className="text-left sm:text-right font-mono bg-gradient-to-br from-slate-900/90 to-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 shadow-xs">
              <span className="text-[10px] text-emerald-400/80 block uppercase tracking-wider font-semibold">
                Subtotal Amount:
              </span>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-200 block">
                {formatNaira(totalPrice)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {quantity} units × {formatNaira(currentPrice)}
              </span>
            </div>
          </div>

          {/* Stock warnings */}
          {exceedsStock && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Requested quantity ({quantity}) exceeds currently recorded stock ({stockAvailable}). Sale can proceed on backorder or negative stock override.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400 hidden sm:block font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">Enter</kbd> to add
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 hover:brightness-105 active:scale-95 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <span>Add to Cart ({formatNaira(totalPrice)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
