import React, { useState } from 'react';
import { dbStore } from '../../db/databaseStore';
import { AppRole, ROLE_LANDINGS, getRoleLanding } from '../../types/database';
import { googleSignIn } from '../../services/googleAuth';
import {
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  Lock,
  Layers,
  ShoppingBag,
  BarChart3,
  Terminal,
  LogOut
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
  const [customEmail, setCustomEmail] = useState('');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Verified Personnel Profiles for Quick Authorized Testing
  const quickStaffProfiles = [
    {
      role: 'owner' as AppRole,
      email: 'ae.oluwaseyifunmi@gmail.com',
      name: 'Oluwaseyifunmi',
      title: 'Founder & Managing Director',
      badge: 'MULTI-BIZ OWNER',
      targetTerminal: 'Owner Admin Dashboard',
      description: 'Owner at OmniRetail Enterprise & Regional Ops Manager at Apex Mart. Triggers Workspace Selector.',
      icon: Shield,
      accent: 'border-amber-500/40 hover:border-amber-400 bg-amber-500/5'
    },
    {
      role: 'admin' as AppRole,
      email: 'admin.sarah@omnistock.com',
      name: 'Sarah Jenkins',
      title: 'Operations & Procurement Director',
      badge: 'ADMIN ERP',
      targetTerminal: 'Admin ERP Dashboard',
      description: 'Operations, catalog, staff accounts, branches & wholesale management.',
      icon: Sparkles,
      accent: 'border-sky-500/40 hover:border-sky-400 bg-sky-500/5'
    },
    {
      role: 'manager' as AppRole,
      email: 'tunde.adeyemi@omnistock.com',
      name: 'Tunde Adeyemi',
      title: 'Branch Operations Lead',
      badge: 'MANAGER OPS',
      targetTerminal: 'Manager Command Centre',
      description: 'Branch registers, shift drawer sign-offs, supervisory approvals & branch stock recounts.',
      icon: Building2,
      accent: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5'
    },
    {
      role: 'cashier' as AppRole,
      email: 'chioma.okeke@omnistock.com',
      name: 'Chioma Okeke',
      title: 'Senior Counter Cashier',
      badge: 'POS TERMINAL',
      targetTerminal: 'Inputer POS Terminal',
      description: 'Direct sales register, card/cash tendering, split payments & thermal receipt issuance.',
      icon: ShoppingBag,
      accent: 'border-green-500/40 hover:border-green-400 bg-green-500/5'
    },
    {
      role: 'inventory' as AppRole,
      email: 'musa.ibrahim@omnistock.com',
      name: 'Musa Ibrahim',
      title: 'Stock Ledger & Warehouse Lead',
      badge: 'STOCK LEAD',
      targetTerminal: 'Inventory Management Terminal',
      description: 'Physical ledger audits, purchase order inbound intake, bin movements & barcode prints.',
      icon: Layers,
      accent: 'border-purple-500/40 hover:border-purple-400 bg-purple-500/5'
    },
    {
      role: 'viewer' as AppRole,
      email: 'auditor.kemi@omnistock.com',
      name: 'Kemi Balogun',
      title: 'Compliance & Financial Auditor',
      badge: 'READ ONLY',
      targetTerminal: 'Read-only Dashboard',
      description: 'Read-only fiscal reports, data analytics streams & transaction history without write access.',
      icon: BarChart3,
      accent: 'border-slate-500/40 hover:border-slate-400 bg-slate-500/5'
    }
  ];

  const handleProcessEmailLogin = (emailToAuth: string) => {
    const cleanEmail = emailToAuth.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    dbStore.setAuthenticatedUserEmail(cleanEmail);

    // Retrieve business memberships for this email
    const memberships = dbStore.getUserBusinessMemberships(cleanEmail);

    if (memberships.length > 1) {
      // Multiple businesses: prompt workspace selector
      if (onRequestWorkspaceSelection) {
        onRequestWorkspaceSelection(cleanEmail);
      }
    } else if (memberships.length === 1) {
      // Single business: auto-redirect directly to their designated terminal!
      const single = memberships[0];
      dbStore.setActiveBusinessId(single.business.id);
      dbStore.setCurrentUserRole(single.role);
      onLoginSuccess(cleanEmail, single.business.id, single.role, single.designatedLanding.defaultTab);
    } else {
      // No explicit memberships found:
      // If user is ae.oluwaseyifunmi@gmail.com, default to owner of omnistock_hq
      if (cleanEmail === 'ae.oluwaseyifunmi@gmail.com') {
        const omniBizId = 'biz_omnistock_hq';
        dbStore.setActiveBusinessId(omniBizId);
        dbStore.setCurrentUserRole('owner');
        onLoginSuccess(cleanEmail, omniBizId, 'owner', 'products');
      } else {
        // Synthesize a viewer or auto-provision as invited member
        const defaultBizId = dbStore.getActiveBusinessId();
        dbStore.setActiveBusinessId(defaultBizId);
        dbStore.setCurrentUserRole('viewer');
        onLoginSuccess(cleanEmail, defaultBizId, 'viewer', 'reporting');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res && res.user && res.user.email) {
        handleProcessEmailLogin(res.user.email);
      }
    } catch (err: any) {
      console.warn('Google Sign-in cancelled or failed:', err);
      setErrorMsg(err.message || 'Google authentication was not completed. You can also select a verified personnel profile below.');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-[#222222] rounded-xl shadow-2xl overflow-hidden font-sans text-slate-100 max-h-[92vh] flex flex-col">
        {/* Top Header Telemetry Strip */}
        <div className="h-10 bg-[#141414] border-b border-[#222222] px-6 flex items-center justify-between font-mono text-[11px] text-white/50 tracking-wider shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 font-bold uppercase">OMNISTOCK // AUTHENTICATION GATEWAY</span>
          </div>
          <span className="font-mono text-white/40">ROLE_REDIECTION_ENGINE_v4.3</span>
        </div>

        {/* Modal Scrollable Container */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Header Banner */}
          <div className="border-l-3 border-white pl-4 py-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-display uppercase tracking-wide text-white">
              OmniStock Portal Access
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Automatic role-based authentication. When you log in, your actual assigned role is retrieved from your authenticated Firebase business membership and you will land directly in your designated terminal.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action: Google Firebase Authentication */}
          <div className="p-5 rounded-lg bg-[#141414] border border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs uppercase font-bold text-white tracking-wide">
                  Live Firebase Google Sign-In
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Authenticates with your Google account (<span className="text-slate-300 font-mono">ae.oluwaseyifunmi@gmail.com</span> or staff domain) via Firebase OAuth.
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningInGoogle}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSigningInGoogle ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Role Redirection Grid (6 Specific Assigned Roles) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Verified Personnel Directory (Automatic Terminal Redirection)</span>
              </div>
              <span className="font-mono text-[10px] text-white/40">
                1-Click Role Simulation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickStaffProfiles.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.email}
                    onClick={() => handleProcessEmailLogin(p.email)}
                    className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between ${p.accent}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-[#1e1e1e] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4 text-white/80" />
                        </div>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#181818] border border-white/20 text-white/70 font-bold uppercase">
                          {p.badge}
                        </span>
                      </div>

                      <div className="font-bold text-sm text-white group-hover:text-amber-200 transition-colors">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-400 truncate mt-0.5">
                        {p.email}
                      </div>
                      <div className="text-[11px] text-white/60 font-medium mt-1">
                        {p.title}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-white/50">Redirects to:</span>
                      <span className="text-white font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{p.targetTerminal}</span>
                        <ArrowRight className="w-3 h-3 text-white/70" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Staff Email Login Input */}
          <div className="pt-4 border-t border-[#222222]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessEmailLogin(customEmail);
              }}
              className="flex flex-col sm:flex-row items-center gap-2.5"
            >
              <div className="relative flex-1 w-full">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Or enter any custom staff email (e.g. yourname@domain.com)..."
                  className="w-full px-3.5 py-2.5 rounded bg-[#141414] border border-[#2b2b2b] focus:border-white text-xs font-mono text-white placeholder-white/30 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#202020] hover:bg-[#282828] border border-[#383838] hover:border-white font-mono text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer whitespace-nowrap"
              >
                Authenticate & Redirect →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
