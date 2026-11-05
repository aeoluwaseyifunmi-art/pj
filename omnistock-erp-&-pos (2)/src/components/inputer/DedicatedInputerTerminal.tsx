import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Inputer, Product, Customer, Order, Location, PaymentMethod, InputerRole, AppRole, normalizeAppRole, getRoleLanding, ROLE_DEFINITIONS } from '../../types/database';
import { dbStore } from '../../db/databaseStore';
import { ReceiptModal } from '../pos/ReceiptModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { formatNaira } from '../../utils/nigerianBanks';
import {
  Printer,
  Search,
  Plus,
  Minus,
  Trash2,
  Lock,
  LogOut,
  DollarSign,
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  History,
  KeyRound,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  Layers,
  Landmark,
  Users,
  Package,
  FileCheck,
  Eye,
  Check
} from 'lucide-react';

interface DedicatedInputerTerminalProps {
  initialStaffCode?: string;
  onExitToAdmin?: (targetRole?: AppRole) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const DedicatedInputerTerminal: React.FC<DedicatedInputerTerminalProps> = ({
  initialStaffCode,
  onExitToAdmin
}) => {
  // Inputer Authentication state
  const [currentInputer, setCurrentInputer] = useState<Inputer | null>(null);
  const [inputerStaffCode, setInputerStaffCode] = useState(initialStaffCode || 'INP-01');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Terminal Catalog & Sales state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart & POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_walkin_retail');
  const [channel, setChannel] = useState<'retail' | 'wholesale'>('retail');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);

  // Active Receipt Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Manager Terminal Mode & Operations
  const [terminalView, setTerminalView] = useState<'manager_ops' | 'cashier_pos'>('manager_ops');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Inputer | null>(null);
  const [staffForm, setStaffForm] = useState({
    staffCode: '',
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'retail_inputer' as InputerRole,
    status: 'active' as 'active' | 'suspended'
  });

  const [adjustingProduct, setAdjustingProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
  } | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Periodic Branch Cycle Count');

  const loadData = () => {
    const state = dbStore.getState();
    setProducts([...state.products]);
    setCustomers([...state.customers]);
    setLocations([...state.locations]);

    // If an inputer is authenticated, reload their latest record and orders
    if (currentInputer) {
      const refreshed = dbStore.getInputerById(currentInputer.id);
      if (refreshed) {
        setCurrentInputer(refreshed);
      }
      const myOrders = state.orders.filter(
        (o) => o.inputerId === currentInputer.id || o.cashier.includes(currentInputer.name)
      );
      setRecentOrders(myOrders);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbStore.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [currentInputer?.id]);

  // Attempt auto-login if initialStaffCode passed and already in session
  useEffect(() => {
    if (initialStaffCode) {
      setInputerStaffCode(initialStaffCode);
      const staff = dbStore.getInputerByStaffCode(initialStaffCode);
      if (staff) {
        const normRole = normalizeAppRole(staff.role);
        if (normRole !== 'cashier') {
          // Non-cashier staff from the terminal link must go direct to their page
          dbStore.setCurrentUserRole(normRole);
          if (onExitToAdmin) {
            onExitToAdmin(normRole);
            return;
          }
        }
      }

      const sessionStaff = sessionStorage.getItem(`omnistock_inputer_${initialStaffCode}`);
      if (sessionStaff) {
        try {
          const parsed = JSON.parse(sessionStaff);
          const verified = dbStore.getInputerById(parsed.id);
          if (verified && verified.status === 'active') {
            const normRole = normalizeAppRole(verified.role);
            if (normRole !== 'cashier') {
              dbStore.setCurrentUserRole(normRole);
              if (onExitToAdmin) {
                onExitToAdmin(normRole);
                return;
              }
            }
            setCurrentInputer(verified);
            const isMgr = verified.role === 'branch_manager' || verified.role === 'shift_supervisor';
            setTerminalView(isMgr ? 'manager_ops' : 'cashier_pos');
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [initialStaffCode, onExitToAdmin]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const res = dbStore.authenticateInputer(inputerStaffCode, pinInput);
    if (res.success && res.inputer) {
      const staffRole = normalizeAppRole(res.inputer.role);
      sessionStorage.setItem(`omnistock_inputer_${res.inputer.staffCode}`, JSON.stringify(res.inputer));

      // Anytime non-cashier staff logs on to their terminal it should be their own landing page not pos terminal
      if (staffRole !== 'cashier') {
        dbStore.setCurrentUserRole(staffRole);
        if (onExitToAdmin) {
          onExitToAdmin(staffRole);
          return;
        }
      }

      setCurrentInputer(res.inputer);
      setPinInput('');
      const isMgr = res.inputer.role === 'branch_manager' || res.inputer.role === 'shift_supervisor';
      setTerminalView(isMgr ? 'manager_ops' : 'cashier_pos');
      if (!isMgr) {
        setTimeout(() => barcodeInputRef.current?.focus(), 150);
      }
    } else {
      setAuthError(res.message);
    }
  };

  const handleLogout = () => {
    if (currentInputer) {
      sessionStorage.removeItem(`omnistock_inputer_${currentInputer.staffCode}`);
    }
    setCurrentInputer(null);
    setCart([]);
    setPinInput('');
  };

  const activeLocation = useMemo(() => {
    if (!currentInputer) return locations[0];
    return locations.find((l) => l.id === currentInputer.assignedLocationId) || locations[0];
  }, [currentInputer, locations]);

  const isManager = Boolean(
    currentInputer &&
    (currentInputer.role === 'branch_manager' || currentInputer.role === 'shift_supervisor')
  );

  const branchCashiers = useMemo(() => {
    if (!activeLocation) return [];
    return dbStore.getInputers().filter(
      (i) => i.assignedLocationId === activeLocation.id && i.role !== 'branch_manager' && i.role !== 'shift_supervisor'
    );
  }, [activeLocation, dbStore.getState().inputers]);

  const branchOrders = useMemo(() => {
    if (!activeLocation) return [];
    return dbStore.getState().orders.filter((o) => o.locationId === activeLocation.id);
  }, [activeLocation, dbStore.getState().orders]);

  // Manager Handlers
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    const count = branchCashiers.length + 1;
    const nextCode = `CSH-${count < 10 ? '0' + count : count}`;
    setStaffForm({
      staffCode: nextCode,
      name: '',
      email: '',
      phone: '+234 ',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      role: 'retail_inputer',
      status: 'active'
    });
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = (staff: Inputer) => {
    setEditingStaff(staff);
    setStaffForm({
      staffCode: staff.staffCode,
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      pin: staff.pin,
      role: (staff.role as InputerRole) || 'retail_inputer',
      status: staff.status
    });
    setShowAddStaffModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.staffCode.trim() || !staffForm.pin.trim()) {
      alert('Please fill out Name, Staff Code, and PIN.');
      return;
    }
    if (editingStaff) {
      dbStore.updateInputer(editingStaff.id, {
        staffCode: staffForm.staffCode.toUpperCase().trim(),
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        pin: staffForm.pin.trim(),
        role: staffForm.role,
        status: staffForm.status
      });
      setNotification(`Updated staff ${staffForm.name} (${staffForm.staffCode})`);
    } else {
      dbStore.addInputer({
        staffCode: staffForm.staffCode.toUpperCase().trim(),
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        pin: staffForm.pin.trim(),
        role: staffForm.role,
        assignedLocationId: activeLocation.id,
        status: staffForm.status
      });
      setNotification(`Added new staff member ${staffForm.name} under ${activeLocation.name}`);
    }
    setShowAddStaffModal(false);
    loadData();
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleStaffStatus = (staff: Inputer) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    dbStore.updateInputer(staff.id, { status: newStatus });
    setNotification(`Set ${staff.name} to ${newStatus}`);
    loadData();
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteStaff = (staff: Inputer) => {
    if (window.confirm(`Remove staff ${staff.name} (${staff.staffCode}) from this branch?`)) {
      dbStore.deleteInputer(staff.id);
      setShowAddStaffModal(false);
      setNotification(`Removed staff ${staff.name}`);
      loadData();
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || !currentInputer) return;
    dbStore.adjustStock(
      adjustingProduct.id,
      activeLocation.id,
      adjustNewStock,
      adjustReason,
      `${currentInputer.name} (${currentInputer.staffCode})`
    );
    setNotification(`Adjusted ${adjustingProduct.name} stock to ${adjustNewStock} units at ${activeLocation.name}`);
    setAdjustingProduct(null);
    loadData();
    setTimeout(() => setNotification(null), 3500);
  };

  const handleVerifyDrawer = () => {
    if (!currentInputer) return;
    dbStore.recordInputerActivity({
      inputerId: currentInputer.staffCode,
      inputerName: currentInputer.name,
      actionType: 'shift_supervised',
      title: 'Till Drawer Balancing Sign-off',
      description: `Manager drawer balancing sign-off for ${activeLocation.name}: Drawer float and cash intake verified balanced.`,
      locationId: activeLocation.id,
      locationName: activeLocation.name
    });
    setNotification(`✓ Drawer verified and signed off for ${activeLocation.name} by ${currentInputer.name}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAuthorizeOrder = (order: Order) => {
    if (!currentInputer) return;
    dbStore.superviseOrder(
      order.id,
      `${currentInputer.name} (${currentInputer.staffCode})`,
      'Approved via Branch Manager Terminal'
    );
    setNotification(`✓ Authorized Order ${order.orderNumber}`);
    loadData();
    setTimeout(() => setNotification(null), 3000);
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat = selectedCategory === 'all' || prod.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        prod.barcode.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add product to Cart
  const handleAddToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const newQty = existing ? existing.quantity + 1 : 1;

    // Check stock
    const locId = activeLocation ? activeLocation.id : undefined;
    const available = dbStore.getProductStock(product.id, locId);
    if (newQty > available) {
      setNotification(`Warning: Stock for ${product.name} at ${activeLocation?.name || 'store'} is only ${available}.`);
      setTimeout(() => setNotification(null), 3500);
    }

    const priceInfo = dbStore.calculateProductPrice(product.id, newQty, channel === 'wholesale');

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, unitPrice: priceInfo.unitPrice, discountPercent: priceInfo.discountPercent }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: priceInfo.unitPrice,
          discountPercent: priceInfo.discountPercent
        }
      ]);
    }
  };

  // Adjust Cart Quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            const priceInfo = dbStore.calculateProductPrice(item.product.id, nextQty, channel === 'wholesale');
            return {
              ...item,
              quantity: nextQty,
              unitPrice: priceInfo.unitPrice,
              discountPercent: priceInfo.discountPercent
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode / SKU scan submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === searchQuery.trim().toLowerCase() ||
        p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (matched) {
      handleAddToCart(matched);
      setSearchQuery('');
      setNotification(`Added "${matched.name}" via scan!`);
      setTimeout(() => setNotification(null), 2000);
    }
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.product.retailPrice, 0);
  const cartGrandTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const cartDiscount = cartSubtotal - cartGrandTotal;
  const taxAmount = channel === 'retail' ? cartGrandTotal * 0.075 : 0; // 7.5% retail tax
  const finalPayable = cartGrandTotal + taxAmount;

  const numericCashTendered = parseFloat(cashTendered) || 0;
  const cashChange = numericCashTendered > finalPayable ? numericCashTendered - finalPayable : 0;

  // Process and Print Receipt
  const handleCompleteOrder = () => {
    if (!currentInputer) return;
    if (cart.length === 0) {
      alert('Cart is empty. Add items to print a receipt.');
      return;
    }

    const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

    const orderPayload = {
      channel,
      status: 'completed' as const,
      locationId: activeLocation.id,
      locationName: activeLocation.name,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerCompany: currentCustomer.companyName,
      customerTaxId: currentCustomer.taxId,
      items: cart.map((item) => ({
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unitCost: item.product.costPrice,
        unitPrice: item.unitPrice,
        originalPrice: channel === 'wholesale' ? item.product.wholesaleBasePrice : item.product.retailPrice,
        subtotal: item.quantity * item.unitPrice,
        totalCost: item.quantity * item.product.costPrice
      })),
      subtotal: cartSubtotal,
      discountTotal: cartDiscount,
      taxTotal: taxAmount,
      grandTotal: finalPayable,
      costTotal: cart.reduce((sum, i) => sum + i.quantity * i.product.costPrice, 0),
      paymentMethod,
      paymentStatus: (channel === 'wholesale' && paymentMethod === 'net_terms_invoice'
        ? 'pending_net30'
        : 'paid') as any,
      cashTendered: paymentMethod === 'cash' ? numericCashTendered : undefined,
      cashChange: paymentMethod === 'cash' ? cashChange : undefined,
      cashier: `${currentInputer.name} (${currentInputer.staffCode})`,
      inputerId: currentInputer.staffCode,
      inputerName: currentInputer.name,
      supervisedBy:
        currentInputer.role === 'branch_manager' || currentInputer.role === 'shift_supervisor'
          ? `${currentInputer.name} (${currentInputer.staffCode})`
          : undefined,
      supervisedAt:
        currentInputer.role === 'branch_manager' || currentInputer.role === 'shift_supervisor'
          ? new Date().toISOString()
          : undefined,
      supervisorNotes:
        currentInputer.role === 'branch_manager' || currentInputer.role === 'shift_supervisor'
          ? 'Direct Branch Manager Transaction'
          : undefined,
      receiptPrinted: autoPrintReceipt,
      notes: `Inputer POS Terminal entry at ${activeLocation.name}`
    };

    const createdOrder = dbStore.processOrder(orderPayload);

    // Auto open receipt modal & trigger print
    setActiveReceiptOrder(createdOrder);

    // Reset Cart
    setCart([]);
    setCashTendered('');
    setNotification(`Order ${createdOrder.orderNumber} completed & receipt registered!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // If NOT Logged In: Show Clean POS Lockscreen
  if (!currentInputer) {
    const allInputers = dbStore.getInputers();
    const selectedStaffObj = allInputers.find((inp) => inp.staffCode === inputerStaffCode);
    const selectedStaffRoleNorm = selectedStaffObj ? normalizeAppRole(selectedStaffObj.role) : 'cashier';
    const selectedStaffLanding = getRoleLanding(selectedStaffRoleNorm);

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="terminal" showLabel={true} />
        </div>
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-cyan-950 text-cyan-400 border border-cyan-800/80 rounded-xl mx-auto flex items-center justify-center shadow-inner">
              <Printer className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Terminal Authentication</h1>
            <p className="text-xs text-slate-400">
              High-Speed Operational Data Entry & Role Landing Gateway
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-md">
              {authError}
            </div>
          )}

          {/* Role Landing Destination Indicator */}
          {selectedStaffRoleNorm !== 'cashier' && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-semibold font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ROLE: {ROLE_DEFINITIONS[selectedStaffRoleNorm]?.name} ({ROLE_DEFINITIONS[selectedStaffRoleNorm]?.badge})</span>
              </div>
              <div className="text-white font-medium text-xs">
                Redirect Destination: <strong className="text-cyan-300">{selectedStaffLanding.terminalName}</strong>
              </div>
              <div className="text-slate-400 text-[10px]">
                Upon unlocking, you are routed directly to your designated terminal instead of the cashier POS register.
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Staff Inputer / Code
              </label>
              <select
                value={inputerStaffCode}
                onChange={(e) => setInputerStaffCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                {allInputers.map((inp) => (
                  <option key={inp.id} value={inp.staffCode}>
                    {inp.staffCode} — {inp.name} ({inp.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                4-Digit Security PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-base font-mono tracking-widest text-amber-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Default PINs: Alexander (1234), Jordan (2468), Chloe (9876), Manager (5555)</p>
            </div>

            {/* Quick PIN Numpad buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, '←'].map((key) => (
                <button
                  type="button"
                  key={key.toString()}
                  onClick={() => {
                    if (key === 'Clear') setPinInput('');
                    else if (key === '←') setPinInput((p) => p.slice(0, -1));
                    else if (pinInput.length < 6) setPinInput((p) => p + key.toString());
                  }}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-mono font-medium text-slate-200 rounded transition-colors cursor-pointer"
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>{selectedStaffRoleNorm === 'cashier' ? 'Unlock POS Terminal' : `Unlock & Enter ${selectedStaffLanding.terminalName}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Staff Terminal Portal</span>
            {onExitToAdmin && (
              <button
                onClick={() => onExitToAdmin(selectedStaffRoleNorm !== 'cashier' ? selectedStaffRoleNorm : undefined)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium"
              >
                Go to {selectedStaffRoleNorm !== 'cashier' ? selectedStaffLanding.terminalName : 'Admin Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN: Dedicated POS & Receipt Printing Terminal
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Terminal Top Nav */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 border rounded flex items-center justify-center ${
              isManager
                ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                : 'bg-cyan-950 border-cyan-800 text-cyan-400'
            }`}
          >
            {isManager ? <ShieldCheck className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">
                {isManager ? 'BRANCH MANAGER CONTROL CONSOLE' : 'INPUTER WEB TERMINAL'}
              </span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded font-semibold border ${
                  isManager
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                    : 'bg-cyan-950 border-cyan-800 text-cyan-400'
                }`}
              >
                {currentInputer.staffCode}
              </span>
              {isManager && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Manager In Command
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-300 font-medium">{currentInputer.name}</span>
              <span>·</span>
              <span className="text-slate-400">{activeLocation.name}</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher for Branch Managers */}
        {isManager && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setTerminalView('manager_ops')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                terminalView === 'manager_ops'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏢 Branch Ops
            </button>
            <button
              onClick={() => setTerminalView('cashier_pos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                terminalView === 'cashier_pos'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛒 Register POS
            </button>
          </div>
        )}

        {/* Shift KPIs */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {isManager ? (
            <>
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Cashiers:</span>
                <span className="text-white font-bold">{branchCashiers.length}</span>
              </div>

              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Branch Rev:</span>
                <span className="text-emerald-400 font-bold">
                  {formatNaira(branchOrders.reduce((s, o) => s + (o.grandTotal || 0), 0))}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Printed:</span>
                <span className="text-white font-bold">{currentInputer.receiptsPrintedCount}</span>
              </div>

              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Volume:</span>
                <span className="text-emerald-400 font-bold">
                  {formatNaira(currentInputer.totalSalesVolume)}
                </span>
              </div>
            </>
          )}

          {/* Action buttons */}
          <ThemeToggle variant="terminal" showLabel={true} />

          <button
            onClick={handleLogout}
            title="Lock terminal / Switch cashier"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Station</span>
          </button>

          {onExitToAdmin && (
            <button
              onClick={() => onExitToAdmin(currentInputer ? normalizeAppRole(currentInputer.role) : undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-700 rounded font-sans text-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {currentInputer && normalizeAppRole(currentInputer.role) !== 'cashier'
                  ? getRoleLanding(currentInputer.role).terminalName
                  : 'Admin ERP'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className="bg-cyan-950/90 border-b border-cyan-800 text-cyan-200 text-xs px-4 py-2 font-mono flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-cyan-400 font-bold">✕</button>
        </div>
      )}

      {/* Main Terminal Workspace: Manager Command Console OR POS Register */}
      {isManager && terminalView === 'manager_ops' ? (
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950">
          {/* Executive Manager Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] tracking-widest uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 font-extrabold rounded">
                    BRANCH OPERATIONS COMMAND
                  </span>
                  <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    MANAGERIAL GOVERNANCE ACTIVE
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{activeLocation.name}</span>
                  <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {activeLocation.code || 'MAIN'}
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  As Branch Manager, your primary mandate is supervising branch personnel, managing physical stock counts,
                  reconciling drawer balances, and approving transactions. Data entry is handled by cashiers under your supervision.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleOpenAddStaff}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Branch Staff</span>
                </button>
                <button
                  onClick={handleVerifyDrawer}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Drawer</span>
                </button>
                <button
                  onClick={() => setTerminalView('cashier_pos')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-700 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Assist on Register</span>
                </button>
              </div>
            </div>

            {/* Branch Live Metrics */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400">Branch Cashiers</div>
                <div className="text-2xl font-bold text-white mt-1">{branchCashiers.length}</div>
                <div className="text-[11px] text-emerald-400 mt-0.5">
                  {branchCashiers.filter((c) => c.status === 'active').length} on active duty
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400">Branch Revenue Today</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {formatNaira(branchOrders.reduce((s, o) => s + (o.grandTotal || 0), 0))}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {branchOrders.length} customer sales
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400">Cash in Till Drawer</div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {formatNaira(
                    50000 +
                      branchOrders
                        .filter((o) => o.paymentMethod === 'cash')
                        .reduce((s, o) => s + (o.grandTotal || 0), 0)
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">₦50,000 float + cash intake</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400">Catalog Units on Site</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {products.reduce(
                    (sum, p) => sum + dbStore.getProductStock(p.id, activeLocation.id),
                    0
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Across {products.length} products</div>
              </div>
            </div>
          </div>

          {/* 4 Pillars of Branch Command */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PILLAR 1: Branch Staff & Cashiers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base text-white">
                      1. Branch Staff & Cashiers ({branchCashiers.length})
                    </h3>
                  </div>
                  <button
                    onClick={handleOpenAddStaff}
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Staff</span>
                  </button>
                </div>

                <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {branchCashiers.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-xs">No cashier staff assigned under this branch yet</p>
                      <button
                        onClick={handleOpenAddStaff}
                        className="mt-3 px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded cursor-pointer"
                      >
                        + Add First Staff Member
                      </button>
                    </div>
                  ) : (
                    branchCashiers.map((cashier) => {
                      const cashierSales = branchOrders.filter(
                        (o) => o.inputerId === cashier.id || o.cashier.includes(cashier.name)
                      );
                      const cashierTotal = cashierSales.reduce((s, o) => s + (o.grandTotal || 0), 0);

                      return (
                        <div
                          key={cashier.id}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                                {cashier.staffCode}
                              </span>
                              <span
                                className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                  cashier.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {cashier.status}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 uppercase">
                                {cashier.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-white font-medium text-sm mt-1 truncate">
                              {cashier.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                              PIN: •••• · {cashierSales.length} sales ({formatNaira(cashierTotal)})
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleStaffStatus(cashier)}
                              className={`px-2 py-1 font-mono text-[10px] uppercase rounded border cursor-pointer ${
                                cashier.status === 'active'
                                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {cashier.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleOpenEditStaff(cashier)}
                              className="px-2 py-1 font-mono text-[10px] uppercase rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Managerial Command: Assign cashiers to handle registers</span>
                <span className="text-emerald-400 font-mono">✓ Operational</span>
              </div>
            </div>

            {/* PILLAR 2: Branch Inventory Ledger & Stock Adjustment */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base text-white">
                      2. Branch Stock Ledger & Cycle Count
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {products.length} catalog items
                  </span>
                </div>

                <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {products.slice(0, 8).map((product) => {
                    const branchQty = dbStore.getProductStock(product.id, activeLocation.id);
                    const isLowStock = branchQty <= (product.reorderThreshold || 10);

                    return (
                      <div
                        key={product.id}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{product.sku}</span>
                            {isLowStock ? (
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                OK
                              </span>
                            )}
                          </div>
                          <div className="text-white font-medium text-xs mt-0.5 truncate">
                            {product.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            Base: {formatNaira(product.retailPrice)} · Reorder: {product.reorderThreshold || 10}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-base font-bold text-white font-mono">{branchQty}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-mono">Units Here</div>
                          </div>
                          <button
                            onClick={() => {
                              setAdjustingProduct({
                                id: product.id,
                                name: product.name,
                                sku: product.sku,
                                currentStock: branchQty
                              });
                              setAdjustNewStock(branchQty);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border border-slate-700 text-white font-mono text-[10px] uppercase font-bold rounded transition-colors cursor-pointer"
                            title="Adjust physical stock count"
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Manager Stock Authority: Direct Inventory Adjustment</span>
                <button
                  onClick={() => {
                    if (products[0]) {
                      setAdjustingProduct({
                        id: products[0].id,
                        name: products[0].name,
                        sku: products[0].sku,
                        currentStock: dbStore.getProductStock(products[0].id, activeLocation.id)
                      });
                      setAdjustNewStock(dbStore.getProductStock(products[0].id, activeLocation.id));
                    }
                  }}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  + Record Stock Count
                </button>
              </div>
            </div>

            {/* PILLAR 3: Till Drawer & Fiscal Reconciliation */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base text-white">
                      3. Till Drawer & Cash Reconciliation
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    LIVE REGISTER BALANCING
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">Opening Till Float</span>
                    <span className="font-mono text-sm font-bold text-white">₦50,000.00</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">Physical Cash Inflow Today</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {formatNaira(
                        branchOrders
                          .filter((o) => o.paymentMethod === 'cash')
                          .reduce((s, o) => s + (o.grandTotal || 0), 0)
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">Card POS Payments</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {formatNaira(
                        branchOrders
                          .filter((o) => o.paymentMethod === 'credit_card' || o.paymentMethod === 'debit_card')
                          .reduce((s, o) => s + (o.grandTotal || 0), 0)
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">Instant Bank Transfers</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {formatNaira(
                        branchOrders
                          .filter((o) => o.paymentMethod === 'bank_transfer' || o.paymentMethod === 'wire_transfer')
                          .reduce((s, o) => s + (o.grandTotal || 0), 0)
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-lg p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase text-slate-400">
                        Expected Drawer Physical Cash
                      </div>
                      <div className="font-mono text-lg font-bold text-emerald-400">
                        {formatNaira(
                          50000 +
                            branchOrders
                              .filter((o) => o.paymentMethod === 'cash')
                              .reduce((s, o) => s + (o.grandTotal || 0), 0)
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase text-slate-400">Total Gross Processed</div>
                      <div className="font-mono text-sm font-bold text-white">
                        {formatNaira(branchOrders.reduce((s, o) => s + (o.grandTotal || 0), 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400">
                  Manager Sign-off: {currentInputer.staffCode}
                </span>
                <button
                  onClick={handleVerifyDrawer}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold uppercase rounded transition-colors cursor-pointer"
                >
                  ✓ Sign Off Drawer
                </button>
              </div>
            </div>

            {/* PILLAR 4: Supervised Branch Sales & Approvals */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base text-white">
                      4. Branch Sales & Supervised Approvals
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {branchOrders.length} branch transactions
                  </span>
                </div>

                <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {branchOrders.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-400 font-mono text-xs">
                      No customer transactions logged at this branch yet today.
                    </div>
                  ) : (
                    branchOrders.slice(0, 6).map((order) => {
                      const isSupervised = Boolean(order.supervisedBy);

                      return (
                        <div
                          key={order.id}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white">
                                {order.orderNumber}
                              </span>
                              {isSupervised ? (
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  SUPERVISED
                                </span>
                              ) : (
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  STANDARD
                                </span>
                              )}
                            </div>
                            <div className="text-slate-300 text-xs mt-0.5 truncate">
                              Cashier: {order.cashier} · Cust: {order.customerName}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {order.paymentMethod.replace('_', ' ').toUpperCase()} · {order.items.length} items
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="font-mono text-xs font-bold text-white">
                                {formatNaira(order.grandTotal)}
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveReceiptOrder(order)}
                              className="p-1.5 text-slate-400 hover:text-white rounded border border-slate-800 hover:border-slate-600 cursor-pointer"
                              title="Inspect Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!isSupervised && (
                              <button
                                onClick={() => handleAuthorizeOrder(order)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[10px] font-bold uppercase rounded cursor-pointer"
                                title="Authorize Order"
                              >
                                Authorize
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Managerial Oversight: High-value clearance</span>
                <span className="text-emerald-400 font-mono">Active</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isManager && (
            <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                REGISTER ASSIST ACTIVE: You are operating in Cashier Mode. Your primary role is Branch Management.
              </span>
              <button
                onClick={() => setTerminalView('manager_ops')}
                className="underline hover:text-white font-bold cursor-pointer"
              >
                Return to Branch Management Console →
              </button>
            </div>
          )}
          {/* Main Terminal Workspace: 2-Column Split */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
            {/* Left 7 Columns: Product Catalog, Quick Search, Categories */}
            <div className="lg:col-span-7 flex flex-col border-r border-slate-800 p-4 space-y-4 overflow-y-auto">
          {/* Quick Barcode / SKU Scan Header */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products you sell by name or category..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Add Item
            </button>
          </form>

          {/* Category Quick Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => {
              const stock = dbStore.getProductStock(prod.id, activeLocation.id);
              const isOutOfStock = stock <= 0;
              const price = channel === 'wholesale' ? prod.wholesaleBasePrice : prod.retailPrice;

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  className={`bg-slate-900 border rounded-lg p-3 flex flex-col justify-between transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'border-slate-800/40 opacity-50 cursor-not-allowed'
                      : 'border-slate-800 hover:border-cyan-500/80 hover:bg-slate-800/40 hover:shadow-lg'
                  }`}
                >
                  <div>
                    {prod.imageUrl && (
                      <div className="w-full aspect-video rounded bg-slate-950 mb-2 overflow-hidden border border-slate-800/80 flex items-center justify-center">
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                      <span>{prod.sku}</span>
                      <span
                        className={`tabular-nums font-semibold ${
                          stock <= 5 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {stock} in stock
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-cyan-400 tabular-nums">
                      ${price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className="p-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Feed: Recent Receipts by this Inputer for Fast Reprinting */}
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Recent Receipts by {currentInputer.name} (One-Click Reprint)
              </span>
              <span className="text-xs text-slate-400">{recentOrders.length} orders logged</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No orders processed yet today. Complete a sale to print the first receipt.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <tbody className="divide-y divide-slate-800/60">
                    {recentOrders.slice(0, 8).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-cyan-400 font-bold">{ord.orderNumber}</td>
                        <td className="py-2 px-3 text-slate-300 font-sans">{ord.customerName}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                          ${ord.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 text-xs">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => setActiveReceiptOrder(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-xs transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Reprint Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Active POS Cart, Customer, Payment Tender & Direct Receipt Trigger */}
        <div className="lg:col-span-5 bg-slate-900/60 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Channel & Customer Selectors */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Channel:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChannel('retail')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    channel === 'retail' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Retail POS
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('wholesale')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    channel === 'wholesale' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Wholesale
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Customer / Account:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''} — {c.type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg flex-1 flex flex-col min-h-64 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-600" />
                  <p>Cart is currently empty.</p>
                  <p className="text-slate-400">Scan barcodes or tap products on the left catalog to add.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2 px-1 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{item.product.name}</div>
                      <div className="text-xs font-mono text-slate-400">
                        ${item.unitPrice.toFixed(2)} each
                        {item.discountPercent > 0 && (
                          <span className="text-emerald-400 ml-1">(-{item.discountPercent.toFixed(0)}%)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-white w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-mono text-xs font-bold text-cyan-400 w-16 text-right tabular-nums">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Calculations Summary */}
            <div className="bg-slate-950 p-3 border-t border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="tabular-nums">${cartSubtotal.toFixed(2)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Volume Tier Discount:</span>
                  <span className="tabular-nums">-${cartDiscount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Sales Tax (7.5%):</span>
                  <span className="tabular-nums">${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-800">
                <span className="font-sans">Grand Total:</span>
                <span className="text-cyan-400 tabular-nums">${finalPayable.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Cash Tender */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Payment Method:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`py-2 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`py-2 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bank Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('net_terms_invoice')}
                className={`py-2 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'net_terms_invoice'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Net 30</span>
              </button>
            </div>

            {/* If Bank Transfer: Display instant settlement notice */}
            {paymentMethod === 'bank_transfer' && (
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs flex items-center justify-between text-amber-300 font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Settlement Bank Auto-Verification Active</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">DONE ON TENDER</span>
              </div>
            )}

            {/* If Cash: Quick denominations and Change calculator */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cash Tendered ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={finalPayable.toFixed(2)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  {[20, 50, 100].map((bill) => (
                    <button
                      type="button"
                      key={bill}
                      onClick={() => setCashTendered(bill.toString())}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded cursor-pointer"
                    >
                      ${bill}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTendered(finalPayable.toFixed(2))}
                    className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-mono rounded border border-cyan-800 cursor-pointer"
                  >
                    Exact
                  </button>
                </div>

                {numericCashTendered >= finalPayable && finalPayable > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 font-mono">
                    <span className="text-slate-400">Change Due to Customer:</span>
                    <span className="text-amber-400 font-bold">${cashChange.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Auto Print Receipt Checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={autoPrintReceipt}
                onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-800 focus:ring-0"
              />
              <span className="font-medium text-white flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                Instantly Launch Thermal Receipt Print Modal
              </span>
            </label>
          </div>

          {/* Submit Action: Complete Sale & Print Receipt */}
          <button
            onClick={handleCompleteOrder}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-cyan-950/50'
            }`}
          >
            <Printer className="w-5 h-5" />
            <span>COMPLETE SALE & PRINT RECEIPT ({formatNaira(finalPayable)})</span>
          </button>
        </div>
      </div>
      </>
      )}

      {/* Modal: Add or Edit Staff Under Branch */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 font-bold rounded">
                  BRANCH STAFF MANAGEMENT
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {editingStaff ? `Edit Staff: ${editingStaff.staffCode}` : `Add Staff to ${activeLocation.name}`}
                </h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                    Staff Code
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.staffCode}
                    onChange={(e) => setStaffForm({ ...staffForm, staffCode: e.target.value.toUpperCase() })}
                    placeholder="CSH-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                    4-Digit Access PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={staffForm.pin}
                    onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-400 font-mono text-sm tracking-widest focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Samuel Okon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                    Staff Role
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as InputerRole })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="retail_inputer">Cashier / Retail Inputer</option>
                    <option value="order_clerk">Wholesale Order Clerk</option>
                    <option value="inventory_clerk">Inventory / Stock Clerk</option>
                    <option value="lead_cashier">Lead Cashier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                    Shift Status
                  </label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active (On Duty)</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                  Phone / Mobile (Optional)
                </label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="+234 801 234 5678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                {editingStaff ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(editingStaff)}
                    className="text-rose-400 hover:text-rose-300 font-mono text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {editingStaff ? 'Save Changes' : '+ Add Staff'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Branch Physical Stock Count */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 font-bold rounded">
                  BRANCH INVENTORY CONTROL
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Adjust Physical Stock Count
                </h3>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="mt-4 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-mono text-[10px] text-slate-400 uppercase">Product</div>
                <div className="text-white font-bold text-sm mt-0.5">{adjustingProduct.name}</div>
                <div className="font-mono text-xs text-slate-400 mt-1">
                  SKU: {adjustingProduct.sku} · Current Branch Stock: {adjustingProduct.currentStock} units
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                  New Physical Count (Quantity on Hand)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-lg font-bold focus:border-cyan-500 focus:outline-none"
                />
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Variance:{' '}
                  <span
                    className={
                      adjustNewStock - adjustingProduct.currentStock >= 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    {adjustNewStock - adjustingProduct.currentStock >= 0 ? '+' : ''}
                    {adjustNewStock - adjustingProduct.currentStock} units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-mono mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="Periodic Branch Cycle Count">Periodic Branch Cycle Count</option>
                  <option value="Physical Stock Recount & Reconciliation">Physical Stock Recount & Reconciliation</option>
                  <option value="Damaged / Expired Goods Write-off">Damaged / Expired Goods Write-off</option>
                  <option value="Store Shrinkage / Loss Adjustment">Store Shrinkage / Loss Adjustment</option>
                  <option value="Direct Supplier Inbound Delivery Received">Direct Supplier Inbound Delivery Received</option>
                  <option value="Internal Inter-Branch Stock Inflow">Internal Inter-Branch Stock Inflow</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Full Receipt Modal */}
      {activeReceiptOrder && (
        <ReceiptModal
          order={activeReceiptOrder}
          onClose={() => setActiveReceiptOrder(null)}
          onReceiptPrinted={(ord) => {
            setNotification(`Receipt printed for ${ord.orderNumber}! Counter updated.`);
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
};
