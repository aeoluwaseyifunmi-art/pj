import React, { useState, useMemo, useEffect } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import { Product, ProductVariation, Order, OrderItem, Customer, PaymentMethod, PaymentStatus } from '../../types/database';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  FileCheck,
  Building,
  Package,
  Layers,
  ArrowRight,
  UserCheck,
  Landmark,
  ShieldCheck,
  Check,
  Smartphone,
  Tag
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { ProductVariationSelectorModal } from '../products/ProductVariationSelectorModal';
import { CategoryManagementModal } from '../inventory/CategoryManagementModal';
import { formatNaira, buildUssdTransferString, generateNipSessionId, generatePosRrn } from '../../utils/nigerianBanks';

interface PosTerminalProps {
  dbState: DatabaseState;
  onOpenScanner?: () => void;
  initialProductId?: string | null;
  onClearInitialProduct?: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  dbState,
  onOpenScanner,
  initialProductId,
  onClearInitialProduct
}) => {
  // Mode: retail or wholesale
  const [channel, setChannel] = useState<'retail' | 'wholesale'>('retail');

  // Selected Store/Warehouse location
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => dbStore.getActiveLocationId() || (channel === 'retail' ? 'loc_store_flagship' : 'loc_wh_central')
  );

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_walkin_retail');

  // Cart state
  interface CartItem {
    product: Product;
    variation?: ProductVariation;
    quantity: number;
    customDiscountPercent: number;
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variationSelectingProduct, setVariationSelectingProduct] = useState<Product | null>(null);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [selectedInputerCode, setSelectedInputerCode] = useState<string>(
    dbState.inputers?.[0]?.staffCode || 'INP-01'
  );
  const [bankAutoVerifying, setBankAutoVerifying] = useState(false);
  const [bankVerifiedDone, setBankVerifiedDone] = useState(false);
  const [generatedBankRef, setGeneratedBankRef] = useState<string>('');
  const [cardScheme, setCardScheme] = useState<'verve' | 'mastercard' | 'visa'>('verve');
  const [posRrn, setPosRrn] = useState<string>('');
  const [nipSessionId, setNipSessionId] = useState<string>('');

  // Branch Manager Supervision state
  const [isSupervised, setIsSupervised] = useState<boolean>(false);
  const [selectedSupervisorCode, setSelectedSupervisorCode] = useState<string>('');
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');

  const branchManagers = useMemo(() => {
    return (dbState.inputers || []).filter(
      (i) => i.role === 'branch_manager' || i.role === 'shift_supervisor'
    );
  }, [dbState.inputers]);

  const defaultBranchManager = useMemo(() => {
    return (
      branchManagers.find((m) => m.assignedLocationId === selectedLocationId) ||
      branchManagers[0]
    );
  }, [branchManagers, selectedLocationId]);

  const defaultBank = dbState.linkedBankAccounts?.find((b) => b.isDefault) || dbState.linkedBankAccounts?.[0];

  // When channel switches, adjust defaults
  const handleChannelSwitch = (newChannel: 'retail' | 'wholesale') => {
    setChannel(newChannel);
    if (newChannel === 'wholesale') {
      setSelectedLocationId('loc_wh_central');
      // Set to first wholesale customer
      const wsCust = dbState.customers.find((c) => c.type === 'wholesale_business');
      if (wsCust) setSelectedCustomerId(wsCust.id);
    } else {
      setSelectedLocationId('loc_store_flagship');
      setSelectedCustomerId('cust_walkin_retail');
    }
  };

  // Customers filtered by channel
  const availableCustomers = useMemo(() => {
    if (channel === 'wholesale') {
      return dbState.customers.filter((c) => c.type === 'wholesale_business');
    }
    return dbState.customers.filter((c) => c.type !== 'wholesale_business');
  }, [channel, dbState.customers]);

  const currentCustomer: Customer | undefined = dbState.customers.find(
    (c) => c.id === selectedCustomerId
  );

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    return ['All', ...dbStore.getCategories()];
  }, [dbState.products, dbState.customCategories, dbState.hiddenCategories]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return dbState.products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchCat && matchQuery;
    });
  }, [dbState.products, selectedCategory, searchQuery]);

  // Helper to generate a unique key for cart items (product + variation)
  const getCartItemKey = (item: { product: Product; variation?: ProductVariation }) =>
    item.variation ? `${item.product.id}__${item.variation.id}` : item.product.id;

  // Cart item management
  const addToCart = (product: Product, variation?: ProductVariation, quantityToAdd?: number) => {
    // If product has variations but no variation is specified yet, trigger variation picker modal
    if (!variation && product.hasVariations && product.variations && product.variations.length > 0) {
      setVariationSelectingProduct(product);
      return;
    }

    const itemKey = variation ? `${product.id}__${variation.id}` : product.id;
    const existingIndex = cart.findIndex((item) => getCartItemKey(item) === itemKey);
    const defaultQty = channel === 'wholesale' ? product.minWholesaleQty || 5 : 1;
    const qty = quantityToAdd || defaultQty;

    if (existingIndex >= 0) {
      const nextCart = [...cart];
      nextCart[existingIndex] = {
        ...nextCart[existingIndex],
        quantity: nextCart[existingIndex].quantity + (quantityToAdd || 1)
      };
      setCart(nextCart);
    } else {
      setCart([...cart, { product, variation, quantity: qty, customDiscountPercent: 0 }]);
    }
  };

  useEffect(() => {
    if (initialProductId) {
      const targetProd = dbState.products.find((p) => p.id === initialProductId);
      if (targetProd) {
        addToCart(targetProd);
      }
      if (onClearInitialProduct) {
        onClearInitialProduct();
      }
    }
  }, [initialProductId]);

  const updateCartQty = (itemKey: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (getCartItemKey(item) === itemKey) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const setCartExactQty = (itemKey: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCart(
      cart.map((item) => (getCartItemKey(item) === itemKey ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (itemKey: string) => {
    setCart(cart.filter((item) => getCartItemKey(item) !== itemKey));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Pricing calculations for cart
  const computedItems: OrderItem[] = useMemo(() => {
    const isWholesale = channel === 'wholesale';

    return cart.map((item) => {
      // If item has a specific variation, compute pricing from the variation
      if (item.variation) {
        const basePrice = isWholesale
          ? (item.variation.wholesalePrice ?? item.variation.retailPrice)
          : item.variation.retailPrice;
        const costPrice = item.variation.costPrice ?? item.product.costPrice;
        const discount = item.customDiscountPercent || 0;
        const unitPrice = Number((basePrice * (1 - discount / 100)).toFixed(2));
        const subtotal = Number((unitPrice * item.quantity).toFixed(2));
        const totalCost = Number((costPrice * item.quantity).toFixed(2));

        return {
          productId: item.product.id,
          sku: item.variation.sku || item.product.sku,
          name: `${item.product.name} (${item.variation.name})`,
          variationId: item.variation.id,
          variationName: item.variation.name,
          quantity: item.quantity,
          unitCost: costPrice,
          unitPrice,
          originalPrice: basePrice,
          appliedTierName: discount > 0 ? `${discount}% Discount` : undefined,
          subtotal,
          totalCost
        };
      }

      // Standard base product pricing
      const priceInfo = dbStore.calculateProductPrice(
        item.product.id,
        item.quantity,
        isWholesale,
        item.customDiscountPercent
      );

      const subtotal = Number((priceInfo.unitPrice * item.quantity).toFixed(2));
      const totalCost = Number((item.product.costPrice * item.quantity).toFixed(2));

      return {
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unitCost: item.product.costPrice,
        unitPrice: priceInfo.unitPrice,
        originalPrice: priceInfo.originalPrice,
        appliedTierName: priceInfo.tierName,
        subtotal,
        totalCost
      };
    });
  }, [cart, channel, currentCustomer]);

  const subtotal = useMemo(() => {
    return Number(computedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  }, [computedItems]);

  const originalTotal = useMemo(() => {
    return Number(
      computedItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0).toFixed(2)
    );
  }, [computedItems]);

  const discountSavings = useMemo(() => {
    return Math.max(0, Number((originalTotal - subtotal).toFixed(2)));
  }, [originalTotal, subtotal]);

  // Tax calculation: exempt if wholesale with verified resale cert; 7.5% Nigerian VAT
  const taxRate = channel === 'wholesale' && currentCustomer?.resaleCertVerified ? 0 : 0.075;
  const taxTotal = useMemo(() => {
    return Number((subtotal * taxRate).toFixed(2));
  }, [subtotal, taxRate]);

  const grandTotal = useMemo(() => {
    return Number((subtotal + taxTotal).toFixed(2));
  }, [subtotal, taxTotal]);

  const costTotal = useMemo(() => {
    return Number(computedItems.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2));
  }, [computedItems]);

  // Checkout execution
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    let paymentStatus: PaymentStatus = 'paid';
    if (channel === 'wholesale' && paymentMethod === 'net_terms_invoice') {
      paymentStatus = 'pending_net30';
    }

    const cashTendered =
      paymentMethod === 'cash' ? parseFloat(cashTenderedInput) || grandTotal : undefined;
    const cashChange =
      cashTendered !== undefined ? Math.max(0, cashTendered - grandTotal) : undefined;

    const loc = dbState.locations.find((l) => l.id === selectedLocationId);

    const activeInputer = dbState.inputers?.find(
      (i) => i.staffCode === selectedInputerCode || i.id === selectedInputerCode
    );

    const order = dbStore.processOrder({
      channel,
      locationId: selectedLocationId,
      locationName: loc ? loc.name : selectedLocationId,
      customerId: currentCustomer ? currentCustomer.id : 'cust_walkin_retail',
      customerName: currentCustomer ? currentCustomer.name : 'Walk-in Retail Customer',
      customerCompany: currentCustomer?.companyName,
      customerTaxId: currentCustomer?.taxId,
      items: computedItems,
      subtotal,
      discountTotal: discountSavings,
      taxTotal,
      grandTotal,
      costTotal,
      paymentMethod,
      paymentStatus,
      cashTendered,
      cashChange,
      cashier: activeInputer
        ? `${activeInputer.name} (${activeInputer.staffCode})`
        : channel === 'wholesale'
        ? 'B2B Sales Representative'
        : 'Terminal Register 1',
      inputerId: activeInputer?.staffCode,
      inputerName: activeInputer?.name,
      receiptPrinted: true,
      notes: orderNotes,
      bankAccountId: paymentMethod === 'bank_transfer' ? defaultBank?.id : undefined,
      bankName: paymentMethod === 'bank_transfer' ? defaultBank?.bankName : undefined,
      bankTransactionRef:
        paymentMethod === 'bank_transfer'
          ? generatedBankRef || `NIP-TX-${Math.floor(10000 + Math.random() * 90000)}`
          : undefined,
      nipSessionId: paymentMethod === 'bank_transfer' ? nipSessionId || generateNipSessionId(defaultBank?.cbnBankCode || '50515') : undefined,
      posRrn: paymentMethod === 'credit_card' ? posRrn || generatePosRrn() : undefined,
      posCardScheme: paymentMethod === 'credit_card' ? cardScheme : undefined,
      bankVerified: paymentMethod === 'bank_transfer',
      bankVerifiedAt: paymentMethod === 'bank_transfer' ? new Date().toISOString() : undefined,
      supervisedBy:
        isSupervised && (branchManagers.find((m) => m.staffCode === selectedSupervisorCode) || defaultBranchManager)
          ? `${(branchManagers.find((m) => m.staffCode === selectedSupervisorCode) || defaultBranchManager)?.name} (${(branchManagers.find((m) => m.staffCode === selectedSupervisorCode) || defaultBranchManager)?.staffCode})`
          : undefined,
      supervisedAt: isSupervised ? new Date().toISOString() : undefined,
      supervisorNotes: isSupervised ? supervisorNotes.trim() : undefined
    });

    setCompletedOrder(order);
    setShowCheckoutModal(false);
    clearCart();
    setCashTenderedInput('');
    setOrderNotes('');
    setBankVerifiedDone(false);
    setGeneratedBankRef('');
    setNipSessionId('');
    setPosRrn('');
    setIsSupervised(false);
    setSupervisorNotes('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-61px)] overflow-hidden bg-slate-950">
      {/* LEFT: Product Catalog & Controls */}
      <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
        {/* Top Channel and Location Control Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
          {/* Segmented Channel Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => handleChannelSwitch('retail')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                channel === 'retail'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Retail Counter POS
            </button>
            <button
              onClick={() => handleChannelSwitch('wholesale')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                channel === 'wholesale'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wholesale B2B Order Desk
            </button>
          </div>

          {/* Location and Inputer Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Location:</span>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  dbStore.setActiveLocationId(e.target.value);
                }}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded focus:outline-hidden focus:border-emerald-500"
              >
                {dbState.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">POS Inputer:</span>
              <select
                value={selectedInputerCode}
                onChange={(e) => setSelectedInputerCode(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 rounded focus:outline-hidden focus:border-cyan-400"
              >
                {(dbState.inputers || []).map((inp) => (
                  <option key={inp.id} value={inp.staffCode}>
                    {inp.staffCode} - {inp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search products you sell by title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setShowCategoryModal(true)}
              title="Manage or remove default / custom categories"
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0 border border-slate-800"
            >
              <Tag className="w-3 h-3" />
              <span>Manage</span>
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 content-start">
          {filteredProducts.map((prod) => {
            const stockAtLoc = dbStore.getProductStock(prod.id, selectedLocationId);
            const isLowStock = stockAtLoc <= prod.reorderThreshold && stockAtLoc > 0;
            const isOutOfStock = stockAtLoc <= 0;

            const hasVariants = Boolean(prod.hasVariations && prod.variations && prod.variations.length > 0);
            const variantPrices = hasVariants
              ? prod.variations!.map((v) =>
                  channel === 'wholesale' ? (v.wholesalePrice ?? v.retailPrice) : v.retailPrice
                )
              : [];
            const minVarPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
            const maxVarPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;
            const displayPrice = channel === 'wholesale' ? prod.wholesaleBasePrice : prod.retailPrice;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod)}
                className={`flex flex-col bg-slate-900 border border-slate-800 rounded-lg p-3 cursor-pointer transition-all hover:border-slate-700 hover:shadow-md ${
                  isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'
                }`}
              >
                {/* Product Image or Fallback */}
                <div className="relative w-full aspect-4/3 bg-slate-800 rounded overflow-hidden mb-2.5 flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none -z-0">
                    <Package className="w-8 h-8 opacity-40 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono">{prod.sku}</span>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-slate-950/80 backdrop-blur-xs text-slate-300">
                    {isOutOfStock ? (
                      <span className="text-rose-400 font-medium">Sold Out</span>
                    ) : isLowStock ? (
                      <span className="text-amber-400">{stockAtLoc} low</span>
                    ) : (
                      <span>{stockAtLoc} in stock</span>
                    )}
                  </div>

                  {/* Variation indicator badge on image */}
                  {hasVariants && (
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono tracking-tight bg-slate-950/90 text-emerald-300 border border-emerald-500/40 shadow-xs backdrop-blur-xs flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{prod.variations!.length} OPTIONS</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-100 line-clamp-1">{prod.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px] font-mono text-slate-400">{prod.sku}</p>
                      {hasVariants && (
                        <span className="text-[10px] text-indigo-400 font-medium truncate">
                          · {prod.variationType || 'Multi-size'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      {hasVariants ? (
                        <div>
                          <p className="text-xs font-bold font-mono text-emerald-400 tabular-nums">
                            {minVarPrice === maxVarPrice
                              ? formatNaira(minVarPrice)
                              : `${formatNaira(minVarPrice)} - ${formatNaira(maxVarPrice)}`}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-mono">Tap to select option</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold font-mono text-emerald-400 tabular-nums">
                            {formatNaira(displayPrice)}
                          </p>
                          {channel === 'wholesale' && (
                            <p className="text-[10px] text-slate-400">MOQ: {prod.minWholesaleQty} units</p>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        hasVariants
                          ? 'bg-emerald-500/15 hover:bg-emerald-400 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 shadow-xs'
                          : 'bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 text-slate-300'
                      }`}
                      title={hasVariants ? 'Choose option' : 'Add to cart'}
                    >
                      {hasVariants ? <Layers className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Transaction Cart & Checkout Register */}
      <div className="w-full lg:w-[420px] flex flex-col bg-slate-900 border-l border-slate-800">
        {/* Customer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{channel === 'wholesale' ? 'B2B Wholesale Account' : 'Customer Profile'}</span>
            </div>
            {currentCustomer?.resaleCertVerified && (
              <span className="text-[11px] text-emerald-400 font-mono font-medium">
                Tax-Exempt Reseller
              </span>
            )}
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded focus:outline-hidden focus:border-emerald-500"
          >
            {availableCustomers.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.companyName ? `${cust.companyName} (${cust.name})` : cust.name}
              </option>
            ))}
          </select>

          {/* Wholesale account credit terms banner */}
          {channel === 'wholesale' && currentCustomer && (
            <div className="mt-2 text-xs text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Credit Terms:</span>
                <span className="text-slate-200 uppercase font-semibold">
                  {currentCustomer.paymentTerms}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Available Credit:</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {formatNaira(Math.max(0, currentCustomer.creditLimit - currentCustomer.outstandingBalance))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-xs">Register cart is empty</p>
              <p className="text-[11px] text-slate-400 text-center max-w-[200px]">
                Click any product on the left or scan a barcode to begin checkout.
              </p>
            </div>
          ) : (
            computedItems.map((item) => {
              const itemKey = item.variationId ? `${item.productId}__${item.variationId}` : item.productId;
              return (
                <div
                  key={itemKey}
                  className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-200 leading-tight">{item.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] font-mono text-slate-400">{item.sku}</span>
                        {item.variationName && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Layers className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{item.variationName}</span>
                          </span>
                        )}
                      </div>
                      {item.appliedTierName && (
                        <p className="text-[10px] text-emerald-400 font-sans mt-0.5">
                          Tier: {item.appliedTierName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(itemKey)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                      <button
                        onClick={() => updateCartQty(itemKey, -1)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => setCartExactQty(itemKey, parseInt(e.target.value, 10) || 1)}
                        className="w-10 text-center text-xs font-mono font-medium text-slate-200 bg-transparent focus:outline-hidden"
                      />
                      <button
                        onClick={() => updateCartQty(itemKey, 1)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Pricing info */}
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-slate-100 tabular-nums">
                        {formatNaira(item.subtotal)}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {formatNaira(item.unitPrice)} / unit
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Financial Summary & Checkout Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal:</span>
            <span className="tabular-nums text-slate-200">{formatNaira(subtotal)}</span>
          </div>

          {discountSavings > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Volume Discount Savings:</span>
              <span className="tabular-nums">-{formatNaira(discountSavings)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-400">
            <span>Sales Tax / VAT {channel === 'wholesale' && taxRate === 0 ? '(B2B Exempt)' : '(7.5%)'}:</span>
            <span className="tabular-nums text-slate-200">{formatNaira(taxTotal)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
            <span>TOTAL DUE:</span>
            <span className="tabular-nums text-emerald-400">{formatNaira(grandTotal)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded transition-colors whitespace-nowrap"
            >
              Clear
            </button>
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded shadow-sm transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Payment Dialog */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4 text-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Payment Tender · {channel === 'wholesale' ? 'B2B Settlement' : 'POS Register'}
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="p-3.5 bg-slate-950 rounded-xl text-center border border-slate-800">
              <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Grand Total Due</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {formatNaira(grandTotal)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Select Nigerian Payment Channel:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('bank_transfer');
                    if (!generatedBankRef) {
                      setGeneratedBankRef(`NIP-TX-${Math.floor(10000 + Math.random() * 90000)}`);
                    }
                    if (!nipSessionId) {
                      setNipSessionId(generateNipSessionId(defaultBank?.cbnBankCode || '50515'));
                    }
                  }}
                  className={`flex items-center gap-2 p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-slate-800 border-emerald-500 text-white font-semibold shadow-xs'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <div className="text-left leading-tight">
                    <span className="block font-bold">NIP Bank Transfer</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Auto-Verify</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit_card');
                    if (!posRrn) {
                      setPosRrn(generatePosRrn());
                    }
                  }}
                  className={`flex items-center gap-2 p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'bg-slate-800 border-emerald-500 text-white font-semibold shadow-xs'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <div className="text-left leading-tight">
                    <span className="block font-bold">POS Terminal</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Verve / Card</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-2 p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-slate-800 border-emerald-500 text-white font-semibold shadow-xs'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <div className="text-left leading-tight">
                    <span className="block font-bold">Cash Drawer</span>
                    <span className="text-[10px] text-amber-400 font-mono">₦ Naira</span>
                  </div>
                </button>

                {channel === 'wholesale' ? (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('net_terms_invoice')}
                    className={`flex items-center gap-2 p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      paymentMethod === 'net_terms_invoice'
                        ? 'bg-slate-800 border-blue-500 text-white font-semibold shadow-xs'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-blue-400" />
                    <div className="text-left leading-tight">
                      <span className="block font-bold">Net 30 Terms</span>
                      <span className="text-[10px] text-blue-400 font-mono">B2B Invoice</span>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('wire_transfer');
                      if (!generatedBankRef) {
                        setGeneratedBankRef(`NIP-TX-${Math.floor(10000 + Math.random() * 90000)}`);
                      }
                    }}
                    className={`flex items-center gap-2 p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      paymentMethod === 'wire_transfer'
                        ? 'bg-slate-800 border-blue-500 text-white font-semibold shadow-xs'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Building className="w-4 h-4 text-blue-400" />
                    <div className="text-left leading-tight">
                      <span className="block font-bold">Corporate Wire</span>
                      <span className="text-[10px] text-blue-400 font-mono">RTGS / Clearing</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Nigerian NIP Bank Transfer Panel */}
            {(paymentMethod === 'bank_transfer' || paymentMethod === 'wire_transfer') && (
              <div className="space-y-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Merchant Nigerian Bank Account
                    </span>
                    <span className="font-bold text-white text-xs block">
                      {defaultBank?.bankName || 'Moniepoint MFB'}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold text-sm block tracking-wider">
                      NUBAN: {defaultBank?.accountNumber || '8123456789'}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                      {defaultBank?.accountName || 'OmniStock Enterprises Nig Ltd'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 block">
                      REF: {generatedBankRef || 'NIP-TX-PENDING'}
                    </span>
                    {defaultBank?.ussdCode && (
                      <span className="text-[10px] font-mono text-cyan-300 block mt-1">
                        Dial: {defaultBank.ussdCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* USSD Quick dial helper */}
                {defaultBank && (
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Customer USSD String:</span>
                    </span>
                    <span className="font-mono text-cyan-300 font-bold select-all">
                      {buildUssdTransferString(defaultBank.bankName, defaultBank.accountNumber, grandTotal)}
                    </span>
                  </div>
                )}

                {bankVerifiedDone ? (
                  <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl flex items-center justify-between text-emerald-300 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold block">PAYMENT AUTO-VERIFIED & DONE</span>
                        <span className="text-[10px] text-emerald-400">NIBSS NIP Session: {nipSessionId || '99900126102814321098'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700">
                      CLEARED
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={bankAutoVerifying}
                    onClick={() => {
                      setBankAutoVerifying(true);
                      setTimeout(() => {
                        setBankAutoVerifying(false);
                        setBankVerifiedDone(true);
                      }, 900);
                    }}
                    className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {bankAutoVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Querying NIBSS NIP Network & Verifying Transfer...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Auto-Verify NIP Transfer ({formatNaira(grandTotal)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* POS Card Terminal Panel */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      POS Terminal Station
                    </span>
                    <span className="font-bold text-white text-xs">
                      {defaultBank?.bankName || 'Moniepoint'} Smart POS
                    </span>
                    <span className="text-[11px] font-mono text-amber-300 block">
                      TID: {defaultBank?.posTerminalId || '2034MN88'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {(['verve', 'mastercard', 'visa'] as const).map((scheme) => (
                      <button
                        key={scheme}
                        type="button"
                        onClick={() => setCardScheme(scheme)}
                        className={`px-2 py-1 text-[10px] font-mono uppercase rounded-md border transition-colors ${
                          cardScheme === scheme
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {scheme}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Card Retrieval Ref (RRN):</span>
                  <span className="font-mono text-cyan-300 font-semibold">{posRrn || '629807184201'}</span>
                </div>
              </div>
            )}

            {/* Cash Drawer Calculator */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cash Received (₦):</span>
                  <input
                    type="number"
                    step="50"
                    placeholder={`e.g. ${grandTotal.toFixed(0)}`}
                    value={cashTenderedInput}
                    onChange={(e) => setCashTenderedInput(e.target.value)}
                    className="w-32 px-2 py-1 text-right font-mono bg-slate-900 border border-slate-700 text-slate-100 rounded-lg focus:outline-hidden"
                  />
                </div>
                {/* Nigerian Cash Denominations Quick Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[1000, 5000, 10000, 20000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTenderedInput(amt.toString())}
                      className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 cursor-pointer"
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTenderedInput(grandTotal.toString())}
                    className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded-md text-emerald-400 cursor-pointer"
                  >
                    Exact
                  </button>
                </div>
                {parseFloat(cashTenderedInput) > 0 && (
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-emerald-400 font-bold font-mono">
                    <span>Change Due:</span>
                    <span>
                      {formatNaira(Math.max(0, (parseFloat(cashTenderedInput) || 0) - grandTotal))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Branch Manager Supervision Option */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSupervised}
                    onChange={(e) => setIsSupervised(e.target.checked)}
                    className="rounded text-emerald-400 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Branch Manager Supervision</span>
                  </span>
                </label>
                {isSupervised && (
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Supervised Sale
                  </span>
                )}
              </div>

              {isSupervised && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Supervisor on Duty:</label>
                    <select
                      value={selectedSupervisorCode || defaultBranchManager?.staffCode}
                      onChange={(e) => setSelectedSupervisorCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {branchManagers.map((m) => (
                        <option key={m.id} value={m.staffCode}>
                          {m.name} ({m.staffCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Supervisor Sign-off Note:</label>
                    <input
                      type="text"
                      placeholder="e.g. Authorized register sale & verified payment"
                      value={supervisorNotes}
                      onChange={(e) => setSupervisorNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Transaction Notes / PO #:</label>
              <input
                type="text"
                placeholder="Optional PO number or cashier notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow-sm transition-colors"
              >
                Complete Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Variation Selector Modal */}
      {variationSelectingProduct && (
        <ProductVariationSelectorModal
          product={variationSelectingProduct}
          channel={channel}
          onSelectVariation={(prod, variation, qty) => {
            addToCart(prod, variation, qty);
            setVariationSelectingProduct(null);
          }}
          onClose={() => setVariationSelectingProduct(null)}
        />
      )}

      {/* Completed Receipt / Invoice Modal */}
      {completedOrder && (
        <ReceiptModal order={completedOrder} onClose={() => setCompletedOrder(null)} />
      )}

      {/* Category Management Modal (Remove Default/Custom Categories) */}
      {showCategoryModal && (
        <CategoryManagementModal
          dbState={dbState}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
    </div>
  );
};
