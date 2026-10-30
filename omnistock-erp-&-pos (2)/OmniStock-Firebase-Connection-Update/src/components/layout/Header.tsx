import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  Layers,
  Landmark,
  BarChart3,
  Building2,
  Plus,
  MapPin,
  ChevronDown,
  Tag,
  ShieldCheck,
  Barcode,
  Users,
  Database,
  RefreshCw,
  Printer,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { Location, LinkedBankAccount } from '../../types/database';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickSale: () => void;
  onOpenAddProduct?: () => void;
  onResetData: () => void;
  onOpenTerminal: () => void;
  activeLocation?: Location;
  defaultBank?: LinkedBankAccount;
  onOpenLocationManager?: () => void;
  onOpenCategoryManager?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenBarcodePrint?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickSale,
  onOpenAddProduct,
  onResetData,
  onOpenTerminal,
  activeLocation,
  defaultBank,
  onOpenLocationManager,
  onOpenCategoryManager,
  onOpenAuditLogs,
  onOpenBarcodePrint
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation tabs
  const primaryTabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'pos', label: 'POS Terminal', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Layers },
    { id: 'bank', label: 'Banking & NIP', icon: Landmark },
    { id: 'branch_managers', label: 'Branch Managers', icon: ShieldCheck },
    { id: 'wholesale', label: 'Wholesale B2B', icon: Building2 },
    { id: 'reporting', label: 'Analytics', icon: BarChart3 }
  ];

  // Secondary items in the "More" dropdown
  const secondaryItems = [
    { id: 'branch_managers', label: 'Branch Managers', icon: ShieldCheck, desc: 'Sales supervision & manager activity' },
    { id: 'inputers', label: 'Staff Cashiers', icon: Users, desc: 'Cashier accounts & permissions' },
    { id: 'workspace', label: 'Workspace Hub', icon: Sparkles, desc: 'Operational dashboard & sync' },
    { id: 'database', label: 'SQL Studio', icon: Database, desc: 'Database tables & live inspection' }
  ];

  const isSecondaryActive = secondaryItems.some((item) => item.id === currentTab);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Wordmark & Location Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('products')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors group-hover:bg-emerald-500/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-semibold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                OmniStock
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-2 font-normal">
                NG Retail & POS
              </span>
            </div>
          </button>

          {/* Minimal Location Selector */}
          {onOpenLocationManager && (
            <button
              onClick={onOpenLocationManager}
              title="Switch active store or warehouse location"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span className="max-w-[120px] truncate font-medium">
                {activeLocation?.name || 'Main Branch'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* Center: Clean Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {primaryTabs.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isSecondaryActive
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span>More</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700/80 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Operations & Utilities
                </div>
                {secondaryItems.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = currentTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        onSelectTab(sec.id);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 text-emerald-400 font-medium'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium">{sec.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{sec.desc}</div>
                      </div>
                    </button>
                  );
                })}

                <div className="border-t border-slate-800 my-1" />

                {onOpenCategoryManager && (
                  <button
                    onClick={() => {
                      onOpenCategoryManager();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Manage Categories</span>
                  </button>
                )}

                {onOpenBarcodePrint && (
                  <button
                    onClick={() => {
                      onOpenBarcodePrint();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Barcode className="w-4 h-4 text-emerald-400" />
                    <span>Print Barcode Labels</span>
                  </button>
                )}

                {onOpenAuditLogs && (
                  <button
                    onClick={() => {
                      onOpenAuditLogs();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Audit Logs & Backups</span>
                  </button>
                )}

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => {
                    onResetData();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right: Quick Bank Badge & Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nigerian Bank Settlement Quick Status */}
          <button
            onClick={() => onSelectTab('bank')}
            title="View linked Nigerian bank account & verified transfers"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-white">
              {defaultBank?.bankName || 'Moniepoint'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">₦ NGN</span>
          </button>

          {/* Web Terminal Mode Button */}
          <button
            onClick={onOpenTerminal}
            title="Launch Dedicated Cashier Web Terminal"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Terminal</span>
          </button>

          {/* Quick Add Product */}
          {onOpenAddProduct && (
            <button
              onClick={onOpenAddProduct}
              title="Add a new product to sell"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Product</span>
            </button>
          )}

          {/* Primary Quick Sale Button */}
          <button
            onClick={onOpenQuickSale}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale</span>
          </button>

          <ThemeToggle variant="header" showLabel={false} />
        </div>
      </div>

      {/* Mobile Horizontal Subnav for Small Viewports */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 bg-slate-950/90 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
        {primaryTabs.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        {secondaryItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
