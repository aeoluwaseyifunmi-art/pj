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
  Sparkles,
  MoreHorizontal,
  Terminal,
  Activity,
  Shield,
  Check,
  User,
  AlertCircle,
  Lock,
  LogOut
} from 'lucide-react';
import { Location, LinkedBankAccount, AppRole, ROLE_DEFINITIONS } from '../../types/database';
import { dbStore } from '../../db/databaseStore';

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
  currentRole?: AppRole;
  authenticatedUserEmail?: string | null;
  activeBusinessName?: string;
  hasMultipleWorkspaces?: boolean;
  onOpenWorkspaceSelector?: () => void;
  onSignOut?: () => void;
  onOpenLoginModal?: () => void;
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
  onOpenBarcodePrint,
  currentRole,
  authenticatedUserEmail,
  activeBusinessName,
  hasMultipleWorkspaces = false,
  onOpenWorkspaceSelector,
  onSignOut,
  onOpenLoginModal
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const activeRole: AppRole = currentRole || dbStore.getCurrentUserRole();
  const activeRoleDef = ROLE_DEFINITIONS[activeRole] || ROLE_DEFINITIONS.owner;

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

  // Primary navigation tabs (Filtered strictly by active role's allowedTabs)
  const allPrimaryTabs = [
    { id: 'products', label: 'Catalog Index', icon: Package },
    { id: 'pos', label: 'POS Terminal', icon: ShoppingCart },
    { id: 'inventory', label: 'Stock Ledger', icon: Layers },
    { id: 'bank', label: 'Fiscal Console', icon: Landmark },
    { id: 'branch_managers', label: 'Branch Nodes', icon: ShieldCheck },
    { id: 'wholesale', label: 'Wholesale B2B', icon: Building2 },
    { id: 'reporting', label: 'Data Analytics', icon: BarChart3 }
  ];

  const primaryTabs = allPrimaryTabs.filter((tab) => activeRoleDef.allowedTabs.includes(tab.id));

  // Secondary items in the "More" dropdown (Filtered by active role)
  const allSecondaryItems = [
    { id: 'inputers', label: 'Staff Cashiers', icon: Users, desc: 'Cashier accounts & till oversight' },
    { id: 'workspace', label: 'Workspace Hub', icon: Sparkles, desc: 'Operational dashboard & sync' },
    { id: 'database', label: 'SQL Studio', icon: Database, desc: 'Database tables & live inspection' }
  ];

  const secondaryItems = allSecondaryItems.filter((item) => activeRoleDef.allowedTabs.includes(item.id));
  const isSecondaryActive = secondaryItems.some((item) => item.id === currentTab);

  const canManageProducts = activeRoleDef.permissions.manageProducts;
  const canResetData = activeRoleDef.permissions.resetDatabase;
  const isReadOnly = activeRoleDef.permissions.readOnly;
  const canProcessSales = activeRoleDef.permissions.processSales;

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-[#222222] text-white">
      {/* Dark Command Center Top Telemetry Header Bar */}
      <div className="h-10 bg-[#141414] border-b border-[#222222] px-4 sm:px-6 flex items-center justify-between font-mono text-[11px] text-white/50 tracking-wider overflow-x-auto select-none">
        <div className="flex items-center gap-4 shrink-0">
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse"></span>
            <span>MNTP_ID: <strong className="text-white font-mono">MONIEPOINT_SQR_POS</strong></span>
          </span>
          <span className="hidden md:inline-block text-[#222222]">|</span>
          <span className="hidden md:inline-block text-white/60">
            STATUS: <span className="text-[#00ff00] font-bold font-mono">// ONLINE</span>
          </span>
          {isReadOnly && (
            <>
              <span className="hidden sm:inline-block text-[#222222]">|</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                <AlertCircle className="w-3 h-3" />
                <span>READ-ONLY VIEW</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 text-[10px]">
          {/* Multi-Business Workspace Selector Button (If user belongs to multiple businesses) */}
          {hasMultipleWorkspaces && onOpenWorkspaceSelector && (
            <button
              onClick={onOpenWorkspaceSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] border border-amber-500/30 hover:border-amber-400 text-amber-300 font-mono transition-colors cursor-pointer"
              title="Switch between your authorized business workspaces"
            >
              <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden sm:inline text-white/50">WORKSPACE:</span>
              <span className="font-bold text-white uppercase tracking-wider max-w-[120px] truncate">
                {activeBusinessName || 'OmniRetail'}
              </span>
              <ChevronDown className="w-3 h-3 text-white/50" />
            </button>
          )}

          {/* Read-Only Verified Role Badge (No dropdown, strictly non-editable) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] border border-[#2e2e2e] text-white font-mono select-none"
            title={`Authorized Role: ${activeRoleDef.name} (${activeRoleDef.badge}) — ${activeRoleDef.intendedAccess}`}
          >
            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-white/40 text-[10px]">ROLE:</span>
            <span className="font-bold text-white uppercase tracking-wider">{activeRoleDef.name}</span>
            <span className="font-mono text-[9px] px-1 rounded bg-[#242424] text-white/60 border border-[#333333]">
              {activeRoleDef.badge}
            </span>
          </div>

          {/* User Account Identity & Sign Out */}
          {authenticatedUserEmail ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="hidden lg:inline-block text-white/40 font-mono text-[10px] max-w-[140px] truncate">
                {authenticatedUserEmail}
              </span>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign out of OmniStock"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#181818] hover:bg-rose-950/40 border border-[#2e2e2e] hover:border-rose-500/40 text-white/60 hover:text-rose-300 font-mono text-[10px] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-neutral-200 text-black font-mono font-bold text-[10px] uppercase transition-colors cursor-pointer"
              >
                <User className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )
          )}

          <span className="hidden lg:inline-block text-white/40">
            HASH: <strong className="text-white/60 font-mono">CDC_99201</strong>
          </span>
          <span className="hidden sm:inline-block text-[#222222]">|</span>
          <span className="flex items-center gap-1 text-white/70">
            <span>LOC:</span>
            <span className="text-white font-bold font-mono uppercase">
              {activeLocation?.code || 'CDC_01'}
            </span>
          </span>
          <span className="hidden sm:inline-block text-[#222222]">|</span>
          <span className="text-white/40 font-mono">
            SYS: <strong className="text-white/60">v4.3</strong>
          </span>
        </div>
      </div>

      {/* Main Command Center Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Variation 27 Brand Section */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => onSelectTab('products')}
            className="flex items-center text-left group cursor-pointer focus:outline-none"
          >
            <div className="border-l-3 border-white pl-3.5 py-0.5">
              <div className="font-display text-2xl uppercase tracking-wider font-bold text-white leading-none group-hover:text-neutral-300 transition-colors">
                OmniStock
              </div>
              <div className="font-mono text-[9px] text-white/40 tracking-widest mt-1">
                TERMINAL.ACCESS_v4.3
              </div>
            </div>
          </button>

          {/* Minimal Location Chip */}
          {onOpenLocationManager && (
            <button
              onClick={onOpenLocationManager}
              title="Switch branch location"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] border border-[#262626] font-mono text-[11px] text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-white/50" />
              <span className="max-w-[130px] truncate">{activeLocation?.name || 'Main Branch'}</span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>
          )}
        </div>

        {/* Center: Command Center Nav Links with '→' prefix */}
        <nav className="hidden lg:flex items-center gap-1">
          {primaryTabs.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center px-3 py-2 text-xs font-mono tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white font-bold border-b-2 border-white'
                    : 'text-white/40 hover:text-white hover:border-b-2 hover:border-white/30'
                }`}
              >
                <span className="opacity-30 mr-1.5 text-[11px]">→</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1 px-2.5 py-2 text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
                isSecondaryActive
                  ? 'text-white font-bold border-b-2 border-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <span className="opacity-30 mr-1 text-[11px]">→</span>
              <span>More</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded bg-[#111111] border border-[#262626] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/40 border-b border-[#222222]">
                  System Control // Utilities
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
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-mono transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#1a1a1a] text-white font-bold'
                          : 'text-white/70 hover:bg-[#181818] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-white/50" />
                      <div>
                        <div className="font-semibold">{sec.label}</div>
                        <div className="text-[10px] text-white/40 font-normal">{sec.desc}</div>
                      </div>
                    </button>
                  );
                })}

                <div className="border-t border-[#222222] my-1" />

                {canManageProducts && onOpenCategoryManager && (
                  <button
                    onClick={() => {
                      onOpenCategoryManager();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-mono text-white/70 hover:bg-[#181818] hover:text-white transition-colors cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-white/50" />
                    <span>Manage Categories</span>
                  </button>
                )}

                {onOpenBarcodePrint && (
                  <button
                    onClick={() => {
                      onOpenBarcodePrint();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-mono text-white/70 hover:bg-[#181818] hover:text-white transition-colors cursor-pointer"
                  >
                    <Barcode className="w-4 h-4 text-white/50" />
                    <span>Print Barcodes</span>
                  </button>
                )}

                {onOpenAuditLogs && (
                  <button
                    onClick={() => {
                      onOpenAuditLogs();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-mono text-white/70 hover:bg-[#181818] hover:text-white transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-white/50" />
                    <span>Audit Logs & Backups</span>
                  </button>
                )}

                {canResetData && (
                  <>
                    <div className="border-t border-[#222222] my-1" />
                    <button
                      onClick={() => {
                        onResetData();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-mono text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-rose-400" />
                      <span>Reset Demo Data (Owner)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Right: Variation 27 Command Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Terminal Mode */}
          <button
            onClick={onOpenTerminal}
            title="Launch Authorized Staff Terminal"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xs border border-[#262626] hover:border-white font-mono text-xs text-white/70 hover:text-white uppercase transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-white/50" />
            <span className="tracking-wider">Staff Terminal</span>
          </button>

          {/* Quick POS Button (Only if allowed for active role) */}
          {activeRoleDef.allowedTabs.includes('pos') && (
            <button
              onClick={onOpenQuickSale}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xs border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'pos'
                  ? 'border-white text-white font-bold bg-[#1a1a1a]'
                  : 'border-[#333333] hover:border-white text-white/80 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>
          )}

          {/* Primary Action Button: Variation 27 style "+ Register Asset" (Owner, Admin, Inventory) */}
          {canManageProducts && onOpenAddProduct ? (
            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Register Asset</span>
            </button>
          ) : isReadOnly ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#161616] border border-[#2e2e2e] text-white/50 font-mono text-xs uppercase tracking-wider rounded-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Read-Only Mode</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
