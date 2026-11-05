import React, { useState } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import { Order, Customer, PriceTier } from '../../types/database';
import {
  Building2,
  FileText,
  UserPlus,
  Percent,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Star,
  X
} from 'lucide-react';
import { ReceiptModal } from '../pos/ReceiptModal';
import { formatNaira } from '../../utils/nigerianBanks';

interface WholesaleOrdersProps {
  dbState: DatabaseState;
  onNavigateToPos: () => void;
}

export const WholesaleOrders: React.FC<WholesaleOrdersProps> = ({ dbState, onNavigateToPos }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'customers' | 'tiers'>('invoices');

  // New customer modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustType, setNewCustType] = useState<'wholesale_business' | 'vip_retail'>('wholesale_business');
  const [newCustVipTier, setNewCustVipTier] = useState<'Silver' | 'Gold' | 'Platinum'>('Gold');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'wholesale' | 'vip'>('all');
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustTaxId, setNewCustTaxId] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCredit, setNewCustCredit] = useState(50000);
  const [newCustTerms, setNewCustTerms] = useState<'immediate' | 'net15' | 'net30' | 'net60'>('net30');

  // Filter wholesale orders
  const wholesaleOrders = dbState.orders.filter((o) => o.channel === 'wholesale');
  const wholesaleCustomers = dbState.customers.filter((c) => c.type === 'wholesale_business');
  const vipCustomers = dbState.customers.filter((c) => c.type === 'vip_retail');

  const displayedCustomers = dbState.customers.filter((c) => {
    if (customerFilter === 'wholesale') return c.type === 'wholesale_business';
    if (customerFilter === 'vip') return c.type === 'vip_retail';
    return c.type === 'wholesale_business' || c.type === 'vip_retail';
  });

  const totalWholesaleRevenue = wholesaleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalReceivables = wholesaleCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    if (newCustType === 'vip_retail') {
      const discountLabel =
        newCustVipTier === 'Platinum'
          ? 'VIP Platinum (15%)'
          : newCustVipTier === 'Silver'
          ? 'VIP Silver (5%)'
          : 'VIP Gold (10%)';

      dbStore.addCustomer({
        name: newCustName.trim(),
        companyName: newCustCompany.trim() || undefined,
        type: 'vip_retail',
        taxId: newCustTaxId.trim() || undefined,
        resaleCertVerified: false,
        email:
          newCustEmail.trim() ||
          `${newCustName.toLowerCase().replace(/[^a-z0-9]/g, '')}@vip.omnistock`,
        phone: newCustPhone.trim() || '+234 800 000 0000',
        creditLimit: newCustCredit,
        paymentTerms: newCustTerms === 'immediate' ? 'immediate' : newCustTerms,
        discountTier: discountLabel
      });
    } else {
      dbStore.addCustomer({
        name: newCustName.trim(),
        companyName: newCustCompany.trim() || 'Wholesale Client',
        type: 'wholesale_business',
        taxId: newCustTaxId.trim() || 'N/A',
        resaleCertVerified: true,
        email: newCustEmail.trim() || 'b2b@omnistock.internal',
        phone: newCustPhone.trim(),
        creditLimit: newCustCredit,
        paymentTerms: newCustTerms,
        discountTier: 'Verified B2B Wholesale'
      });
    }

    setShowNewCustModal(false);
    setNewCustName('');
    setNewCustCompany('');
    setNewCustTaxId('');
    setNewCustEmail('');
    setNewCustPhone('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Wholesale & B2B Operations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Commercial accounts, tiered price break schedules, Net-30 invoicing, and bulk dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewCustModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>New B2B Account</span>
          </button>
          <button
            onClick={onNavigateToPos}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-blue-500 hover:bg-blue-400 rounded shadow-sm transition-colors"
          >
            <span>Create Wholesale Order</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">B2B Commercial Revenue</p>
          <p className="text-2xl font-semibold text-blue-400 tracking-tight mt-1 truncate">
            {formatNaira(totalWholesaleRevenue)}
          </p>
          <p className="text-xs text-slate-400">
            {wholesaleOrders.length} B2B Contracts & Invoices
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Outstanding Receivables (A/R)</p>
          <p className="text-2xl font-semibold text-amber-400 tracking-tight mt-1 truncate">
            {formatNaira(totalReceivables)}
          </p>
          <p className="text-xs text-slate-400">
            Pending Net 15/30 settlement
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Verified Client Accounts</p>
          <p className="text-2xl font-semibold text-white tracking-tight mt-1">
            {wholesaleCustomers.length} Active Accounts
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tax-Exempt Certificates Verified</span>
          </p>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-md w-fit">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'invoices'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Wholesale Invoices ({wholesaleOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'customers'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Client Accounts ({wholesaleCustomers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'tiers'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Volume Price Tiers ({dbState.priceTiers.length})</span>
        </button>
      </div>

      {/* VIEW 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">B2B Company / Buyer</th>
                  <th className="py-3 px-4">Tax ID / Cert</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {wholesaleOrders.map((order) => {
                  const isPaid = order.paymentStatus === 'paid';
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-200">{order.customerCompany || order.customerName}</p>
                        <p className="text-[11px] text-slate-400">Attn: {order.customerName}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-400">
                        {order.customerTaxId || 'Exempt Verified'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-300">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums text-sm">
                        {formatNaira(order.grandTotal)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 uppercase">
                        {order.paymentMethod.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>Net 30 Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors ml-auto"
                        >
                          <Printer className="w-3 h-3" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Client Accounts Directory */}
      {activeTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden space-y-0">
          {/* Customer Filter Tabs */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCustomerFilter('all')}
                className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  customerFilter === 'all'
                    ? 'bg-white text-black font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                All Accounts ({wholesaleCustomers.length + vipCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerFilter('wholesale')}
                className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  customerFilter === 'wholesale'
                    ? 'bg-white text-black font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                B2B Wholesale ({wholesaleCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerFilter('vip')}
                className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors flex items-center gap-1 ${
                  customerFilter === 'vip'
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-amber-400/80 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400" />
                <span>VIP Clients ({vipCustomers.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewCustType('vip_retail');
                setShowNewCustModal(true);
              }}
              className="px-2.5 py-1 text-xs font-mono font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded flex items-center gap-1 cursor-pointer"
            >
              <Star className="w-3 h-3 fill-amber-400" />
              <span>+ Add VIP Client</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Account / Client Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Account Type &amp; Tier</th>
                  <th className="py-3 px-4">Credit Terms</th>
                  <th className="py-3 px-4 text-right">Credit Line</th>
                  <th className="py-3 px-4 text-right">Outstanding (A/R)</th>
                  <th className="py-3 px-4 text-right">Available Credit</th>
                  <th className="py-3 px-4">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {displayedCustomers.map((cust) => {
                  const available = Math.max(0, cust.creditLimit - cust.outstandingBalance);
                  const isVip = cust.type === 'vip_retail';
                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {cust.companyName || cust.name}
                      </td>
                      <td className="py-3 px-4 text-slate-200">{cust.name}</td>
                      <td className="py-3 px-4">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{cust.discountTier || 'VIP Retail'}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-emerald-400">
                            {cust.taxId || 'B2B Reseller'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-slate-300">
                        {cust.paymentTerms}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        {formatNaira(cust.creditLimit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-400">
                        {formatNaira(cust.outstandingBalance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                        {formatNaira(available)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        <p>{cust.email}</p>
                        <p className="text-[11px] text-slate-400">{cust.phone}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Price Tiers Matrix */}
      {activeTab === 'tiers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60">
            <span className="text-xs font-semibold text-slate-200">
              Contract Volume Price Breaks · Automatically evaluated during POS & Wholesale checkout
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/40 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Tier Label</th>
                  <th className="py-3 px-4 text-center">Minimum Units (MOQ)</th>
                  <th className="py-3 px-4 text-right">Standard MSRP</th>
                  <th className="py-3 px-4 text-right font-bold text-white">Tier Unit Price</th>
                  <th className="py-3 px-4 text-right text-emerald-400 font-bold">Discount %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {dbState.priceTiers.map((tier) => {
                  const product = dbState.products.find((p) => p.id === tier.productId);
                  return (
                    <tr key={tier.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-200">{product?.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{product?.sku}</td>
                      <td className="py-3 px-4 text-slate-300">{tier.tierLabel}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-100 font-bold">
                        {tier.minQuantity}+
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400 line-through">
                        ${product ? product.retailPrice.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-400 text-sm">
                        ${tier.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                        {tier.discountPercent.toFixed(1)}% OFF
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Client Account */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-lg max-w-md w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {newCustType === 'vip_retail' ? (
                  <>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Register VIP Customer</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 text-white" />
                    <span>Register Wholesale B2B Account</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCustModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Type Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-[#0a0a0a] p-1 border border-[#222222] rounded">
              <button
                type="button"
                onClick={() => setNewCustType('wholesale_business')}
                className={`py-1.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                  newCustType === 'wholesale_business'
                    ? 'bg-white text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                B2B Wholesale
              </button>
              <button
                type="button"
                onClick={() => setNewCustType('vip_retail')}
                className={`py-1.5 text-xs font-mono rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                  newCustType === 'vip_retail'
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400" />
                <span>VIP Retail Client</span>
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-white/50 uppercase text-[10px]">
                  {newCustType === 'vip_retail' ? 'Customer Full Name *' : 'Company / Entity Name *'}
                </label>
                <input
                  type="text"
                  placeholder={newCustType === 'vip_retail' ? 'e.g. Chief Adeleke Balogun' : 'e.g. Pacific Artisan Beverages LLC'}
                  value={newCustType === 'vip_retail' ? newCustName : newCustCompany}
                  onChange={(e) => {
                    if (newCustType === 'vip_retail') {
                      setNewCustName(e.target.value);
                    } else {
                      setNewCustCompany(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              {newCustType === 'wholesale_business' ? (
                <div className="space-y-1">
                  <label className="text-white/50 uppercase text-[10px]">Authorized Purchasing Officer *</label>
                  <input
                    type="text"
                    placeholder="e.g. Maria Gonzalez"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none focus:border-white"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-white/50 uppercase text-[10px]">Company / Affiliation (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Balogun Holdings"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}

              {newCustType === 'vip_retail' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-white/50 uppercase text-[10px]">VIP Loyalty Tier *</label>
                    <select
                      value={newCustVipTier}
                      onChange={(e) => setNewCustVipTier(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-amber-300 font-bold focus:outline-none"
                    >
                      <option value="Silver">Silver Tier (5% Off)</option>
                      <option value="Gold">Gold Tier (10% Off)</option>
                      <option value="Platinum">Platinum Tier (15% Off)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/50 uppercase text-[10px]">Store Credit Line (₦)</label>
                    <input
                      type="number"
                      value={newCustCredit}
                      onChange={(e) => setNewCustCredit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-white/50 uppercase text-[10px]">Tax ID / CAC / Resale License</label>
                    <input
                      type="text"
                      placeholder="RC-1234567"
                      value={newCustTaxId}
                      onChange={(e) => setNewCustTaxId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/50 uppercase text-[10px]">Payment Terms</label>
                    <select
                      value={newCustTerms}
                      onChange={(e) => setNewCustTerms(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none"
                    >
                      <option value="net15">Net 15 Days</option>
                      <option value="net30">Net 30 Days</option>
                      <option value="net60">Net 60 Days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/50 uppercase text-[10px]">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/50 uppercase text-[10px]">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@omnistock.internal"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded text-white focus:outline-none"
                  />
                </div>
              </div>

              {newCustType === 'vip_retail' && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  ★ VIP clients are immediately eligible for automatic loyalty discounts across the POS register and wholesale counters.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="px-3.5 py-1.5 text-white/50 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-mono font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    newCustType === 'vip_retail'
                      ? 'bg-amber-400 text-black hover:bg-amber-300'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {newCustType === 'vip_retail' ? 'Enroll VIP Client' : 'Save B2B Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedOrder && (
        <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};
