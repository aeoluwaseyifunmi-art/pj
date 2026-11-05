import React from 'react';
import { Business, BusinessMember, AppRole, ROLE_LANDINGS, getRoleLanding } from '../../types/database';
import { Building2, Shield, ArrowRight, CheckCircle2, MapPin, Sparkles, UserCheck } from 'lucide-react';

export interface BusinessMembershipOption {
  business: Business;
  member?: BusinessMember;
  role: AppRole;
}

interface WorkspaceSelectorModalProps {
  userEmail: string;
  memberships: BusinessMembershipOption[];
  activeBusinessId: string;
  onSelectWorkspace: (businessId: string, role: AppRole, defaultTab: string) => void;
  onSignOut?: () => void;
  canCancel?: boolean;
  onClose?: () => void;
}

export const WorkspaceSelectorModal: React.FC<WorkspaceSelectorModalProps> = ({
  userEmail,
  memberships,
  activeBusinessId,
  onSelectWorkspace,
  onSignOut,
  canCancel = false,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden font-sans text-slate-100">
        {/* Top Telemetry Header */}
        <div className="h-9 bg-[#171717] border-b border-[#262626] px-4 flex items-center justify-between font-mono text-[11px] text-white/50 tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 font-bold uppercase">OMNISTOCK // MULTI-TENANT ACCESS GATEWAY</span>
          </div>
          <span className="text-white/40 font-mono">SYS_ROUTING_v4.3</span>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs uppercase font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multiple Workspaces Detected</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5 font-display">
              Select Business Workspace
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your authenticated account (<strong className="text-emerald-400 font-mono">{userEmail}</strong>) is a verified member in {memberships.length} business workspaces.
              Select a business workspace below to automatically launch your assigned terminal.
            </p>
          </div>

          {/* Business Workspace Cards */}
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            {memberships.map((item) => {
              const biz = item.business;
              const role = item.role;
              const landing = getRoleLanding(role);
              const isActive = biz.id === activeBusinessId;

              return (
                <div
                  key={biz.id}
                  onClick={() => onSelectWorkspace(biz.id, role, landing.defaultTab)}
                  className={`group relative p-4 rounded-lg border transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#181818] border-white/40 shadow-lg shadow-white/5'
                      : 'bg-[#131313] hover:bg-[#1a1a1a] border-[#262626] hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-md bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0 text-white font-mono font-bold text-sm">
                        <Building2 className="w-5 h-5 text-white/70" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-white group-hover:text-amber-200 transition-colors">
                            {biz.name}
                          </h3>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#222222] text-white/60 border border-[#333333]">
                            {biz.code}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>CURRENT ACTIVE</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {biz.tagline || 'Commercial Enterprise & Retail POS Workspace'}
                        </p>

                        <div className="flex items-center gap-4 mt-2.5 text-[11px] font-mono text-white/50">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-white/40" />
                            <span>{biz.address?.split(',')[0] || 'Main Facility'}</span>
                          </span>
                          <span>•</span>
                          <span>CURRENCY: <strong className="text-white/80">{biz.currency || 'NGN'} ({biz.currencySymbol || '₦'})</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Role & Redirection Badge */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#202020] border border-[#333333] text-xs font-mono font-bold uppercase text-white mb-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span>ROLE: {landing.role.toUpperCase()}</span>
                      </div>
                      <div className="font-mono text-[10px] text-emerald-400 font-bold">
                        → {landing.terminalName}
                      </div>
                    </div>
                  </div>

                  {/* Action Banner */}
                  <div className="mt-3.5 pt-3 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40 text-[11px]">
                      Access Level: <strong className="text-white/70 uppercase">{landing.badge}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white font-bold group-hover:translate-x-1 transition-transform text-xs">
                      <span>Launch Authorized Terminal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-between gap-4 font-mono text-xs">
            {onSignOut ? (
              <button
                onClick={onSignOut}
                className="text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
              >
                ← Sign Out / Switch Account
              </button>
            ) : (
              <span className="text-white/30 text-[11px]">Strict Multi-Tenant Isolation Enforced</span>
            )}

            {canCancel && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#1e1e1e] hover:bg-[#252525] border border-[#333333] text-white transition-colors cursor-pointer"
              >
                Keep Current Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
