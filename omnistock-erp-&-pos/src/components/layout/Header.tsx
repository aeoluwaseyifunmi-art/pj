import React from 'react';
import { Database, Plus, RefreshCw, Barcode } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickSale: () => void;
  onOpenScanner: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickSale,
  onOpenScanner,
  onResetData
}) => {
  const navItems = [
    { id: 'pos', label: 'POS Terminal' },
    { id: 'inventory', label: 'Live Inventory' },
    { id: 'wholesale', label: 'Wholesale B2B' },
    { id: 'reporting', label: 'POS Analytics' },
    { id: 'database', label: 'SQL Studio' }
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-200 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white shadow-sm">
          <Database className="w-4 h-4" />
        </div>
        <button
          onClick={() => onSelectTab('pos')}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-emerald-400 transition-colors text-left"
        >
          OmniStock ERP
        </button>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                isActive ? 'text-emerald-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action (with secondary quick utilities) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenScanner}
          title="Scan barcode with camera or keyboard simulator"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>Scan SKU</span>
        </button>

        <button
          onClick={onOpenQuickSale}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Transaction</span>
        </button>

        <button
          onClick={onResetData}
          title="Reset database to initial demo dataset"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
