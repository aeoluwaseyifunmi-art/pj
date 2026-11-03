import React, { useState } from 'react';
import { ProductVariation } from '../../types/database';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Tag,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatNaira } from '../../utils/nigerianBanks';

interface VariationBuilderSectionProps {
  hasVariations: boolean;
  onToggleHasVariations: (enabled: boolean) => void;
  variationType: string;
  onChangeVariationType: (type: string) => void;
  variations: ProductVariation[];
  onChangeVariations: (variations: ProductVariation[]) => void;
  baseRetailPrice: number;
  baseWholesalePrice: number;
  baseCostPrice: number;
  baseSku?: string;
}

export const VariationBuilderSection: React.FC<VariationBuilderSectionProps> = ({
  hasVariations,
  onToggleHasVariations,
  variationType,
  onChangeVariationType,
  variations,
  onChangeVariations,
  baseRetailPrice,
  baseWholesalePrice,
  baseCostPrice,
  baseSku = 'ITEM'
}) => {
  const [customTagInput, setCustomTagInput] = useState('');
  const [showBulkToolbar, setShowBulkToolbar] = useState(false);

  // Dimension presets with curated themes and quick-add items
  const dimensionPresets = [
    {
      label: 'Pack Size & Weight',
      value: 'Pack Size & Weight',
      badgeColor: 'text-emerald-300',
      activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300',
      items: ['250g Pouch', '500g Bag', '1kg Roaster', '2kg Bulk', '5kg Sack']
    },
    {
      label: 'Volume & Bottling',
      value: 'Volume & Packaging',
      badgeColor: 'text-cyan-300',
      activeClass: 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30 shadow-md shadow-cyan-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300',
      items: ['250ml Can', '500ml Bottle', '750ml Glass', '1 Litre', 'Carton of 6']
    },
    {
      label: 'Apparel & Sizes',
      value: 'Apparel Size',
      badgeColor: 'text-indigo-300',
      activeClass: 'bg-indigo-500/20 border-indigo-400 text-indigo-200 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300',
      items: ['Small (S)', 'Medium (M)', 'Large (L)', 'XL', '2XL']
    },
    {
      label: 'Colors & Finishes',
      value: 'Color & Finish',
      badgeColor: 'text-amber-300',
      activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-500/30 shadow-md shadow-amber-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300',
      items: ['Midnight Black', 'Pearl White', 'Royal Blue', 'Emerald Green', 'Gold']
    },
    {
      label: 'Flavors & Scents',
      value: 'Flavors',
      badgeColor: 'text-rose-300',
      activeClass: 'bg-rose-500/20 border-rose-400 text-rose-200 ring-2 ring-rose-500/30 shadow-md shadow-rose-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-rose-500/40 hover:text-rose-300',
      items: ['Original', 'Vanilla', 'Chocolate', 'Strawberry', 'Mint Lime']
    },
    {
      label: 'Bundling & Packs',
      value: 'Packaging Pack',
      badgeColor: 'text-sky-300',
      activeClass: 'bg-sky-500/20 border-sky-400 text-sky-200 ring-2 ring-sky-500/30 shadow-md shadow-sky-950/40',
      inactiveClass: 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-sky-500/40 hover:text-sky-300',
      items: ['Single Unit', 'Pack of 3', 'Pack of 6', 'Carton of 12', 'Master Case (24)']
    }
  ];

  const currentPresetObj =
    dimensionPresets.find((p) => p.value === variationType) || dimensionPresets[0];

  const generateCleanSku = (name: string, index: number) => {
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    return `${baseSku}-${sanitizedName || index + 1}`;
  };

  const handleAddVariation = (name = 'New Option') => {
    const id = `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSku = generateCleanSku(name, variations.length);
    const newVar: ProductVariation = {
      id,
      name,
      sku: newSku,
      retailPrice: baseRetailPrice || 1000,
      wholesalePrice: baseWholesalePrice || Math.round((baseRetailPrice || 1000) * 0.7),
      costPrice: baseCostPrice || Math.round((baseRetailPrice || 1000) * 0.5),
      stock: 20,
      inStock: true
    };
    onChangeVariations([...variations, newVar]);
  };

  const handleAddMultipleCustomTags = () => {
    if (!customTagInput.trim()) return;
    const tags = customTagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newVars: ProductVariation[] = tags.map((tagName, idx) => ({
      id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      name: tagName,
      sku: generateCleanSku(tagName, variations.length + idx),
      retailPrice: baseRetailPrice || 1000,
      wholesalePrice: baseWholesalePrice || Math.round((baseRetailPrice || 1000) * 0.7),
      costPrice: baseCostPrice || Math.round((baseRetailPrice || 1000) * 0.5),
      stock: 25,
      inStock: true
    }));

    onChangeVariations([...variations, ...newVars]);
    setCustomTagInput('');
  };

  const handleDuplicateVariation = (v: ProductVariation) => {
    const duplicated: ProductVariation = {
      ...v,
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${v.name} (Copy)`,
      sku: `${v.sku || baseSku}-COPY`
    };
    onChangeVariations([...variations, duplicated]);
  };

  const handleUpdateVariation = (id: string, updates: Partial<ProductVariation>) => {
    onChangeVariations(
      variations.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const handleRemoveVariation = (id: string) => {
    onChangeVariations(variations.filter((v) => v.id !== id));
  };

  const handleApplyPresetGroup = (presetObj: typeof dimensionPresets[0]) => {
    onChangeVariationType(presetObj.value);
    const generated: ProductVariation[] = presetObj.items.map((name, idx) => {
      const priceMultiplier = 1 + idx * 0.35;
      return {
        id: `var_${Date.now()}_${idx}`,
        name,
        sku: `${baseSku}-${idx + 1}`,
        retailPrice: baseRetailPrice
          ? Math.round(baseRetailPrice * priceMultiplier)
          : (idx + 1) * 2000,
        wholesalePrice: baseWholesalePrice
          ? Math.round(baseWholesalePrice * priceMultiplier)
          : (idx + 1) * 1500,
        costPrice: baseCostPrice
          ? Math.round(baseCostPrice * priceMultiplier)
          : (idx + 1) * 1000,
        stock: 25,
        inStock: true
      };
    });
    onChangeVariations(generated);
  };

  // Bulk tools
  const handleApplyBasePricesToAll = () => {
    onChangeVariations(
      variations.map((v) => ({
        ...v,
        retailPrice: baseRetailPrice || v.retailPrice,
        wholesalePrice: baseWholesalePrice || v.wholesalePrice,
        costPrice: baseCostPrice || v.costPrice
      }))
    );
  };

  const handleRegenerateAllSkus = () => {
    onChangeVariations(
      variations.map((v, idx) => ({
        ...v,
        sku: generateCleanSku(v.name, idx)
      }))
    );
  };

  const handleSetUniformStock = (amt: number) => {
    onChangeVariations(
      variations.map((v) => ({
        ...v,
        stock: amt,
        inStock: amt > 0
      }))
    );
  };

  // Metrics summary
  const totalVariantStock = variations.reduce((sum, v) => sum + (v.stock || 0), 0);
  const minPrice = variations.length > 0 ? Math.min(...variations.map((v) => v.retailPrice)) : 0;
  const maxPrice = variations.length > 0 ? Math.max(...variations.map((v) => v.retailPrice)) : 0;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-[#0e1628] to-[#0a101d] border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl shadow-black/30 overflow-hidden relative">
      {/* Top Header & Activation Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5 shadow-md shadow-emerald-950/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Product Variations & Options Matrix</span>
              {hasVariations && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  {variations.length} Active Options
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Enable multi-size, flavors, weights, or packaging with independent pricing and inventory tracking.
            </p>
          </div>
        </div>

        {/* Modern Glowing Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={hasVariations}
            onChange={(e) => {
              const checked = e.target.checked;
              onToggleHasVariations(checked);
              if (checked && variations.length === 0) {
                handleApplyPresetGroup(dimensionPresets[0]);
              }
            }}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-400 peer-checked:to-teal-400 shadow-inner"></div>
          <span className={`ml-2.5 text-xs font-bold ${hasVariations ? 'text-emerald-300' : 'text-slate-400'}`}>
            {hasVariations ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {hasVariations && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Preset Dimension Selector Cards with vibrant visual identity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                <span>Select Dimension Preset:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Active Category: <strong className="text-emerald-300">{variationType}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {dimensionPresets.map((pt) => {
                const isActive = variationType === pt.value;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => handleApplyPresetGroup(pt)}
                    className={`px-3 py-2 text-xs rounded-xl border text-center transition-all cursor-pointer font-semibold flex flex-col items-center justify-center gap-1 ${
                      isActive ? pt.activeClass : pt.inactiveClass
                    }`}
                  >
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick-add chips & custom tagger bar with enhanced colors */}
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5 shadow-inner">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Quick add preset:</span>
              {currentPresetObj.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleAddVariation(item)}
                  className="px-2.5 py-1 text-xs bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>{item}</span>
                </button>
              ))}
            </div>

            {/* Comma-separated tag input */}
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/80">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMultipleCustomTags();
                  }
                }}
                placeholder="Type custom options separated by commas (e.g. 100g, 200g, 500g, 1kg)"
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={handleAddMultipleCustomTags}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tags</span>
              </button>
            </div>
          </div>

          {/* Quick Bulk Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkToolbar(!showBulkToolbar)}
                className="px-3 py-1.5 bg-gradient-to-r from-slate-900 to-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bulk Matrix Tools</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddVariation()}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Custom Row</span>
              </button>
            </div>

            {/* Metrics Chips */}
            {variations.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-xs">
                  Total Stock: <strong className="text-white">{totalVariantStock}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-xs">
                  Price Spread: <strong className="text-emerald-300">{formatNaira(minPrice)}</strong> - <strong className="text-emerald-300">{formatNaira(maxPrice)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Bulk Tools Drawer */}
          {showBulkToolbar && (
            <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/40 rounded-xl space-y-2 text-xs animate-in slide-in-from-top-2 duration-150 shadow-md">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bulk Adjust Matrix Values</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyBasePricesToAll}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                >
                  Sync Base Prices ({formatNaira(baseRetailPrice)}) to All
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateAllSkus}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                >
                  Regenerate All SKUs
                </button>
                <button
                  type="button"
                  onClick={() => handleSetUniformStock(25)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                >
                  Set All Stock = 25
                </button>
                <button
                  type="button"
                  onClick={() => handleSetUniformStock(50)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                >
                  Set All Stock = 50
                </button>
              </div>
            </div>
          )}

          {/* Modern Interactive Variations Matrix Table */}
          <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950/90 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase font-mono tracking-wider border-b border-slate-700/80">
                  <tr>
                    <th className="py-2.5 px-3">Variation Option</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-emerald-400 font-bold">Retail Price</th>
                    <th className="py-2.5 px-3 text-cyan-400 font-bold">Wholesale Price</th>
                    <th className="py-2.5 px-3 text-amber-300 font-bold">Cost Price</th>
                    <th className="py-2.5 px-3">Margin %</th>
                    <th className="py-2.5 px-3">Stock Qty</th>
                    <th className="py-2.5 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {variations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <Package className="w-6 h-6 text-slate-600" />
                          <span>No variations currently configured.</span>
                          <span className="text-[11px] text-slate-500">
                            Click a preset category button or use "+ Custom Row" to start adding options.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    variations.map((v) => {
                      const marginPercent =
                        v.retailPrice > 0
                          ? Math.round(((v.retailPrice - (v.costPrice || 0)) / v.retailPrice) * 100)
                          : 0;

                      return (
                        <tr key={v.id} className="hover:bg-slate-850/60 transition-colors group">
                          {/* Variant Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) =>
                                handleUpdateVariation(v.id, { name: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              placeholder="e.g. 500g Bag"
                            />
                          </td>

                          {/* SKU */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.sku || ''}
                              onChange={(e) =>
                                handleUpdateVariation(v.id, { sku: e.target.value })
                              }
                              className="w-28 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              placeholder="SKU-01"
                            />
                          </td>

                          {/* Retail Price */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-emerald-400/80 font-mono text-xs font-bold">
                                ₦
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={v.retailPrice}
                                onChange={(e) =>
                                  handleUpdateVariation(v.id, {
                                    retailPrice: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-28 pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg font-mono text-xs text-emerald-300 font-extrabold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          </td>

                          {/* Wholesale Price */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-cyan-400/80 font-mono text-xs font-bold">
                                ₦
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={v.wholesalePrice ?? 0}
                                onChange={(e) =>
                                  handleUpdateVariation(v.id, {
                                    wholesalePrice: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-28 pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg font-mono text-xs text-cyan-300 font-extrabold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                              />
                            </div>
                          </td>

                          {/* Cost Price */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-amber-400/80 font-mono text-xs font-bold">
                                ₦
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={v.costPrice ?? 0}
                                onChange={(e) =>
                                  handleUpdateVariation(v.id, {
                                    costPrice: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-24 pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg font-mono text-xs text-amber-200/90 font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          </td>

                          {/* Margin Badge with dynamic chromatic hierarchy */}
                          <td className="py-2 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-xs ${
                                marginPercent >= 35
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : marginPercent >= 20
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : marginPercent > 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {marginPercent}%
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              value={v.stock ?? 0}
                              onChange={(e) =>
                                handleUpdateVariation(v.id, {
                                  stock: parseInt(e.target.value, 10) || 0,
                                  inStock: (parseInt(e.target.value, 10) || 0) > 0
                                })
                              }
                              className={`w-20 bg-slate-900 border rounded-lg px-2 py-1.5 font-mono text-xs font-bold focus:outline-none focus:ring-1 ${
                                (v.stock ?? 0) > 0
                                  ? 'text-emerald-300 border-slate-700/80 focus:border-emerald-400 focus:ring-emerald-400'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/40 focus:border-rose-400 focus:ring-rose-400'
                              }`}
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicateVariation(v)}
                                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/15 rounded-lg transition-colors cursor-pointer"
                                title="Duplicate variant"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveVariation(v.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                                title="Remove variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
