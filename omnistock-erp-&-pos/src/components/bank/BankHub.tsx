import React, { useState, useMemo } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import { LinkedBankAccount, BankTransaction } from '../../types/database';
import { formatNaira } from '../../utils/nigerianBanks';
import {
  Landmark,
  Plus,
  CheckCircle2,
  Search,
  Check,
  Zap,
  CreditCard,
  Smartphone,
  Trash2,
  Copy
} from 'lucide-react';
import { LinkBankAccountModal } from './LinkBankAccountModal';

interface BankHubProps {
  dbState: DatabaseState;
}

export const BankHub: React.FC<BankHubProps> = ({ dbState }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);
  const [copiedNuban, setCopiedNuban] = useState<string | null>(null);

  // Simulation form
  const [simAmount, setSimAmount] = useState<number>(125000);
  const [simSender, setSimSender] = useState<string>('Adebayo Balogun');
  const linkedBanks = dbState?.linkedBankAccounts || [];
  const transactions = dbState?.bankTransactions || [];

  const [simBankId, setSimBankId] = useState<string>(
    () => (dbState?.linkedBankAccounts?.[0]?.id || '')
  );

  // Metrics
  const totalSettledBalance = useMemo(() => {
    return linkedBanks.reduce((sum, b) => sum + (b.balance || 0), 0);
  }, [linkedBanks]);

  const verifiedCount = useMemo(() => {
    return transactions.filter((t) => t.status === 'verified').length;
  }, [transactions]);

  const totalVerifiedVolume = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType === 'verified' && t.status !== 'verified') return false;
      if (filterType === 'sales' && t.type !== 'credit_sale') return false;
      if (filterType === 'wholesale' && t.type !== 'wholesale_settlement') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = t.referenceCode.toLowerCase().includes(q);
        const matchBank = t.bankName.toLowerCase().includes(q);
        const matchSender = t.senderName.toLowerCase().includes(q);
        const matchOrder = (t.orderNumber || '').toLowerCase().includes(q);
        const matchNip = (t.nipSessionId || '').toLowerCase().includes(q);
        return matchRef || matchBank || matchSender || matchOrder || matchNip;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  const handleSimulateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAmount || simAmount <= 0) return;

    setIsSimulating(true);

    setTimeout(() => {
      const targetBank = linkedBanks.find((b) => b.id === simBankId) || linkedBanks[0];
      const created = dbStore.simulateIncomingBankTransfer(
        simAmount,
        simSender,
        undefined,
        targetBank?.id
      );

      setIsSimulating(false);
      setSimulationSuccess(
        `Received & Verified payment of ${formatNaira(simAmount)} from ${simSender}! Reference: ${created.referenceCode}`
      );
      setTimeout(() => setSimulationSuccess(null), 5000);
    }, 800);
  };

  const handleCopyNuban = (nuban: string) => {
    navigator.clipboard.writeText(nuban);
    setCopiedNuban(nuban);
    setTimeout(() => setCopiedNuban(null), 2000);
  };

  const handleSetDefaultBank = (id: string) => {
    dbStore.setDefaultBankAccount(id);
  };

  const handleDeleteBank = (id: string, name: string) => {
    if (linkedBanks.length <= 1) {
      alert('You must keep at least one linked settlement bank account.');
      return;
    }
    if (window.confirm(`Disconnect bank account "${name}"?`)) {
      dbStore.deleteLinkedBankAccount(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Financial & Settlement Hub</span>
            <span aria-hidden="true">·</span>
            <span>NIBSS Instant Payment (NIP)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Banking & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your Nigerian bank accounts, monitor incoming NIP transfers, and view settled transactions.
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Link Bank Account</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Settled Balance</div>
          <div className="text-2xl font-semibold text-emerald-400 tracking-tight truncate">
            {formatNaira(totalSettledBalance)}
          </div>
          <div className="text-xs text-slate-400">Across {linkedBanks.length} accounts</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Verified Transactions</div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {verifiedCount} Done
          </div>
          <div className="text-xs text-slate-400">Auto-cleared via NIP</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Settlement Volume</div>
          <div className="text-2xl font-semibold text-white tracking-tight truncate">
            {formatNaira(totalVerifiedVolume)}
          </div>
          <div className="text-xs text-slate-400">Total cleared volume</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Payment Channel</div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            NIP & POS
          </div>
          <div className="text-xs text-slate-400">Real-time settlement</div>
        </div>
      </div>

      {/* Connected Nigerian Bank Accounts Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Connected Accounts ({linkedBanks.length})
          </h2>
          <span className="text-xs text-slate-400">
            Primary account automatically receives customer payments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedBanks.map((bank) => (
            <div
              key={bank.id}
              className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors ${
                bank.isDefault
                  ? 'border-emerald-500/60 bg-slate-900'
                  : 'border-slate-800 hover:border-slate-700/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {bank.bankName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs text-emerald-400 font-medium">
                          {bank.accountNumber}
                        </span>
                        <button
                          onClick={() => handleCopyNuban(bank.accountNumber)}
                          title="Copy NUBAN account number"
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedNuban === bank.accountNumber ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {bank.isDefault ? (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Primary
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultBank(bank.id)}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-1">
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {bank.accountName}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    {bank.ussdCode && <span>USSD: {bank.ussdCode}</span>}
                    {bank.posTerminalId && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>POS TID: {bank.posTerminalId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">Settled Balance</div>
                  <div className="text-base font-semibold text-white">
                    {formatNaira(bank.balance || 0)}
                  </div>
                </div>

                {linkedBanks.length > 1 && !bank.isDefault && (
                  <button
                    onClick={() => handleDeleteBank(bank.id, bank.bankName)}
                    title="Disconnect bank account"
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Account Card Action */}
          <button
            onClick={() => setShowLinkModal(true)}
            className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 hover:bg-slate-900/40 transition-colors cursor-pointer min-h-[140px]"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Link Another Nigerian Bank
              </span>
              <span className="text-[11px] text-slate-400">
                Moniepoint, GTBank, Zenith, OPay & POS terminals
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Live NIP Transfer Simulation Utility */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Customer Bank Transfer (NIP Auto-Verify Test)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Test how an incoming customer bank payment is automatically detected, verified, and settled.
            </p>
          </div>
          <span className="text-[10px] text-slate-400">
            Instant NIP Verification Ready
          </span>
        </div>

        <form onSubmit={handleSimulateTransfer} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-3">
            <label className="text-[10px] text-slate-400 block mb-1">Amount (₦)</label>
            <input
              type="number"
              step="100"
              value={simAmount}
              onChange={(e) => setSimAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-[10px] text-slate-400 block mb-1">Sender Name</label>
            <input
              type="text"
              value={simSender}
              onChange={(e) => setSimSender(e.target.value)}
              placeholder="e.g. Adebayo Balogun"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] text-slate-400 block mb-1">Destination Bank</label>
            <select
              value={simBankId}
              onChange={(e) => setSimBankId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {linkedBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} ({b.accountNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSimulating ? 'Verifying...' : 'Simulate'}
            </button>
          </div>
        </form>

        {simulationSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{simulationSuccess}</span>
          </div>
        )}
      </div>

      {/* Transactions Done Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-0">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Bank Transactions & Settlement Ledger
            </h2>
            <p className="text-xs text-slate-400">
              Verified incoming payments and settlement records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 w-52"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-0.5 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setFilterType('verified')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterType === 'verified' ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Verified Done ({verifiedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Done Table */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No bank transactions found</p>
            <p className="text-xs text-slate-500">
              Process a transaction in the POS Terminal with Bank Transfer or run the simulation above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Status & Reference</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4">Sender / Customer</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Cleared At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Status & Reference */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3 h-3" />
                          <span>DONE</span>
                        </span>
                        <div>
                          <span className="font-mono text-xs text-white block">
                            {tx.referenceCode}
                          </span>
                          {tx.nipSessionId && (
                            <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[140px]" title={tx.nipSessionId}>
                              NIP: {tx.nipSessionId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Linked Bank */}
                    <td className="py-3 px-4 text-slate-200">
                      {tx.bankName}
                    </td>

                    {/* Sender */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{tx.senderName}</div>
                      {tx.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                      )}
                    </td>

                    {/* Order Reference */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {tx.orderNumber ? (
                        <span>{tx.orderNumber}</span>
                      ) : (
                        <span className="text-slate-400">Direct Settlement</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-semibold text-emerald-400 text-xs">
                      +{formatNaira(tx.amount)}
                    </td>

                    {/* Cleared Timestamp */}
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(tx.verifiedAt || tx.createdAt).toLocaleDateString()} {new Date(tx.verifiedAt || tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Bank Modal */}
      {showLinkModal && (
        <LinkBankAccountModal
          dbState={dbState}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
};
