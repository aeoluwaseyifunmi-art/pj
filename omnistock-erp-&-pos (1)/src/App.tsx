import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbStore, DatabaseState } from './db/databaseStore';
import { AppRole, ROLE_DEFINITIONS, ROLE_LANDINGS, getRoleLanding, getPosRedirectTab, normalizeAppRole } from './types/database';
import { Header } from './components/layout/Header';
import { PosTerminal } from './components/pos/PosTerminal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { WholesaleOrders } from './components/wholesale/WholesaleOrders';
import { PosReporting } from './components/reports/PosReporting';
import { DatabaseStudio } from './components/database/DatabaseStudio';
import { WorkspaceHub } from './components/workspace/WorkspaceHub';
import { InputerManagement } from './components/inputer/InputerManagement';
import { DedicatedInputerTerminal } from './components/inputer/DedicatedInputerTerminal';
import { ProductCatalog } from './components/products/ProductCatalog';
import { AddProductSellModal } from './components/products/AddProductSellModal';
import { LocationManagerModal } from './components/location/LocationManagerModal';
import { CategoryManagerModal } from './components/products/CategoryManagerModal';
import { BankHub } from './components/bank/BankHub';
import { BranchManagerHub } from './components/branch/BranchManagerHub';
import { ThemeProvider } from './context/ThemeContext';
import { LoginGatewayModal } from './components/auth/LoginGatewayModal';
import { WorkspaceSelectorModal } from './components/auth/WorkspaceSelectorModal';
import { initAuth, logout } from './services/googleAuth';
import { Shield, Building2, Terminal, AlertCircle, Sparkles, Lock, ArrowRight, RefreshCw } from 'lucide-react';

function MainApp() {
  const [dbState, setDbState] = useState<DatabaseState>(() => dbStore.getState());

  // Authenticated user email state
  const [authEmail, setAuthEmail] = useState<string>(() => {
    return dbStore.getAuthenticatedUserEmail() || 'ae.oluwaseyifunmi@gmail.com';
  });

  const [currentRole, setCurrentRole] = useState<AppRole>(() => {
    // If URL has staffCode/staffId, check if it maps to a staff member
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('staffCode') || params.get('staffId');
      if (code) {
        const staff = dbStore.getInputerByStaffCode(code);
        if (staff) {
          const norm = normalizeAppRole(staff.role);
          if (norm !== 'cashier') {
            dbStore.setCurrentUserRole(norm);
            return norm;
          }
        }
      }
    }
    return dbStore.getCurrentUserRole();
  });

  // Navigation tab state - automatically guided by assigned role landing
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('staffCode') || params.get('staffId');
      if (code) {
        const staff = dbStore.getInputerByStaffCode(code);
        if (staff) {
          const norm = normalizeAppRole(staff.role);
          if (norm !== 'cashier') {
            return getRoleLanding(norm).defaultTab;
          }
        }
      }
    }
    const role = dbStore.getCurrentUserRole();
    return getRoleLanding(role).defaultTab;
  });

  // Modal dialog states
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [selectedProductToSell, setSelectedProductToSell] = useState<string | null>(null);

  // Dedicated Web Terminal Mode (?portal=inputer&staffCode=INP-01) - only for Cashiers
  const [isTerminalMode, setIsTerminalMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hasPortal = params.get('portal') === 'inputer' || Boolean(params.get('staffCode') || params.get('staffId'));
    const code = params.get('staffCode') || params.get('staffId');
    if (hasPortal && code) {
      const staff = dbStore.getInputerByStaffCode(code);
      if (staff) {
        const norm = normalizeAppRole(staff.role);
        if (norm !== 'cashier') {
          // Staff from the terminal link must go direct to their page, not terminal mode
          return false;
        }
      }
    }
    return hasPortal;
  });
  const [terminalStaffCode, setTerminalStaffCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('staffCode') || params.get('staffId') || 'INP-01';
  });

  // URL Sanitizer: Strictly prevent users from injecting or changing roles through the URL
  useEffect(() => {
    const url = new URL(window.location.href);
    let urlChanged = false;
    const forbiddenParams = ['role', 'appRole', 'roleOverride', 'userRole', 'adminRole'];
    forbiddenParams.forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        urlChanged = true;
      }
    });
    if (urlChanged) {
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Listen for Firebase Google Auth changes
  useEffect(() => {
    const unsubscribeAuth = initAuth(
      (user) => {
        if (user && user.email) {
          const email = user.email.toLowerCase();
          setAuthEmail(email);
          dbStore.setAuthenticatedUserEmail(email);
          const memberships = dbStore.getUserBusinessMemberships(email);
          if (memberships.length > 1) {
            setShowWorkspaceModal(true);
          } else if (memberships.length === 1) {
            const single = memberships[0];
            dbStore.setActiveBusinessId(single.business.id);
            dbStore.setCurrentUserRole(single.role);
            setCurrentRole(single.role);
            setCurrentTab(single.designatedLanding.defaultTab);
          }
        }
      },
      () => {
        // Auth session ended
      }
    );
    return () => unsubscribeAuth();
  }, []);

  // Subscribe to database store changes
  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setDbState({ ...dbStore.getState() });
      const role = dbStore.getCurrentUserRole();
      setCurrentRole(role);
    });
    return unsubscribe;
  }, []);

  // Enforce role security: If current tab is not allowed for the active role, auto-redirect to allowed default tab
  useEffect(() => {
    const allowed = ROLE_DEFINITIONS[currentRole]?.allowedTabs || ['products'];
    if (!allowed.includes(currentTab)) {
      const fallbackTab = getRoleLanding(currentRole).defaultTab;
      setCurrentTab(allowed.includes(fallbackTab) ? fallbackTab : allowed[0] || 'products');
    }
  }, [currentRole, currentTab]);

  // Retrieve memberships for the current authenticated email
  const userMemberships = useMemo(() => {
    if (!authEmail) return [];
    return dbStore.getUserBusinessMemberships(authEmail);
  }, [authEmail, dbState.businesses, dbState.businessMembers]);

  const activeBusiness = dbStore.getActiveBusiness();
  const activeLocationId = dbStore.getActiveLocationId();
  const activeLocation =
    dbState.locations.find((l) => l.id === activeLocationId) || dbState.locations[0];
  const defaultBank =
    dbState.linkedBankAccounts?.find((b) => b.isDefault) || dbState.linkedBankAccounts?.[0];

  const roleLanding = getRoleLanding(currentRole);
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.owner;

  // Handle successful login from LoginGatewayModal
  const handleLoginSuccess = (
    email: string,
    businessId: string,
    assignedRole: AppRole,
    defaultTab: string
  ) => {
    setAuthEmail(email);
    dbStore.setAuthenticatedUserEmail(email);
    dbStore.setActiveBusinessId(businessId);
    dbStore.setCurrentUserRole(assignedRole);
    setCurrentRole(assignedRole);
    setCurrentTab(defaultTab);
    setShowLoginModal(false);
    setShowWorkspaceModal(false);
  };

  // Handle Workspace Selection (for multi-business accounts)
  const handleSelectWorkspace = (businessId: string, assignedRole: AppRole, defaultTab: string) => {
    dbStore.setActiveBusinessId(businessId);
    dbStore.setCurrentUserRole(assignedRole);
    setCurrentRole(assignedRole);
    setCurrentTab(defaultTab);
    setShowWorkspaceModal(false);
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await logout();
    dbStore.setAuthenticatedUserEmail(null);
    setAuthEmail('');
    setShowLoginModal(true);
  };

  const handleResetData = () => {
    if (!roleDef.permissions.resetDatabase) {
      alert('Unauthorized: System reset is strictly restricted to Owner.');
      return;
    }
    if (window.confirm('Reset database to initial enterprise demo dataset? All custom test transactions will be re-initialized.')) {
      dbStore.resetToFactory();
    }
  };

  const handleOpenTerminal = (staffCode?: string) => {
    if (staffCode) {
      const staff = dbStore.getInputerByStaffCode(staffCode);
      if (staff) {
        const normRole = normalizeAppRole(staff.role);
        if (normRole !== 'cashier') {
          // Direct non-cashier staff to their role landing page immediately
          dbStore.setCurrentUserRole(normRole);
          setCurrentRole(normRole);
          const landing = getRoleLanding(normRole);
          setCurrentTab(landing.defaultTab);
          setIsTerminalMode(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('portal');
          url.searchParams.delete('staffCode');
          url.searchParams.delete('staffId');
          window.history.pushState({}, '', url.toString());
          return;
        }
      }
      setTerminalStaffCode(staffCode);
      setIsTerminalMode(true);
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'inputer');
      url.searchParams.set('staffCode', staffCode);
      window.history.pushState({}, '', url.toString());
    } else {
      // If no staffCode passed and active user is not cashier, redirect directly to their own role landing page
      if (currentRole !== 'cashier') {
        const landing = getRoleLanding(currentRole);
        setCurrentTab(landing.defaultTab);
        setIsTerminalMode(false);
        return;
      }
      setIsTerminalMode(true);
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'inputer');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleExitTerminal = (targetRole?: AppRole) => {
    setIsTerminalMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    url.searchParams.delete('staffCode');
    url.searchParams.delete('staffId');
    window.history.pushState({}, '', url.toString());

    const effectiveRole = targetRole ? normalizeAppRole(targetRole) : currentRole;
    if (targetRole) {
      dbStore.setCurrentUserRole(effectiveRole);
      setCurrentRole(effectiveRole);
    }
    const landing = getRoleLanding(effectiveRole);
    setCurrentTab(landing.defaultTab);
  };

  // Safe tab selection handler:
  // Fix the POS Terminal link so that when staff click it, they are redirected to their own role-specific landing page instead of the POS Terminal
  const handleSelectTab = (tabId: string) => {
    if (tabId === 'pos') {
      const targetTab = getPosRedirectTab(currentRole);
      setCurrentTab(targetTab);
      return;
    }
    if (roleDef.allowedTabs.includes(tabId)) {
      setCurrentTab(tabId);
    } else {
      console.warn(`Access denied to tab '${tabId}' for role '${currentRole}'`);
    }
  };

  // If in Dedicated Inputer Web Terminal mode:
  if (isTerminalMode) {
    return (
      <DedicatedInputerTerminal
        initialStaffCode={terminalStaffCode}
        onExitToAdmin={handleExitTerminal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar Navigation (Role selector dropdown permanently removed) */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickSale={() => {
          setCurrentTab(getPosRedirectTab(currentRole));
        }}
        onOpenAddProduct={
          roleDef.permissions.manageProducts ? () => setShowAddProductModal(true) : undefined
        }
        onResetData={handleResetData}
        onOpenTerminal={() => handleOpenTerminal()}
        activeLocation={activeLocation}
        defaultBank={defaultBank}
        onOpenLocationManager={
          roleDef.permissions.manageOperations ? () => setShowLocationModal(true) : undefined
        }
        onOpenCategoryManager={() => setShowCategoryModal(true)}
        currentRole={currentRole}
        authenticatedUserEmail={authEmail}
        activeBusinessName={activeBusiness?.name}
        hasMultipleWorkspaces={userMemberships.length > 1}
        onOpenWorkspaceSelector={() => setShowWorkspaceModal(true)}
        onSignOut={handleSignOut}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Authorized Terminal Indicator Sub-Bar */}
      <div className="bg-[#101010] border-b border-[#222222] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white/40 uppercase tracking-wider text-[11px]">AUTHORIZED TERMINAL:</span>
            <span className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-1.5">
              <span>{roleLanding.terminalName}</span>
            </span>
          </div>

          <span className="hidden sm:inline-block text-[#333333]">|</span>
          <span className="hidden sm:inline-block text-white/50 text-[11px]">
            {roleLanding.terminalSubtitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Workspace Tag */}
          <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
            <Building2 className="w-3.5 h-3.5 text-white/40" />
            <span>WORKSPACE:</span>
            <strong className="text-white font-mono">{activeBusiness?.name || 'OmniRetail'}</strong>
          </div>

          {/* If user belongs to multiple businesses, provide prominent Switch Workspace badge */}
          {userMemberships.length > 1 && (
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold transition-colors cursor-pointer"
              title="You have memberships in multiple businesses. Click to switch workspace."
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Switch Workspace ({userMemberships.length})</span>
            </button>
          )}

          {/* Read-Only Status Indicator for Viewer */}
          {roleDef.permissions.readOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono text-[10px] font-bold">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>ENFORCED READ-ONLY</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace Viewport */}
      <main className="flex-1 overflow-x-hidden">
        {currentTab === 'products' && (
          <ProductCatalog
            dbState={dbState}
            onNavigateToPosWithProduct={(prodId) => {
              if (currentRole === 'cashier') {
                setSelectedProductToSell(prodId);
                setCurrentTab('pos');
              } else {
                setCurrentTab(getPosRedirectTab(currentRole));
              }
            }}
            onOpenLocationManager={
              roleDef.permissions.manageOperations ? () => setShowLocationModal(true) : undefined
            }
          />
        )}

        {currentTab === 'bank' && roleDef.allowedTabs.includes('bank') && (
          <BankHub dbState={dbState} />
        )}

        {currentTab === 'branch_managers' && roleDef.allowedTabs.includes('branch_managers') && (
          <BranchManagerHub
            dbState={dbState}
            onNavigateToPos={() => {
              setCurrentTab(getPosRedirectTab(currentRole));
            }}
          />
        )}

        {currentTab === 'pos' && roleDef.allowedTabs.includes('pos') && (
          <PosTerminal
            dbState={dbState}
            initialProductId={selectedProductToSell}
            onClearInitialProduct={() => setSelectedProductToSell(null)}
          />
        )}

        {currentTab === 'inputers' && roleDef.allowedTabs.includes('inputers') && (
          <div className="p-6 max-w-7xl mx-auto">
            <InputerManagement
              onOpenTerminal={(code) => handleOpenTerminal(code)}
            />
          </div>
        )}

        {currentTab === 'inventory' && roleDef.allowedTabs.includes('inventory') && (
          <InventoryManager dbState={dbState} />
        )}

        {currentTab === 'wholesale' && roleDef.allowedTabs.includes('wholesale') && (
          <WholesaleOrders
            dbState={dbState}
            onNavigateToPos={() => {
              setCurrentTab(getPosRedirectTab(currentRole));
            }}
          />
        )}

        {currentTab === 'reporting' && roleDef.allowedTabs.includes('reporting') && (
          <PosReporting dbState={dbState} />
        )}

        {currentTab === 'workspace' && roleDef.allowedTabs.includes('workspace') && (
          <WorkspaceHub dbState={dbState} />
        )}

        {currentTab === 'database' && roleDef.allowedTabs.includes('database') && (
          <DatabaseStudio dbState={dbState} />
        )}
      </main>

      {/* Add Product Modal (Secured by manageProducts permission) */}
      {showAddProductModal && roleDef.permissions.manageProducts && (
        <AddProductSellModal
          dbState={dbState}
          onClose={() => setShowAddProductModal(false)}
        />
      )}

      {/* Location Manager Modal (Secured by manageOperations permission) */}
      {showLocationModal && roleDef.permissions.manageOperations && (
        <LocationManagerModal
          dbState={dbState}
          activeLocationId={activeLocationId}
          onSelectActiveLocation={(id) => {
            dbStore.setActiveLocationId(id);
          }}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <CategoryManagerModal
          dbState={dbState}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* Multi-Business Workspace Selector Modal */}
      {showWorkspaceModal && (
        <WorkspaceSelectorModal
          userEmail={authEmail}
          memberships={userMemberships}
          activeBusinessId={activeBusiness?.id || 'biz_omnistock_hq'}
          onSelectWorkspace={handleSelectWorkspace}
          onSignOut={handleSignOut}
          canCancel={true}
          onClose={() => setShowWorkspaceModal(false)}
        />
      )}

      {/* Automatic Role-Based Login Gateway Modal */}
      <LoginGatewayModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onRequestWorkspaceSelection={(email) => {
          setAuthEmail(email);
          setShowLoginModal(false);
          setShowWorkspaceModal(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
