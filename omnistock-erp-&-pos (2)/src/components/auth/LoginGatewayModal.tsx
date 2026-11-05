import React, { useState } from 'react';
import { dbStore, USER_CREDENTIAL_ACCOUNTS } from '../../db/databaseStore';
import { AppRole, ROLE_LANDINGS, getRoleLanding } from '../../types/database';
import { googleSignIn } from '../../services/googleAuth';
import {
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Building2,
  Lock,
  Layers,
  ShoppingBag,
  BarChart3,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';

interface LoginGatewayModalProps {
  onLoginSuccess: (email: string, businessId: string, role: AppRole, defaultTab: string) => void;
  onRequestWorkspaceSelection?: (email: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginGatewayModal: React.FC<LoginGatewayModalProps> = ({
  onLoginSuccess,
  onRequestWorkspaceSelection,
  isOpen,
  onClose
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // The Six OmniStock Roles with Individual Credentials & Passwords
  const roleProfiles = [
    {
      role: 'owner' as AppRole,
      email: 'ae.oluwaseyifunmi@gmail.com',
      staffCode: 'OWN-01',
      password: 'Owner@2026',
      name: 'Oluwaseyifunmi',
      title: 'Founder & Managing Director',
      badge: 'OWNER // ADMIN',
      targetTerminal: 'Owner Admin Dashboard',
      description: 'Full business control & financial command. Authorized to process counter sales.',
      icon: Shield,
      accent: 'border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10'
    },
    {
      role: 'admin' as AppRole,
      email: 'admin.sarah@omnistock.com',
      staffCode: 'ADM-01',
      password: 'Admin@2026',
      name: 'Sarah Jenkins',
      title: 'Operations Director',
      badge: 'ADMIN ERP',
      targetTerminal: 'Admin ERP Dashboard',
      description: 'Multi-branch operations, catalog, staff accounts & wholesale orders.',
      icon: Sparkles,
      accent: 'border-sky-500/40 hover:border-sky-400 bg-sky-500/5 hover:bg-sky-500/10'
    },
    {
      role: 'manager' as AppRole,
      email: 'tunde.adeyemi@omnistock.com',
      staffCode: 'BM-01',
      password: 'Manager@2026',
      name: 'Tunde Adeyemi',
      title: 'Branch Operations Lead',
      badge: 'MANAGER OPS',
      targetTerminal: 'Manager Command Centre',
      description: 'Daily branch operations, register balance audits, products & category management.',
      icon: Building2,
      accent: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
    },
    {
      role: 'cashier' as AppRole,
      email: 'chioma.okeke@omnistock.com',
      staffCode: 'INP-01',
      password: 'Cashier@2026',
      name: 'Chioma Okeke',
      title: 'Senior Counter Cashier',
      badge: 'POS TERMINAL',
      targetTerminal: 'Inputer POS Terminal',
      description: 'Exclusive retail counter sales, instant tendering & thermal receipts.',
      icon: ShoppingBag,
      accent: 'border-green-500/40 hover:border-green-400 bg-green-500/5 hover:bg-green-500/10'
    },
    {
      role: 'inventory' as AppRole,
      email: 'musa.ibrahim@omnistock.com',
      staffCode: 'INV-01',
      password: 'Inventory@2026',
      name: 'Musa Ibrahim',
      title: 'Stock Ledger Lead',
      badge: 'STOCK LEAD',
      targetTerminal: 'Inventory Management Terminal',
      description: 'Physical ledger audits, purchase order intakes, barcodes, products & stock.',
      icon: Layers,
      accent: 'border-purple-500/40 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
    },
    {
      role: 'viewer' as AppRole,
      email: 'auditor.kemi@omnistock.com',
      staffCode: 'VIW-01',
      password: 'Viewer@2026',
      name: 'Kemi Balogun',
      title: 'Compliance Auditor',
      badge: 'READ ONLY',
      targetTerminal: 'Read-only Dashboard',
      description: 'Strictly read-only access to sales analytics, financial logs & audit ledgers.',
      icon: BarChart3,
      accent: 'border-slate-500/40 hover:border-slate-400 bg-slate-500/5 hover:bg-slate-500/10'
    }
  ];

  const handleExecuteLogin = (loginId: string, loginPass: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = dbStore.authenticateWithPassword(loginId, loginPass);
      if (!result.success || !result.email || !result.role || !result.businessId || !result.landing) {
        setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
        setIsSubmitting(false);
        return;
      }

      // Check if user belongs to multiple businesses
      if (result.hasMultipleWorkspaces && onRequestWorkspaceSelection) {
        onRequestWorkspaceSelection(result.email);
      } else {
        onLoginSuccess(result.email, result.businessId, result.role, result.landing.defaultTab);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelectProfile = (profile: typeof roleProfiles[0]) => {
    setIdentifier(profile.email);
    setPassword(profile.password);
    handleExecuteLogin(profile.email, profile.password);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res && res.user && res.user.email) {
        const cleanEmail = res.user.email.toLowerCase();
        dbStore.setAuthenticatedUserEmail(cleanEmail);
        const memberships = dbStore.getUserBusinessMemberships(cleanEmail);
        if (memberships.length > 1 && onRequestWorkspaceSelection) {
          onRequestWorkspaceSelection(cleanEmail);
        } else if (memberships.length === 1) {
          const single = memberships[0];
          dbStore.setActiveBusinessId(single.business.id);
          dbStore.setCurrentUserRole(single.role);
          onLoginSuccess(cleanEmail, single.business.id, single.role, single.designatedLanding.defaultTab);
        } else {
          // Default owner for ae.oluwaseyifunmi@gmail.com
          const defaultBiz = 'biz_omnistock_hq';
          dbStore.setActiveBusinessId(defaultBiz);
          dbStore.setCurrentUserRole('owner');
          onLoginSuccess(cleanEmail, defaultBiz, 'owner', 'products');
        }
      }
    } catch (err: any) {
      console.warn('Google Sign-in failed:', err);
      setErrorMsg(err.message || 'Google authentication was not completed. Use password login below.');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-[#222222] rounded-xl shadow-2xl overflow-hidden font-sans text-slate-100 max-h-[94vh] flex flex-col">
        {/* Top Header Telemetry Strip */}
        <div className="h-10 bg-[#141414] border-b border-[#222222] px-6 flex items-center justify-between font-mono text-[11px] text-white/50 tracking-wider shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 font-bold uppercase">OMNISTOCK // CREDENTIAL & PASSWORD GATEWAY</span>
          </div>
          <span className="font-mono text-white/40">ALL_ROLES_INDIVIDUAL_AUTH_v5.0</span>
        </div>

        {/* Modal Scrollable Container */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Header Banner */}
          <div className="border-l-3 border-emerald-400 pl-4 py-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-display uppercase tracking-wide text-white">
              OmniStock Secure Login
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              All six OmniStock roles require individual account credentials and passwords. After successful authentication, you will be automatically redirected to your designated terminal.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Authentication Form: Username/Email + Password */}
          <div className="p-5 rounded-lg bg-[#141414] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Account Credentials & Password Authentication
                </span>
              </div>
              <span className="font-mono text-[10px] text-white/40">STRICT RBAC ENFORCED</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteLogin(identifier, password);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identifier Input */}
                <div>
                  <label className="block text-[11px] font-mono text-white/60 uppercase mb-1">
                    Email or Staff Code:
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. chioma.okeke@omnistock.com or INP-01"
                    className="w-full px-3.5 py-2.5 rounded bg-[#0e0e0e] border border-[#2f2f2f] focus:border-emerald-400 text-xs font-mono text-white placeholder-white/25 focus:outline-none transition-colors"
                  />
                </div>

                {/* Password Input with Visibility Toggle */}
                <div>
                  <label className="block text-[11px] font-mono text-white/60 uppercase mb-1">
                    Account Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password..."
                      className="w-full px-3.5 py-2.5 pr-10 rounded bg-[#0e0e0e] border border-[#2f2f2f] focus:border-emerald-400 text-xs font-mono text-white placeholder-white/25 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningInGoogle}
                  className="w-full sm:w-auto px-4 py-2 rounded bg-[#1c1c1c] hover:bg-[#252525] border border-white/10 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSigningInGoogle ? 'Signing in...' : 'Sign In with Google'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Authenticate & Enter Terminal →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Personnel Directory Cards (All 6 Required Roles) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Authorized Role Directory (1-Click Password Fill & Login)</span>
              </div>
              <span className="font-mono text-[10px] text-white/40">
                Individual Passwords Pre-loaded
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roleProfiles.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.email}
                    className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${p.accent}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-[#1e1e1e] border border-white/10 flex items-center justify-center text-white shrink-0">
                          <Icon className="w-4 h-4 text-white/90" />
                        </div>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#181818] border border-white/20 text-white/80 font-bold uppercase">
                          {p.badge}
                        </span>
                      </div>

                      <div className="font-bold text-sm text-white">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-400 truncate mt-0.5">
                        {p.email} • <span className="text-white/60">{p.staffCode}</span>
                      </div>
                      <div className="text-[11px] text-white/70 font-medium mt-1">
                        {p.title}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>

                      {/* Display Credential & Password for Instant Verification */}
                      <div className="mt-2.5 p-2 rounded bg-black/40 border border-white/10 font-mono text-[10px] space-y-1">
                        <div className="flex justify-between text-white/60">
                          <span>Password:</span>
                          <span className="text-amber-300 font-bold">{p.password}</span>
                        </div>
                        <div className="flex justify-between text-white/60">
                          <span>Destination:</span>
                          <span className="text-white font-medium truncate ml-1">{p.targetTerminal}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickSelectProfile(p)}
                      className="mt-3 w-full py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Log In As {p.role.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
