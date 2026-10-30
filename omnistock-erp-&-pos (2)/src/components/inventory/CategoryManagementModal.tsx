import React, { useState, useMemo } from 'react';
import { DatabaseState, dbStore } from '../../db/databaseStore';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle2,
  FolderTree,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface CategoryManagementModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onCategorySelected?: (category: string) => void;
}

// Known default initial catalog categories
const DEFAULT_SYSTEM_CATEGORIES = new Set([
  'Grains & Flours',
  'Cooking Oils',
  'Packaged Foods',
  'Beverages',
  'Condiments & Seasonings',
  'Dairy & Breakfast',
  'Household Essentials',
  'Provisions',
  'Commodities'
]);

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  dbState,
  onClose,
  onCategorySelected
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Deletion prompt state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('General Merchandise');
  const [deleteAssociatedProducts, setDeleteAssociatedProducts] = useState<boolean>(false);

  // Rename state
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // Get active categories list
  const activeCategories = useMemo(() => {
    return dbStore.getCategories();
  }, [dbState.products, dbState.customCategories, dbState.hiddenCategories]);

  // Count products per category
  const productCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (dbState.products || []).forEach((p) => {
      const cat = p.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return map;
  }, [dbState.products]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return activeCategories;
    return activeCategories.filter((c) => c.toLowerCase().includes(q));
  }, [activeCategories, searchTerm]);

  // Handle Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (activeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setFeedbackMsg({ text: `Category "${trimmed}" already exists.`, type: 'error' });
      return;
    }

    dbStore.addCategory(trimmed);
    setNewCategoryName('');
    setFeedbackMsg({ text: `Category "${trimmed}" added successfully!`, type: 'success' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Start Category Deletion
  const handleInitiateDelete = (cat: string) => {
    setCategoryToDelete(cat);
    // Find a fallback category that is NOT the one being deleted
    const alternative = activeCategories.find((c) => c !== cat) || 'General Merchandise';
    setReassignTarget(alternative);
    setDeleteAssociatedProducts(false);
  };

  // Confirm Category Deletion
  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    const count = productCountMap.get(categoryToDelete) || 0;

    dbStore.removeCategory(
      categoryToDelete,
      reassignTarget,
      deleteAssociatedProducts
    );

    setFeedbackMsg({
      text: `Removed category "${categoryToDelete}" (${
        deleteAssociatedProducts
          ? `deleted ${count} associated products`
          : `reassigned ${count} products to ${reassignTarget}`
      }).`,
      type: 'success'
    });
    setCategoryToDelete(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Start Rename
  const handleStartRename = (cat: string) => {
    setRenamingCategory(cat);
    setRenameValue(cat);
  };

  // Save Rename
  const handleSaveRename = () => {
    if (!renamingCategory) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renamingCategory) {
      setRenamingCategory(null);
      return;
    }

    dbStore.renameCategory(renamingCategory, trimmed);
    setFeedbackMsg({
      text: `Renamed "${renamingCategory}" to "${trimmed}".`,
      type: 'success'
    });
    setRenamingCategory(null);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Manage Product Categories</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {activeCategories.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add, rename, or remove default and custom product categories to customize your store catalog.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`my-3 p-3 rounded-lg text-xs flex items-center gap-2 shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Add New Category & Search Controls */}
        <div className="py-4 space-y-3 shrink-0 border-b border-slate-800">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Enter new category name (e.g., Electronics, Footwear, Perfumery)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <input
              type="text"
              placeholder="Filter categories list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500">
              Click the trash icon to delete any default or custom category.
            </span>
          </div>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No categories found matching &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const count = productCountMap.get(cat) || 0;
              const isDefault = DEFAULT_SYSTEM_CATEGORIES.has(cat);
              const isRenaming = renamingCategory === cat;

              return (
                <div
                  key={cat}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/70 text-slate-300 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4 text-emerald-400" />
                    </div>

                    {isRenaming ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                          autoFocus
                          className="bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-xs text-white flex-1"
                        />
                        <button
                          onClick={handleSaveRename}
                          className="px-2.5 py-1 bg-emerald-500 text-slate-950 rounded text-[11px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingCategory(null)}
                          className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-xs truncate">{cat}</span>
                          {isDefault ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                              Default Category
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span>{count} {count === 1 ? 'product' : 'products'} assigned</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isRenaming && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartRename(cat)}
                        title="Rename Category"
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateDelete(cat)}
                        title="Delete / Remove Category"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
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

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Removing a default category will hide it from category filters and POS buttons.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Remove Category &quot;{categoryToDelete}&quot;?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  There are currently {productCountMap.get(categoryToDelete) || 0} products in this category.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
              <p className="text-slate-300 font-medium">Choose what to do with existing products:</p>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="productAction"
                  checked={!deleteAssociatedProducts}
                  onChange={() => setDeleteAssociatedProducts(false)}
                  className="mt-0.5 text-emerald-500 focus:ring-0"
                />
                <div>
                  <span className="text-white font-medium block">
                    Reassign products to another category
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Target category:</span>
                    <select
                      value={reassignTarget}
                      onChange={(e) => setReassignTarget(e.target.value)}
                      disabled={deleteAssociatedProducts}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      {activeCategories
                        .filter((c) => c !== categoryToDelete)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      <option value="General Merchandise">General Merchandise</option>
                      <option value="Uncategorized">Uncategorized</option>
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
                  <span className="text-rose-300 font-medium block">
                    Permanently delete all {productCountMap.get(categoryToDelete) || 0} products in this category
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Also purges their associated inventory levels and stock records.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Yes, Remove Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
