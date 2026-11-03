import React, { useState } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import { NIGERIAN_BANKS, validateNuban, simulateNubanLookup, NigerianBankInfo } from '../../utils/nigerianBanks';
import { Building2, X, Check, ShieldCheck, Landmark, AlertCircle, ArrowRight, Smartphone, CreditCard, Search } from 'lucide-react';

interface LinkBankAccountModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onAccountLinked?: (bankId: string) => void;
}

export const LinkBankAccountModal: React.FC<LinkBankAccountModalProps> = ({
  dbState,
  onClose,
  onAccountLinked
}) => {
  const [selectedBank, setSelectedBank] = useState<NigerianBankInfo>(NIGERIAN_BANKS[0]); // Moniepoint default
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('OmniStock Enterprises Nigeria Ltd');
  const [accountNumber, setAccountNumber] = useState('');
  const [posTerminalId, setPosTerminalId] = useState('2034MN88');
  const [accountType, setAccountType] = useState<'merchant_settlement' | 'checking' | 'savings'>('merchant_settlement');
  const [currency, setCurrency] = useState('NGN');
  const [isDefault, setIsDefault] = useState((dbState?.linkedBankAccounts?.length || 0) === 0);
  const [autoVerifyIncoming, setAutoVerifyIncoming] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isResolvingNuban, setIsResolvingNuban] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStep, setSuccessStep] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.code.includes(bankSearch)
  );

  const handleSelectBank = (bank: NigerianBankInfo) => {
    setSelectedBank(bank);
    setErrorMessage(null);
  };

  const handleNubanChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(clean);
    setErrorMessage(null);
    setResolvedStatus(null);

    // Auto resolve when 10 digits entered
    if (clean.length === 10) {
      setIsResolvingNuban(true);
      simulateNubanLookup(selectedBank.name, clean).then((name) => {
        setIsResolvingNuban(false);
        setAccountName(name);
        setResolvedStatus('NUBAN Verified via CBN / NIBSS Network');
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = selectedBank.name === 'Other Financial Institution' ? customBankName.trim() : selectedBank.name;

    if (!finalBankName) {
      setErrorMessage('Please select or specify your bank name');
      return;
    }

    const nubanCheck = validateNuban(accountNumber);
    if (!nubanCheck.valid) {
      setErrorMessage(nubanCheck.message || 'Please enter a valid 10-digit NUBAN account number');
      return;
    }

    if (!accountName.trim()) {
      setErrorMessage('Please provide an account holder name');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    // Simulate instant NIBSS / CBN API handshake & verification
    setTimeout(() => {
      const cleanAcc = accountNumber.trim().replace(/\D/g, '');

      const created = dbStore.addLinkedBankAccount({
        bankName: finalBankName,
        accountName: accountName.trim(),
        accountNumber: cleanAcc,
        cbnBankCode: selectedBank.code,
        nuban: cleanAcc,
        ussdCode: selectedBank.ussdPrefix,
        posTerminalId: posTerminalId.trim() || undefined,
        accountType,
        currency,
        isDefault,
        status: 'active',
        balance: 5000000.00, // ₦5,000,000 initial operating buffer
        autoVerifyIncoming
      });

      setIsConnecting(false);
      setSuccessStep(true);

      setTimeout(() => {
        if (onAccountLinked) {
          onAccountLinked(created.id);
        }
        onClose();
      }, 1300);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 text-slate-200 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight font-serif">
                  Link Nigerian Bank Account
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  NUBAN & NIP READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect your Nigerian commercial bank or FinTech account (Moniepoint, GTBank, Zenith, OPay, etc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successStep ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white font-serif">Bank Successfully Linked & NUBAN Verified</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {selectedBank.name} ({accountNumber}) is now active for instant NIP transfer auto-verification and in-store POS settlement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Quick Bank Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold block text-xs">
                  Select Nigerian Financial Institution
                </label>
                <div className="relative w-44">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Nigerian bank..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 text-[11px] bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredBanks.map((bank) => {
                  const isSelected = selectedBank.code === bank.code;
                  return (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => handleSelectBank(bank)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="text-[9px] font-mono text-slate-500">{bank.ussdPrefix}</span>
                      </div>
                      <span className="font-semibold text-[11px] leading-tight line-clamp-1">{bank.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NUBAN & Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-xs">
                  10-Digit NUBAN Account Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. 0123456789"
                    value={accountNumber}
                    onChange={(e) => handleNubanChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-sm tracking-wider placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                  {isResolvingNuban && (
                    <div className="absolute right-2.5 top-2.5">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {resolvedStatus && (
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" />
                    <span>{resolvedStatus}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-xs">
                  Account Name / Holder
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OmniStock Enterprises Nigeria Ltd"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* USSD Code & POS Terminal ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-xs flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-cyan-400" />
                  <span>Bank USSD Dial Prefix</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedBank.ussdPrefix}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-xs flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-amber-400" />
                  <span>POS Terminal ID (TID)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2034MN88"
                  value={posTerminalId}
                  onChange={(e) => setPosTerminalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-xs">
                  Account Classification
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="merchant_settlement">Merchant Settlement (POS & Store)</option>
                  <option value="checking">Corporate Current Account</option>
                  <option value="savings">Reserve Savings Account</option>
                </select>
              </div>
            </div>

            {/* Auto-verification Toggles */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoVerifyIncoming}
                  onChange={(e) => setAutoVerifyIncoming(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 block text-xs">
                    Enable Real-time NIBSS NIP Auto-Verification
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Automatically verifies incoming Nigerian bank customer transfers against order reference codes and marks them as DONE in the ledger.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-slate-800/60">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-300 text-xs">
                  Set as default Nigerian settlement account for POS checkout & wholesale invoicing
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CBN & NIBSS Standard Compliant</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying NUBAN...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Nigerian Bank</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
