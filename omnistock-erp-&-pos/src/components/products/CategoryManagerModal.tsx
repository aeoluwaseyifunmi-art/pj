import React, { useState, useMemo } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import {
  Tag,
  Plus,
  Trash2,
  X,
  Check,
  Layers,
  AlertCircle,
  AlertTriangle,
  FolderTree,
  Package,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  Info
} from 'lucide-react';

interface CategoryManagerModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onSelectCategory?: (category: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  dbState,
  onClose,
  onSelectCategory
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'default' | 'custom'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Single category deletion state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('General Merchandise');
  const [deleteAssociatedProducts, setDeleteAssociatedProducts] = useState<boolean>(false);

  // Batch delete all defaults modal state
  const [showBatchDeleteDefaults, setShowBatchDeleteDefaults] = useState(false);
  const [batchDeleteProducts, setBatchDeleteProducts] = useState(false);
  const [batchReassignTarget, setBatchReassignTarget] = useState('General Merchandise');

  // Inline rename state
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // Get active categories list from store
  const allCategories = useMemo(() => {
    return dbStore.getCategories();
  }, [dbState.products, dbState.customCategories, dbState.hiddenCategories]);

  // Count products per category
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (dbState.products || []).forEach((p) => {
      const cat = p.category || 'General Merchandise';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [dbState.products]);

  const customCats = useMemo(() => {
    return new Set((dbState.customCategories || []).map((c) => c.toLowerCase()));
  }, [dbState.customCategories]);

  const hiddenCats = dbState.hiddenCategories || [];

  // Group default vs custom
  const defaultCategories = useMemo(() => {
    return allCategories.filter((c) => !customCats.has(c.toLowerCase()));
  }, [allCategories, customCats]);

  const userCustomCategories = useMemo(() => {
    return allCategories.filter((c) => customCats.has(c.toLowerCase()));
  }, [allCategories, customCats]);

  // Filtered categories by search & tab
  const displayedCategories = useMemo(() => {
    let list = allCategories;
    if (filterTab === 'default') {
      list = defaultCategories;
    } else if (filterTab === 'custom') {
      list = userCustomCategories;
    }

    const q = searchTerm.toLowerCase().trim();
    if (q) {
      list = list.filter((c) => c.toLowerCase().includes(q));
    }
    return list;
  }, [allCategories, defaultCategories, userCustomCategories, filterTab, searchTerm]);

  // Handle Add Category
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a category name');
      return;
    }
    if (allCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Category "${trimmed}" already exists.`);
      return;
    }

    const added = dbStore.addCategory(trimmed);
    if (added) {
      setNewCategoryName('');
      setErrorMessage(null);
      setSuccessMessage(`Added "${trimmed}" to your store categories.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSelectCategory) {
        onSelectCategory(trimmed);
      }
    }
  };

  // Start single category deletion
  const handleInitiateDelete = (catName: string) => {
    setCategoryToDelete(catName);
    const alternative =
      allCategories.find((c) => c.toLowerCase() !== catName.toLowerCase()) ||
      'General Merchandise';
    setReassignTarget(alternative);
    setDeleteAssociatedProducts(false);
  };

  // Confirm single category deletion
  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    const count = productCounts[categoryToDelete] || 0;

    dbStore.removeCategory(
      categoryToDelete,
      reassignTarget,
      deleteAssociatedProducts
    );

    setSuccessMessage(
      `Removed category "${categoryToDelete}" (${
        deleteAssociatedProducts
          ? `deleted ${count} product(s)`
          : `reassigned ${count} product(s) to "${reassignTarget}"`
      }).`
    );
    setCategoryToDelete(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Confirm batch deletion of all default categories
  const handleConfirmBatchDeleteDefaults = () => {
    const { affectedProducts, removedCategories } = dbStore.removeAllDefaultCategories(
      batchReassignTarget,
      batchDeleteProducts
    );

    setSuccessMessage(
      `Successfully removed ${removedCategories.length} default categories (${
        batchDeleteProducts
          ? `deleted ${affectedProducts} demo product(s)`
          : `reassigned products to "${batchReassignTarget}"`
      }).`
    );
    setShowBatchDeleteDefaults(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Restore default categories
  const handleRestoreDefaults = () => {
    dbStore.restoreDefaultCategories();
    setSuccessMessage('Default system categories have been restored to your catalog.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Rename category
  const handleSaveRename = () => {
    if (!renamingCategory) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renamingCategory) {
      setRenamingCategory(null);
      return;
    }

    dbStore.renameCategory(renamingCategory, trimmed);
    setSuccessMessage(`Renamed "${renamingCategory}" to "${trimmed}".`);
    setRenamingCategory(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Quick preset suggestions
  const suggestions = [
    'Apparel & Fashion',
    'Electronics & Tech',
    'Beauty & Cosmetics',
    'Food & Provisions',
    'Home & Living',
    'Health & Wellness',
    'Shoes & Footwear',
    'Beverages & Drinks'
  ].filter((s) => !allCategories.some((c) => c.toLowerCase() === s.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-gradient-to-b from-slate-900 via-[#0e1628] to-[#0a101d] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] space-y-4 my-auto relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3.5 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-md">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Manage Product Categories</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {allCategories.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Organize your product catalog, add custom categories, or delete default system categories.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150 shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* "Option to Delete Default Categories" Action Banner */}
        <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-200 block">
                Default System Categories ({defaultCategories.length})
              </span>
              <p className="text-[11px] text-slate-400">
                {defaultCategories.length > 0
                  ? "Don't want to use default categories? Click to delete them all or delete individual categories below."
                  : 'All default system categories have been removed. You are using a 100% custom catalog!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {defaultCategories.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const firstCustom = userCustomCategories[0] || 'General Merchandise';
                  setBatchReassignTarget(firstCustom);
                  setBatchDeleteProducts(false);
                  setShowBatchDeleteDefaults(true);
                }}
                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Default Categories</span>
              </button>
            ) : hiddenCats.length > 0 ? (
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2.5 shadow-inner">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>Create Custom Category</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Designer Apparel, Footwear, Smartphone Accessories..."
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setErrorMessage(null);
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-105 active:scale-95 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Category</span>
            </button>
          </div>

          {/* Preset Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-500 font-mono">QUICK ADD:</span>
              {suggestions.slice(0, 4).map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => {
                    dbStore.addCategory(sugg);
                    setSuccessMessage(`Added "${sugg}" to categories.`);
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }}
                  className="text-[10px] px-2 py-0.5 bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-300 hover:text-emerald-300 rounded transition-colors cursor-pointer"
                >
                  + {sugg}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Categories List Controls & Tabs */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({allCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('default')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterTab === 'default'
                    ? 'bg-slate-800 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Default ({defaultCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('custom')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterTab === 'custom'
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom ({userCustomCategories.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
            {displayedCategories.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                {searchTerm
                  ? `No categories match "${searchTerm}".`
                  : filterTab === 'default'
                  ? 'No default categories active. All default categories have been removed.'
                  : 'No custom categories created yet. Use the form above to add your first one.'}
              </div>
            ) : (
              displayedCategories.map((cat) => {
                const count = productCounts[cat] || 0;
                const isCustom = customCats.has(cat.toLowerCase());
                const isRenaming = renamingCategory === cat;

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between py-2 px-3 bg-slate-950/70 rounded-lg hover:bg-slate-850/60 border border-slate-800/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                        <Tag className="w-3.5 h-3.5 text-teal-400" />
                      </div>

                      {isRenaming ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename();
                              if (e.key === 'Escape') setRenamingCategory(null);
                            }}
                            autoFocus
                            className="bg-slate-900 border border-emerald-400 rounded px-2 py-1 text-xs text-white flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleSaveRename}
                            className="px-2.5 py-1 bg-emerald-400 text-slate-950 rounded text-[11px] font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingCategory(null)}
                            className="px-2 py-1 text-slate-400 hover:text-white text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">
                              {cat}
                            </span>
                            {isCustom ? (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Custom
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                Default Category
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Package className="w-2.5 h-2.5 text-slate-500" />
                            <span>{count} product{count !== 1 ? 's' : ''} assigned</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Rename & Delete (Always Available on ALL categories!) */}
                    {!isRenaming && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCategory(cat);
                            setRenameValue(cat);
                          }}
                          title="Rename Category"
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiateDelete(cat)}
                          title={`Delete Category "${cat}"`}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Click the trash icon to remove any category.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Single Category Deletion */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-5 text-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Remove Category &quot;{categoryToDelete}&quot;?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Currently assigned to {productCounts[categoryToDelete] || 0} product(s).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <p className="text-slate-300 font-medium">Choose what to do with assigned products:</p>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="productAction"
                  checked={!deleteAssociatedProducts}
                  onChange={() => setDeleteAssociatedProducts(false)}
                  className="mt-0.5 text-emerald-500 focus:ring-0"
                />
                <div className="flex-1">
                  <span className="text-white font-medium block">
                    Reassign products to another category
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Target category:</span>
                    <select
                      value={reassignTarget}
                      onChange={(e) => setReassignTarget(e.target.value)}
                      disabled={deleteAssociatedProducts}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white flex-1"
                    >
                      {allCategories
                        .filter((c) => c.toLowerCase() !== categoryToDelete.toLowerCase())
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      <option value="General Merchandise">General Merchandise</option>
                    </select>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="radio"
                  name="productAction"
                  checked={deleteAssociatedProducts}
                  onChange={() => setDeleteAssociatedProducts(true)}
                  className="mt-0.5 text-rose-500 focus:ring-0"
                />
                <div>
                  <span className="text-rose-300 font-bold block">
                    Permanently delete all {productCounts[categoryToDelete] || 0} products in this category
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Purges these items from your catalog and inventory records so they no longer appear anywhere.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-lg transition-all cursor-pointer shadow-md"
              >
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Deletion of ALL Default Categories */}
      {showBatchDeleteDefaults && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-800/80 rounded-2xl max-w-md w-full p-5 text-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Delete All {defaultCategories.length} Default Categories?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will remove all demo system categories from your catalog.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <p className="text-slate-300 font-medium">What would you like to do with the sample demo products?</p>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="batchAction"
                  checked={!batchDeleteProducts}
                  onChange={() => setBatchDeleteProducts(false)}
                  className="mt-0.5 text-emerald-500 focus:ring-0"
                />
                <div className="flex-1">
                  <span className="text-white font-medium block">
                    Keep products, but reassign them to:
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <select
                      value={batchReassignTarget}
                      onChange={(e) => setBatchReassignTarget(e.target.value)}
                      disabled={batchDeleteProducts}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white flex-1"
                    >
                      {userCustomCategories.length > 0 ? (
                        userCustomCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      ) : (
                        <option value="General Merchandise">General Merchandise</option>
                      )}
                    </select>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="radio"
                  name="batchAction"
                  checked={batchDeleteProducts}
                  onChange={() => setBatchDeleteProducts(true)}
                  className="mt-0.5 text-rose-500 focus:ring-0"
                />
                <div>
                  <span className="text-rose-300 font-bold block">
                    Delete all sample demo products in default categories
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Purges demo products completely so your store only contains your own custom inventory.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBatchDeleteDefaults(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDeleteDefaults}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-lg transition-all cursor-pointer shadow-md"
              >
                Confirm & Remove All Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
