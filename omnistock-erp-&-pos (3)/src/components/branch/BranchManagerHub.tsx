import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  Building2,
  Building,
  Landmark,
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Eye,
  Edit2,
  Lock,
  Phone,
  Mail,
  Printer,
  ShoppingBag,
  Layers,
  ArrowUpRight,
  FileCheck,
  Sparkles,
  AlertCircle,
  X,
  Trash2,
  UserPlus,
  Package,
  RefreshCw,
  Check
} from 'lucide-react';
import { DatabaseState, dbStore } from '../../db/databaseStore';
import { Inputer, Location, Order, InputerActivity, InputerActionType, InputerRole } from '../../types/database';
import { formatNaira } from '../../utils/nigerianBanks';
import { ReceiptModal } from '../pos/ReceiptModal';

interface BranchManagerHubProps {
  dbState: DatabaseState;
  onNavigateToPos?: () => void;
}

export const BranchManagerHub: React.FC<BranchManagerHubProps> = ({ dbState, onNavigateToPos }) => {
  const [activeSubTab, setActiveSubTab] = useState<'branch_ops' | 'cashiers' | 'managers' | 'sales' | 'activities'>('branch_ops');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingManager, setEditingManager] = useState<Inputer | null>(null);
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [supervisingOrder, setSupervisingOrder] = useState<Order | null>(null);
  const [supervisionNotes, setSupervisionNotes] = useState('');
  const [selectedSupervisorForSignoff, setSelectedSupervisorForSignoff] = useState<string>('BM-01');

  // Branch Stock Management for Managers
  const [adjustingProduct, setAdjustingProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    locationId: string;
  } | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Periodic Branch Cycle Count');

  // New/Edit Manager Form
  const [managerForm, setManagerForm] = useState({
    staffCode: '',
    name: '',
    email: '',
    phone: '',
    pin: '',
    assignedLocationId: '',
    status: 'active' as 'active' | 'suspended'
  });

  // Staff Management for Branch Managers
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Inputer | null>(null);
  const [staffForm, setStaffForm] = useState({
    staffCode: '',
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'retail_inputer' as InputerRole,
    assignedLocationId: '',
    status: 'active' as 'active' | 'suspended'
  });

  // Extract Branch Managers (role is 'manager' or 'branch_manager' or 'shift_supervisor')
  const branchManagers = useMemo(() => {
    return (dbState.inputers || []).filter(
      (i) => i.role === 'manager' || i.role === 'branch_manager' || i.role === 'shift_supervisor'
    );
  }, [dbState.inputers]);

  // Extract branch staff
  const cashiers = useMemo(() => {
    return (dbState.inputers || []).filter(
      (i) => i.role !== 'manager' && i.role !== 'branch_manager' && i.role !== 'shift_supervisor' && i.role !== 'owner'
    );
  }, [dbState.inputers]);

  // Extract all supervised sales or all branch orders
  const allOrders = useMemo(() => {
    return dbState.orders || [];
  }, [dbState.orders]);

  const supervisedOrders = useMemo(() => {
    return allOrders.filter((o) => Boolean(o.supervisedBy));
  }, [allOrders]);

  // Total Supervised Volume across branches
  const totalSupervisedVolume = useMemo(() => {
    return supervisedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  }, [supervisedOrders]);

  // Filtered Orders for Sales View
  const filteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      const matchLoc = selectedLocationFilter === 'all' || ord.locationId === selectedLocationFilter;
      const matchMgr =
        selectedManagerFilter === 'all' ||
        (ord.supervisedBy && ord.supervisedBy.includes(selectedManagerFilter));
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.cashier.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        (ord.supervisedBy && ord.supervisedBy.toLowerCase().includes(q));
      return matchLoc && matchMgr && matchSearch;
    });
  }, [allOrders, selectedLocationFilter, selectedManagerFilter, searchQuery]);

  // Branch Detailed Sales Breakdown & Performance Metrics
  const branchSalesMetrics = useMemo(() => {
    const orders = filteredOrders;
    const totalVolume = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.costTotal || 0), 0);
    const grossProfit = totalVolume - totalCost;
    const marginPercent = totalVolume > 0 ? (grossProfit / totalVolume) * 100 : 0;
    const aov = orders.length > 0 ? totalVolume / orders.length : 0;

    let cashTotal = 0;
    let posCardTotal = 0;
    let bankTransferTotal = 0;
    let invoiceTotal = 0;

    orders.forEach((o) => {
      const g = o.grandTotal || 0;
      if (o.paymentMethod === 'cash') {
        cashTotal += g;
      } else if (o.paymentMethod === 'debit_card' || o.paymentMethod === 'credit_card') {
        posCardTotal += g;
      } else if (o.paymentMethod === 'bank_transfer' || o.paymentMethod === 'wire_transfer') {
        bankTransferTotal += g;
      } else {
        invoiceTotal += g;
      }
    });

    // Staff Sales & Cashier Performance Breakdown
    const staffSalesMap = new Map<
      string,
      {
        staffCode: string;
        name: string;
        role: string;
        totalSales: number;
        orderCount: number;
        supervisedCount: number;
        avgTicket: number;
      }
    >();

    orders.forEach((o) => {
      const code = o.inputerId || o.cashier || 'STAFF';
      const name = o.inputerName || o.cashier || 'Cashier Staff';
      const staffMember = (dbState.inputers || []).find(
        (i) => i.staffCode === code || i.id === code || i.name === name
      );

      if (!staffSalesMap.has(code)) {
        staffSalesMap.set(code, {
          staffCode: staffMember?.staffCode || code,
          name: staffMember?.name || name,
          role: staffMember?.role || 'cashier',
          totalSales: 0,
          orderCount: 0,
          supervisedCount: 0,
          avgTicket: 0
        });
      }

      const entry = staffSalesMap.get(code)!;
      entry.totalSales += o.grandTotal || 0;
      entry.orderCount += 1;
      if (o.supervisedBy) entry.supervisedCount += 1;
    });

    const staffBreakdown = Array.from(staffSalesMap.values())
      .map((st) => ({
        ...st,
        avgTicket: st.orderCount > 0 ? st.totalSales / st.orderCount : 0
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Top Selling Products at Branch
    const productSalesMap = new Map<
      string,
      { name: string; sku: string; units: number; revenue: number }
    >();

    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.productId || item.name;
        if (!productSalesMap.has(key)) {
          productSalesMap.set(key, {
            name: item.name,
            sku: item.sku || '',
            units: 0,
            revenue: 0
          });
        }
        const pEntry = productSalesMap.get(key)!;
        pEntry.units += item.quantity || 0;
        pEntry.revenue += item.subtotal || 0;
      });
    });

    const topBranchProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      totalVolume,
      totalOrders: orders.length,
      grossProfit,
      marginPercent,
      aov,
      cashTotal,
      posCardTotal,
      bankTransferTotal,
      invoiceTotal,
      staffBreakdown,
      topBranchProducts
    };
  }, [filteredOrders, dbState.inputers]);

  // Filtered Activities for Activities View
  const managerActivities = useMemo(() => {
    const list = dbState.inputerActivities || [];
    return list.filter((act) => {
      // Must belong to a branch manager or be a supervisory action
      const isSupervisoryAction =
        act.actionType === 'sale_supervised' ||
        act.actionType === 'cashier_audit' ||
        act.actionType === 'branch_review' ||
        act.actionType === 'shift_supervised';
      const isManagerActor = branchManagers.some(
        (m) => m.staffCode === act.inputerId || m.name === act.inputerName
      );

      const belongs = isSupervisoryAction || isManagerActor;
      if (!belongs) return false;

      const matchMgr =
        selectedManagerFilter === 'all' ||
        act.inputerId === selectedManagerFilter ||
        act.inputerName.includes(selectedManagerFilter);

      const matchLoc =
        selectedLocationFilter === 'all' || act.locationId === selectedLocationFilter;

      return matchMgr && matchLoc;
    });
  }, [dbState.inputerActivities, branchManagers, selectedManagerFilter, selectedLocationFilter]);

  // Handle open add modal
  const handleOpenAddManager = () => {
    setEditingManager(null);
    const existingCount = branchManagers.length + 1;
    const nextCode = `BM-${existingCount < 10 ? '0' + existingCount : existingCount}`;
    setManagerForm({
      staffCode: nextCode,
      name: '',
      email: '',
      phone: '+234 ',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      assignedLocationId: dbState.locations[0]?.id || 'loc_store_flagship',
      status: 'active'
    });
    setShowAddModal(true);
  };

  // Handle edit manager
  const handleOpenEditManager = (mgr: Inputer) => {
    setEditingManager(mgr);
    setManagerForm({
      staffCode: mgr.staffCode,
      name: mgr.name,
      email: mgr.email,
      phone: mgr.phone,
      pin: mgr.pin,
      assignedLocationId: mgr.assignedLocationId,
      status: mgr.status
    });
    setShowAddModal(true);
  };

  // Save Manager
  const handleSaveManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerForm.name.trim() || !managerForm.staffCode.trim() || !managerForm.pin.trim()) {
      alert('Please fill out Staff Code, Full Name, and a 4-digit PIN.');
      return;
    }

    if (editingManager) {
      dbStore.updateInputer(editingManager.id, {
        staffCode: managerForm.staffCode.toUpperCase().trim(),
        name: managerForm.name.trim(),
        email: managerForm.email.trim(),
        phone: managerForm.phone.trim(),
        pin: managerForm.pin.trim(),
        assignedLocationId: managerForm.assignedLocationId,
        status: managerForm.status
      });
    } else {
      dbStore.addInputer({
        staffCode: managerForm.staffCode.toUpperCase().trim(),
        name: managerForm.name.trim(),
        email: managerForm.email.trim(),
        phone: managerForm.phone.trim(),
        pin: managerForm.pin.trim(),
        role: 'branch_manager',
        assignedLocationId: managerForm.assignedLocationId,
        status: managerForm.status
      });
    }
    setShowAddModal(false);
  };

  // Staff Handlers for Branch Managers
  const handleOpenAddStaff = (locationId?: string) => {
    setEditingStaff(null);
    const existingCount = cashiers.length + 1;
    const nextCode = `CSH-${existingCount < 10 ? '0' + existingCount : existingCount}`;
    setStaffForm({
      staffCode: nextCode,
      name: '',
      email: '',
      phone: '+234 ',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      role: 'retail_inputer',
      assignedLocationId:
        locationId ||
        (selectedLocationFilter !== 'all' ? selectedLocationFilter : (dbState.locations[0]?.id || 'loc_store_flagship')),
      status: 'active'
    });
    setShowStaffModal(true);
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
      assignedLocationId: staff.assignedLocationId,
      status: staff.status
    });
    setShowStaffModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.staffCode.trim() || !staffForm.pin.trim()) {
      alert('Please fill out Staff Code, Full Name, and a 4-digit PIN.');
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
        assignedLocationId: staffForm.assignedLocationId,
        status: staffForm.status
      });
    } else {
      dbStore.addInputer({
        staffCode: staffForm.staffCode.toUpperCase().trim(),
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        pin: staffForm.pin.trim(),
        role: staffForm.role,
        assignedLocationId: staffForm.assignedLocationId,
        status: staffForm.status
      });
    }
    setShowStaffModal(false);
  };

  const handleToggleStaffStatus = (staff: Inputer) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    dbStore.updateInputer(staff.id, { status: newStatus });
  };

  const handleDeleteStaff = (staff: Inputer) => {
    if (window.confirm(`Are you sure you want to remove staff member ${staff.name} (${staff.staffCode}) from this branch?`)) {
      dbStore.deleteInputer(staff.id);
      setShowStaffModal(false);
    }
  };

  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const supervisor = branchManagers.find((m) => m.staffCode === selectedSupervisorForSignoff) || branchManagers[0];
    const operatorName = supervisor ? `${supervisor.name} (${supervisor.staffCode})` : 'Branch Manager';
    dbStore.adjustStock(
      adjustingProduct.id,
      adjustingProduct.locationId,
      adjustNewStock,
      adjustReason,
      operatorName
    );
    setAdjustingProduct(null);
  };

  // Execute manual supervision sign-off on an order
  const handleConfirmSuperviseOrder = () => {
    if (!supervisingOrder) return;
    const supervisor = branchManagers.find((m) => m.staffCode === selectedSupervisorForSignoff) || branchManagers[0];
    if (!supervisor) {
      alert('No active branch manager selected.');
      return;
    }

    dbStore.superviseOrder(
      supervisingOrder.id,
      supervisor.staffCode,
      supervisionNotes.trim() || 'Supervised and verified by Branch Manager'
    );

    setSupervisingOrder(null);
    setSupervisionNotes('');
  };

  // Quick Action Simulation for testing supervision activity
  const handleSimulateSupervisionAction = (action: 'audit' | 'stock' | 'shift') => {
    const supervisor = branchManagers[0];
    if (!supervisor) return;
    const loc = dbState.locations.find((l) => l.id === supervisor.assignedLocationId);

    if (action === 'audit') {
      dbStore.recordBranchAudit(
        supervisor.staffCode,
        'Mid-Day Till & Register Audit',
        `Conducted live register inspection and verified cashier cash drawers at ${loc?.name || 'Flagship Branch'}`,
        loc?.id
      );
    } else if (action === 'stock') {
      dbStore.recordBranchAudit(
        supervisor.staffCode,
        'Branch Stock Balance Verification',
        `Authorized physical stock check and verified high-turnover SKUs on floor`,
        loc?.id
      );
    } else if (action === 'shift') {
      dbStore.recordBranchAudit(
        supervisor.staffCode,
        'Cashier Shift Supervision & Sign-off',
        `Supervised shift handover and balanced register floats with zero cash discrepancy`,
        loc?.id
      );
    }
  };

  const handleAuditCashierTill = (cashier: Inputer) => {
    const supervisor =
      branchManagers.find((m) => m.assignedLocationId === cashier.assignedLocationId) ||
      branchManagers[0];
    const supervisorCode = supervisor?.staffCode || 'BM-01';
    const loc = dbState.locations.find((l) => l.id === cashier.assignedLocationId);

    dbStore.recordBranchAudit(
      supervisorCode,
      `Till Audit: ${cashier.name} (${cashier.staffCode})`,
      `Branch Manager verified physical cash drawer and approved register float balance for ${cashier.name} at ${
        loc?.name || 'Store Branch'
      }. Verified zero discrepancy.`,
      loc?.id
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Branch Managers & Sales Supervision
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Supervise retail sales, monitor branch manager oversight activities, and inspect cashier transactions across branches.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddManager}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch Manager</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Supervised Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Supervised Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {formatNaira(totalSupervisedVolume)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span>{supervisedOrders.length} verified orders</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Across branches</span>
          </div>
        </div>

        {/* Active Branch Managers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Branch Managers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {branchManagers.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">
              {branchManagers.filter((m) => m.status === 'active').length} active
            </span>
            <span>on duty</span>
          </div>
        </div>

        {/* Supervised Cashiers Monitored */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cashiers Supervised</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {cashiers.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Across {dbState.locations.length} store branches
          </div>
        </div>

        {/* Total Supervisory Activities */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Supervisory Audits Logged</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {managerActivities.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Real-time immutable audit trail
          </div>
        </div>
      </div>

      {/* Subtabs Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('branch_ops')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'branch_ops'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Branch Ops Command ({dbState.locations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('managers')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'managers'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Branch Managers ({branchManagers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cashiers')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'cashiers'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Branch Staff & Cashiers ({cashiers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sales')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'sales'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Supervised Sales ({supervisedOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('activities')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'activities'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Activity Feed ({managerActivities.length})
          </button>
        </div>

        {/* Location & Search Filters */}
        <div className="flex items-center gap-2">
          {/* Branch Filter */}
          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Store Branches</option>
            {dbState.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* Quick Simulation Dropdown for instant audit test */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleSimulateSupervisionAction('audit')}
              title="Record an instant branch manager audit entry for testing"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              + Log Manager Audit
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 0: Branch Operations Command Console */}
      {activeSubTab === 'branch_ops' && (() => {
        const activeBranchLoc =
          selectedLocationFilter !== 'all'
            ? dbState.locations.find((l) => l.id === selectedLocationFilter) || dbState.locations[0]
            : dbState.locations[0];

        const activeBranchMgr = branchManagers.find((m) => m.assignedLocationId === activeBranchLoc?.id);
        const branchCashiers = cashiers.filter((c) => c.assignedLocationId === activeBranchLoc?.id);
        const branchOrders = allOrders.filter((o) => o.locationId === activeBranchLoc?.id);

        const branchCashTotal = branchOrders
          .filter((o) => o.paymentMethod === 'cash')
          .reduce((s, o) => s + (o.grandTotal || 0), 0);
        const branchCardTotal = branchOrders
          .filter((o) => o.paymentMethod === 'credit_card' || o.paymentMethod === 'debit_card')
          .reduce((s, o) => s + (o.grandTotal || 0), 0);
        const branchTransferTotal = branchOrders
          .filter((o) => o.paymentMethod === 'bank_transfer' || o.paymentMethod === 'wire_transfer')
          .reduce((s, o) => s + (o.grandTotal || 0), 0);
        const branchTotalRevenue = branchOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);

        return (
          <div className="space-y-6">
            {/* Manager Operational Command Banner */}
            <div className="bg-[#111111] border border-[#222222] p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] tracking-widest uppercase bg-white text-black px-2 py-0.5 font-bold">
                      BRANCH COMMAND CONSOLE
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      OPERATIONAL GOVERNANCE ACTIVE
                    </span>
                  </div>
                  <h2 className="font-['Oswald'] text-2xl uppercase tracking-wide text-white">
                    {activeBranchLoc?.name || 'Main Branch'}
                  </h2>
                  <p className="text-xs text-white/50 mt-1 max-w-2xl font-['Inter']">
                    Branch Managers hold executive oversight over store branches: supervising cashier inputers,
                    performing cycle-count stock adjustments, reconciling register cash drawers, and authorizing high-value sales.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Branch Location Switcher */}
                  <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222222] px-3 py-2">
                    <Building className="w-4 h-4 text-white/50" />
                    <select
                      value={selectedLocationFilter === 'all' ? activeBranchLoc?.id : selectedLocationFilter}
                      onChange={(e) => setSelectedLocationFilter(e.target.value)}
                      className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                    >
                      {dbState.locations.map((loc) => (
                        <option key={loc.id} value={loc.id} className="bg-[#111111] text-white">
                          {loc.name} ({loc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleOpenAddStaff(activeBranchLoc?.id)}
                    className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Branch Staff</span>
                  </button>
                </div>
              </div>

              {/* Manager in Charge & Branch Telemetry Bar */}
              <div className="mt-4 pt-4 border-t border-[#222222] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0a0a0a] border border-[#222222] p-3">
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    Manager in Charge
                  </div>
                  <div className="text-white font-bold text-sm mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{activeBranchMgr ? activeBranchMgr.name : 'Unassigned (Assign Below)'}</span>
                  </div>
                  <div className="font-mono text-[10px] text-white/50 mt-0.5">
                    {activeBranchMgr ? `Code: ${activeBranchMgr.staffCode} • ${activeBranchMgr.status}` : 'Pending assignment'}
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#222222] p-3">
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    Cashiers Under Branch
                  </div>
                  <div className="font-['Oswald'] text-2xl text-white mt-1">
                    {branchCashiers.length}
                  </div>
                  <div className="font-mono text-[10px] text-white/50 mt-0.5">
                    {branchCashiers.filter((c) => c.status === 'active').length} active on shift
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#222222] p-3">
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    Branch Revenue
                  </div>
                  <div className="font-mono text-lg font-bold text-white mt-1">
                    {formatNaira(branchTotalRevenue)}
                  </div>
                  <div className="font-mono text-[10px] text-white/50 mt-0.5">
                    Across {branchOrders.length} customer sales
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#222222] p-3">
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    Drawer Status
                  </div>
                  <div className="font-mono text-lg font-bold text-emerald-400 mt-1">
                    {formatNaira(50000 + branchCashTotal)}
                  </div>
                  <div className="font-mono text-[10px] text-white/50 mt-0.5">
                    ₦50,000 float + ₦{branchCashTotal.toLocaleString()} cash
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Pillars of Branch Command Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PILLAR 1: Branch Staff & Cashier Roster */}
              <div className="bg-[#111111] border border-[#222222] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white" />
                      <h3 className="font-['Oswald'] text-lg uppercase tracking-wide text-white">
                        1. Branch Staff & Cashiers ({branchCashiers.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => handleOpenAddStaff(activeBranchLoc?.id)}
                      className="font-mono text-[11px] text-white/70 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Staff</span>
                    </button>
                  </div>

                  <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {branchCashiers.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-[#222222] text-white/40">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-mono">No staff assigned to this branch yet</p>
                        <button
                          onClick={() => handleOpenAddStaff(activeBranchLoc?.id)}
                          className="mt-3 px-3 py-1.5 bg-white text-black font-mono text-[11px] font-bold uppercase cursor-pointer"
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
                            className="bg-[#0a0a0a] border border-[#222222] p-3 flex items-center justify-between gap-3 hover:border-white/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-white bg-[#1a1a1a] px-2 py-0.5">
                                  {cashier.staffCode}
                                </span>
                                <span
                                  className={`font-mono text-[9px] uppercase px-1.5 py-0.5 font-bold ${
                                    cashier.status === 'active'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}
                                >
                                  {cashier.status}
                                </span>
                                <span className="font-mono text-[10px] text-white/40 uppercase">
                                  {cashier.role.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-white font-medium text-xs mt-1 truncate">
                                {cashier.name}
                              </div>
                              <div className="font-mono text-[10px] text-white/50 mt-0.5">
                                PIN: •••• • {cashierSales.length} sales ({formatNaira(cashierTotal)})
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleStaffStatus(cashier)}
                                className={`px-2 py-1 font-mono text-[10px] uppercase border cursor-pointer ${
                                  cashier.status === 'active'
                                    ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={cashier.status === 'active' ? 'Suspend Staff' : 'Activate Staff'}
                              >
                                {cashier.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleOpenEditStaff(cashier)}
                                className="px-2 py-1 font-mono text-[10px] uppercase border border-[#333333] text-white/70 hover:text-white hover:border-white cursor-pointer"
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

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>Supervisory Authority: Full Personnel Management</span>
                  <span className="text-emerald-400">✓ In Sync</span>
                </div>
              </div>

              {/* PILLAR 2: Branch Inventory Ledger & Stock Adjustment */}
              <div className="bg-[#111111] border border-[#222222] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-white" />
                      <h3 className="font-['Oswald'] text-lg uppercase tracking-wide text-white">
                        2. Branch Stock Ledger & Cycle Count
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] text-white/50">
                      {dbState.products.length} catalog items
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {dbState.products.slice(0, 8).map((product) => {
                      const branchQty = dbStore.getProductStock(product.id, activeBranchLoc?.id);
                      const isLowStock = branchQty <= (product.reorderThreshold || 10);

                      return (
                        <div
                          key={product.id}
                          className="bg-[#0a0a0a] border border-[#222222] p-2.5 flex items-center justify-between gap-3 hover:border-white/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-white/50">
                                {product.sku}
                              </span>
                              {isLowStock ? (
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                                  LOW STOCK
                                </span>
                              ) : (
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  OK
                                </span>
                              )}
                            </div>
                            <div className="text-white font-medium text-xs mt-0.5 truncate">
                              {product.name}
                            </div>
                            <div className="font-mono text-[10px] text-white/50">
                              Base: {formatNaira(product.retailPrice)} • Reorder at: {product.reorderThreshold || 10}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-['Oswald'] text-lg text-white">
                                {branchQty}
                              </div>
                              <div className="font-mono text-[9px] text-white/40 uppercase">Units Here</div>
                            </div>
                            <button
                              onClick={() => {
                                setAdjustingProduct({
                                  id: product.id,
                                  name: product.name,
                                  sku: product.sku,
                                  currentStock: branchQty,
                                  locationId: activeBranchLoc?.id || 'loc_store_flagship'
                                });
                                setAdjustNewStock(branchQty);
                              }}
                              className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-white hover:text-black border border-[#333333] text-white font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer"
                              title="Adjust branch physical stock count"
                            >
                              Adjust
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>Manager Stock Control: Direct Count Adjustment</span>
                  <button
                    onClick={() => {
                      if (dbState.products[0]) {
                        setAdjustingProduct({
                          id: dbState.products[0].id,
                          name: dbState.products[0].name,
                          sku: dbState.products[0].sku,
                          currentStock: dbStore.getProductStock(dbState.products[0].id, activeBranchLoc?.id),
                          locationId: activeBranchLoc?.id || 'loc_store_flagship'
                        });
                        setAdjustNewStock(dbStore.getProductStock(dbState.products[0].id, activeBranchLoc?.id));
                      }
                    }}
                    className="text-white hover:underline cursor-pointer"
                  >
                    + Record Stock Count
                  </button>
                </div>
              </div>

              {/* PILLAR 3: Active Till Drawer Reconciliation */}
              <div className="bg-[#111111] border border-[#222222] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-white" />
                      <h3 className="font-['Oswald'] text-lg uppercase tracking-wide text-white">
                        3. Till Drawer & Cash Reconciliation
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                      LIVE REGISTER BALANCING
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="bg-[#0a0a0a] border border-[#222222] p-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-white/60">Opening Till Float</span>
                      <span className="font-mono text-sm font-bold text-white">₦50,000.00</span>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#222222] p-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-white/60">Physical Cash Inflow Today</span>
                      <span className="font-mono text-sm font-bold text-white">{formatNaira(branchCashTotal)}</span>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#222222] p-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-white/60">Moniepoint POS Card Payments</span>
                      <span className="font-mono text-sm font-bold text-white">{formatNaira(branchCardTotal)}</span>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#222222] p-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-white/60">Instant Bank Transfers</span>
                      <span className="font-mono text-sm font-bold text-white">{formatNaira(branchTransferTotal)}</span>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/20 p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[10px] uppercase text-white/60">
                          Expected Drawer Physical Cash
                        </div>
                        <div className="font-['Oswald'] text-xl text-emerald-400">
                          {formatNaira(50000 + branchCashTotal)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase text-white/60">
                          Total Gross Processed
                        </div>
                        <div className="font-mono text-sm font-bold text-white">
                          {formatNaira(branchTotalRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/50">
                    Audit Status: Verified by {activeBranchMgr?.staffCode || 'BM-01'}
                  </span>
                  <button
                    onClick={() => handleSimulateSupervisionAction('shift')}
                    className="px-3 py-1.5 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    ✓ Sign Off Drawer
                  </button>
                </div>
              </div>

              {/* PILLAR 4: Supervised Branch Sales & Approvals */}
              <div className="bg-[#111111] border border-[#222222] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-white" />
                      <h3 className="font-['Oswald'] text-lg uppercase tracking-wide text-white">
                        4. Branch Sales & Supervised Approvals
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] text-white/50">
                      {branchOrders.length} branch transactions
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {branchOrders.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-[#222222] text-white/40 font-mono text-xs">
                        No transactions registered at this branch yet today.
                      </div>
                    ) : (
                      branchOrders.slice(0, 6).map((order) => {
                        const isSupervised = Boolean(order.supervisedBy);

                        return (
                          <div
                            key={order.id}
                            className="bg-[#0a0a0a] border border-[#222222] p-2.5 flex items-center justify-between gap-3 hover:border-white/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-white">
                                  {order.orderNumber}
                                </span>
                                {isSupervised ? (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    SUPERVISED
                                  </span>
                                ) : (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-white/10 text-white/60">
                                    STANDARD
                                  </span>
                                )}
                              </div>
                              <div className="text-white/70 text-xs mt-0.5 truncate">
                                Cashier: {order.cashier} • Customer: {order.customerName}
                              </div>
                              <div className="font-mono text-[10px] text-white/40">
                                {order.paymentMethod.replace('_', ' ').toUpperCase()} • {order.items.length} items
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <div className="font-mono text-xs font-bold text-white">
                                  {formatNaira(order.grandTotal)}
                                </div>
                              </div>
                              <button
                                onClick={() => setInspectingOrder(order)}
                                className="p-1.5 text-white/50 hover:text-white border border-[#222222] hover:border-white cursor-pointer"
                                title="Inspect Thermal Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!isSupervised && (
                                <button
                                  onClick={() => setSupervisingOrder(order)}
                                  className="px-2 py-1 bg-white text-black font-mono text-[10px] font-bold uppercase cursor-pointer"
                                  title="Approve / Supervise Order"
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

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>Managerial Oversight: Real-time Transaction Clearance</span>
                  <button
                    onClick={() => setActiveSubTab('sales')}
                    className="text-white hover:underline cursor-pointer"
                  >
                    View All Supervised Orders →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW 1: Branch Managers Directory */}
      {activeSubTab === 'managers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchManagers.map((mgr) => {
            const loc = dbState.locations.find((l) => l.id === mgr.assignedLocationId);
            const branchCashiers = cashiers.filter(
              (c) => c.assignedLocationId === mgr.assignedLocationId
            );
            const branchOrders = allOrders.filter(
              (o) => o.locationId === mgr.assignedLocationId || (o.supervisedBy && o.supervisedBy.includes(mgr.staffCode))
            );
            const branchSupervisedVolume = branchOrders
              .filter((o) => o.supervisedBy && o.supervisedBy.includes(mgr.staffCode))
              .reduce((s, o) => s + (o.grandTotal || 0), 0);

            return (
              <div
                key={mgr.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Top Row: Code, Name, Role */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {mgr.staffCode}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            mgr.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {mgr.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5">{mgr.name}</h3>
                    </div>

                    <button
                      onClick={() => handleOpenEditManager(mgr)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Branch Manager details or PIN"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Branch Assignment */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium text-slate-200">
                      {loc ? loc.name : 'Unassigned Branch'}
                    </span>
                  </div>

                  {/* Contact Info & PIN */}
                  <div className="mt-2 space-y-1 text-[11px] text-slate-400 font-mono">
                    {mgr.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{mgr.email}</span>
                      </div>
                    )}
                    {mgr.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{mgr.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-amber-400/90 font-medium pt-0.5">
                      <Lock className="w-3 h-3" />
                      <span>Security PIN: {mgr.pin}</span>
                    </div>
                  </div>

                  {/* Branch Metrics Box */}
                  <div className="mt-4 p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Supervised Sales</span>
                      <span className="text-white font-bold font-mono">
                        {formatNaira(branchSupervisedVolume || mgr.totalSalesVolume || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cashier Team</span>
                      <span className="text-white font-semibold">
                        {branchCashiers.length} Cashier{branchCashiers.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Staff Roster under this Manager's Branch */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>Staff Under This Branch ({branchCashiers.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddStaff(mgr.assignedLocationId)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                        title={`Add staff member under ${mgr.name}'s branch`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Staff</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {branchCashiers.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-1">No cashiers assigned yet.</p>
                      ) : (
                        branchCashiers.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-[11px] bg-slate-950/70 border border-slate-800/80 px-2 py-1 rounded"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-white truncate">{c.name}</span>
                              <span className="font-mono text-[9px] text-slate-400">({c.staffCode})</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded border ${
                                c.status === 'active'
                                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                  : 'border-red-500/30 text-red-400 bg-red-500/10'
                              }`}>
                                {c.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(c)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit staff details, role, PIN, or status"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocationFilter(mgr.assignedLocationId);
                      setActiveSubTab('cashiers');
                    }}
                    className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white/80 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Manage Staff ({branchCashiers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManagerFilter(mgr.staffCode);
                      setActiveSubTab('sales');
                    }}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    <span>View Sales</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Detailed Branch Sales & Supervision Ledger */}
      {activeSubTab === 'sales' && (
        <div className="space-y-5">
          {/* Detailed Branch Sales Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 block">Total Branch Sales</span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-white tracking-tight">
                {formatNaira(branchSalesMetrics.totalVolume)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                <span>{branchSalesMetrics.totalOrders} total receipts</span>
                <span className="text-emerald-400 font-mono">
                  AOV: {formatNaira(branchSalesMetrics.aov)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 block">Gross Margin & Profit</span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {formatNaira(branchSalesMetrics.grossProfit)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Gross Profit Margin</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {branchSalesMetrics.marginPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 block">Cash Collected in Register</span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-amber-300 tracking-tight">
                {formatNaira(branchSalesMetrics.cashTotal)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Physical Cash Tenders</span>
                <span className="text-slate-300 font-mono">
                  {branchSalesMetrics.totalVolume > 0
                    ? ((branchSalesMetrics.cashTotal / branchSalesMetrics.totalVolume) * 100).toFixed(0)
                    : 0}% of sales
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 block">Electronic POS & Transfers</span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-cyan-300 tracking-tight">
                {formatNaira(branchSalesMetrics.posCardTotal + branchSalesMetrics.bankTransferTotal)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Card POS: {formatNaira(branchSalesMetrics.posCardTotal)}</span>
                <span className="text-slate-400">NIP: {formatNaira(branchSalesMetrics.bankTransferTotal)}</span>
              </div>
            </div>
          </div>

          {/* Staff Cashier Performance Monitoring & Top Selling Branch Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Staff Cashier Breakdown */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Staff & Cashier Sales Supervision ({branchSalesMetrics.staffBreakdown.length} Cashiers)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Monitors staff sales volume, ticket count & supervisor audits
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 bg-slate-950/70">
                    <tr>
                      <th className="py-2 px-3">Staff / Cashier</th>
                      <th className="py-2 px-3 text-center">Role</th>
                      <th className="py-2 px-3 text-center">Orders</th>
                      <th className="py-2 px-3 text-center">Supervised</th>
                      <th className="py-2 px-3 text-right">Avg Ticket</th>
                      <th className="py-2 px-3 text-right">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {branchSalesMetrics.staffBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500 text-xs">
                          No staff sales recorded for current branch filter.
                        </td>
                      </tr>
                    ) : (
                      branchSalesMetrics.staffBreakdown.map((st) => (
                        <tr key={st.staffCode} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white">{st.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{st.staffCode}</div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 capitalize">
                              {st.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-medium text-white">
                            {st.orderCount}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {st.supervisedCount}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            {formatNaira(st.avgTicket)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            {formatNaira(st.totalSales)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products at Branch */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Top Selling Products
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">By Revenue</span>
              </div>

              <div className="space-y-2">
                {branchSalesMetrics.topBranchProducts.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No items sold under selected criteria.
                  </div>
                ) : (
                  branchSalesMetrics.topBranchProducts.map((p, idx) => (
                    <div
                      key={p.name}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.units} units sold
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono font-bold text-cyan-300">
                        {formatNaira(p.revenue)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Search & Manager Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search order #, cashier, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Supervisor:</span>
              <select
                value={selectedManagerFilter}
                onChange={(e) => setSelectedManagerFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Supervisors</option>
                {branchManagers.map((m) => (
                  <option key={m.id} value={m.staffCode}>
                    {m.name} ({m.staffCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Branch Manager Supervision</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No orders matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const isSupervised = Boolean(ord.supervisedBy);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(ord.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {ord.locationName || ord.locationId}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {ord.inputerName || ord.cashier}
                          </td>
                          <td className="py-3 px-4">
                            {isSupervised ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>{ord.supervisedBy}</span>
                                </span>
                                {ord.supervisorNotes && (
                                  <div className="text-[10px] text-slate-400 italic">
                                    "{ord.supervisorNotes}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => setSupervisingOrder(ord)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 cursor-pointer"
                              >
                                <span>Supervise Sale</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-slate-400 capitalize">
                              {ord.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {formatNaira(ord.grandTotal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setInspectingOrder(ord)}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Branch Manager Live Activity Feed */}
      {activeSubTab === 'activities' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Supervisor Activity Ledger</span>
            </h3>
            <span className="text-xs text-slate-400">
              Showing last {managerActivities.length} managerial actions
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {managerActivities.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No supervisor activity recorded yet for the selected filter.
              </div>
            ) : (
              managerActivities.map((act) => (
                <div key={act.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{act.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                          {act.inputerId}
                        </span>
                        <span className="text-slate-400 text-xs">• {act.inputerName}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{act.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        {act.locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{act.locationName}</span>
                          </span>
                        )}
                        {act.referenceNumber && (
                          <span className="font-mono text-slate-400">
                            Ref: {act.referenceNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {act.amount !== undefined && (
                      <div className="text-xs font-mono font-bold text-white">
                        {formatNaira(act.amount)}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(act.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: Branch Cashier Oversight & Staff Management */}
      {activeSubTab === 'cashiers' && (
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#222222] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="command-label inline-block">BRANCH STAFF DEPLOYMENT</div>
              <h2 className="font-display text-2xl uppercase tracking-wider text-white mt-1">
                Branch Cashiers &amp; Operations Staff
              </h2>
              <p className="font-mono text-xs text-white/50 mt-1">
                Branch managers can onboard new cashiers, update roles, manage 4-digit terminal PINs, and audit live tills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddStaff()}
              className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register Branch Staff</span>
            </button>
          </div>

          {selectedLocationFilter !== 'all' && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#161616] border border-[#2c2c2c] text-xs font-mono">
              <span className="text-white/70">
                Active Branch Filter:{' '}
                <strong className="text-white">
                  {dbState.locations.find((l) => l.id === selectedLocationFilter)?.name || selectedLocationFilter}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocationFilter('all')}
                className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer text-[11px]"
              >
                Clear Filter (View All Branches)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedLocationFilter === 'all'
              ? dbState.locations
              : dbState.locations.filter((l) => l.id === selectedLocationFilter)
            ).map((loc) => {
              const locManager = branchManagers.find((m) => m.assignedLocationId === loc.id);
              const locCashiers = cashiers.filter((c) => c.assignedLocationId === loc.id);
              const locShift = dbState.shifts.find(
                (s) => s.locationId === loc.id && s.status === 'open'
              );

              return (
                <div
                  key={loc.id}
                  className="bg-[#111111] border border-[#222222] p-5 space-y-4"
                >
                  {/* Branch Header */}
                  <div className="flex items-start justify-between border-b border-[#222222] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white" />
                        <h3 className="font-display text-lg uppercase tracking-wide text-white">{loc.name}</h3>
                      </div>
                      <span className="font-mono text-[11px] text-white/50">{loc.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddStaff(loc.id)}
                        className="px-2.5 py-1 text-[11px] font-mono text-white/80 hover:text-white bg-[#1a1a1a] hover:bg-neutral-800 border border-[#333333] transition-colors cursor-pointer flex items-center gap-1.5"
                        title={`Add new staff assigned directly to ${loc.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Staff</span>
                      </button>
                    </div>
                  </div>

                  {locManager ? (
                    <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#161616] border border-[#222222]">
                      <span className="font-mono text-[10px] text-white/40 uppercase">
                        Supervising Branch Manager:
                      </span>
                      <span className="font-mono font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00ff00]" />
                        <span>{locManager.name} ({locManager.staffCode})</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-2 border border-amber-500/20">
                      No Manager Assigned to this Node
                    </div>
                  )}

                  {/* Shift Till Status */}
                  <div className="p-3 bg-[#0a0a0a] border border-[#222222] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white/40 block font-mono text-[10px] uppercase">Active Shift Till:</span>
                      <span className="font-mono font-bold text-white">
                        {locShift ? locShift.registerId : 'No Open Shift'}
                      </span>
                    </div>
                    {locShift && (
                      <div className="text-right font-mono">
                        <span className="text-white/40 block text-[10px] uppercase">Cash In Till:</span>
                        <span className="text-white font-bold">
                          {formatNaira(locShift.expectedCash)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cashiers & Staff Assigned to This Branch */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-mono text-[11px] text-white/60 uppercase tracking-wider">
                        Branch Staff Rosters ({locCashiers.length})
                      </h4>
                      <span className="text-[10px] font-mono text-white/40">
                        {locCashiers.filter((c) => c.status === 'active').length} active
                      </span>
                    </div>

                    <div className="divide-y divide-[#222222]">
                      {locCashiers.length === 0 ? (
                        <div className="py-4 text-center border border-dashed border-[#222222] p-4 text-white/40 text-xs font-mono">
                          No cashiers or staff assigned to this branch yet.
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAddStaff(loc.id)}
                              className="text-xs text-white underline hover:text-white/80 cursor-pointer"
                            >
                              + Assign First Staff Member
                            </button>
                          </div>
                        </div>
                      ) : (
                        locCashiers.map((cashier) => (
                          <div
                            key={cashier.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#141414] px-2 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-white text-xs">{cashier.name}</span>
                                <span className="font-mono text-[10px] text-white/50 bg-[#1a1a1a] px-1.5 py-0.5 border border-[#333]">
                                  {cashier.staffCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffStatus(cashier)}
                                  title="Toggle Active / Suspended status"
                                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border cursor-pointer ${
                                    cashier.status === 'active'
                                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                      : 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                  }`}
                                >
                                  {cashier.status}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[10px] text-white/40 mt-1">
                                <span className="capitalize">{cashier.role.replace('_', ' ')}</span>
                                <span>•</span>
                                <span>PIN: ••••</span>
                                {cashier.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{cashier.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <div className="text-right font-mono mr-2">
                                <span className="text-white font-bold block text-xs">
                                  {formatNaira(cashier.totalSalesVolume || 0)}
                                </span>
                                <span className="text-[10px] text-white/40">
                                  {cashier.receiptsPrintedCount} receipts
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(cashier)}
                                title="Edit staff details, PIN, or branch"
                                className="p-1.5 text-white/60 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAuditCashierTill(cashier)}
                                title="Perform supervisory live drawer audit and log sign-off"
                                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold text-white bg-[#1a1a1a] hover:bg-neutral-800 border border-[#333333] transition-colors cursor-pointer shrink-0"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-[#00ff00]" />
                                <span>Verify Till</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Branch Manager */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{editingManager ? 'Edit Branch Manager' : 'Add New Branch Manager'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManager} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Staff Code *</label>
                  <input
                    type="text"
                    required
                    value={managerForm.staffCode}
                    onChange={(e) =>
                      setManagerForm({ ...managerForm, staffCode: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. BM-03"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    4-Digit Security PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={managerForm.pin}
                    onChange={(e) => setManagerForm({ ...managerForm, pin: e.target.value })}
                    placeholder="5555"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  placeholder="e.g. Oluwaseun Adeleke"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={managerForm.email}
                    onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                    placeholder="manager@omnistock.internal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={managerForm.phone}
                    onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Assigned Store Branch *
                </label>
                <select
                  value={managerForm.assignedLocationId}
                  onChange={(e) =>
                    setManagerForm({ ...managerForm, assignedLocationId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                >
                  {dbState.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Status</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mgr_status"
                      checked={managerForm.status === 'active'}
                      onChange={() => setManagerForm({ ...managerForm, status: 'active' })}
                    />
                    <span>Active on Duty</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mgr_status"
                      checked={managerForm.status === 'suspended'}
                      onChange={() => setManagerForm({ ...managerForm, status: 'suspended' })}
                    />
                    <span>Suspended</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                >
                  Save Branch Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Supervise Order Sign-off */}
      {supervisingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorize & Supervise Sale</span>
              </h3>
              <button
                onClick={() => setSupervisingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Order:</span>
                <span className="font-mono font-bold text-white">{supervisingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cashier:</span>
                <span className="text-slate-200">{supervisingOrder.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatNaira(supervisingOrder.grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Authorizing Branch Manager:
                </label>
                <select
                  value={selectedSupervisorForSignoff}
                  onChange={(e) => setSelectedSupervisorForSignoff(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                >
                  {branchManagers.map((m) => (
                    <option key={m.id} value={m.staffCode}>
                      {m.name} ({m.staffCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Manager Verification Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified customer ID and authorized discount"
                  value={supervisionNotes}
                  onChange={(e) => setSupervisionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSupervisingOrder(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuperviseOrder}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
              >
                Confirm Supervision Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Branch Staff */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <h3 className="font-display text-lg uppercase tracking-wider text-white">
                  {editingStaff ? 'Edit Branch Staff' : 'Register New Branch Staff'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-3.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">Staff Code *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.staffCode}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, staffCode: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. CSH-05"
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">
                    4-Digit Security PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={staffForm.pin}
                    onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/50 uppercase text-[10px] mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Chinedu Okafor"
                  className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-sans focus:border-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">Operational Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, role: e.target.value as InputerRole })
                    }
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                  >
                    <option value="cashier">Cashier (Record Sales & Payments)</option>
                    <option value="inventory">Inventory (Manage Products & Stock)</option>
                    <option value="manager">Manager (Branch Supervisor)</option>
                    <option value="viewer">Viewer (Read Permitted Records)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">Assigned Branch *</label>
                  <select
                    value={staffForm.assignedLocationId}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, assignedLocationId: e.target.value })
                    }
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                  >
                    {dbState.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/50 uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, status: e.target.value as 'active' | 'suspended' })
                    }
                    className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/50 uppercase text-[10px] mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="staff@omnistock.internal"
                  className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                {editingStaff ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(editingStaff)}
                    className="px-3 py-2 text-red-400 hover:text-red-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
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
                    onClick={() => setShowStaffModal(false)}
                    className="px-3 py-2 text-white/50 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    {editingStaff ? 'Save Changes' : '+ Add Staff'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manager Physical Stock Count & Inventory Adjustment */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111111] border border-[#222222] w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase bg-white text-black px-2 py-0.5 font-bold">
                  BRANCH INVENTORY CONTROL
                </span>
                <h3 className="font-['Oswald'] text-xl uppercase tracking-wide text-white mt-1">
                  Adjust Physical Stock Count
                </h3>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-white/40 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="mt-4 space-y-4">
              <div className="bg-[#0a0a0a] border border-[#222222] p-3">
                <div className="font-mono text-[10px] text-white/50 uppercase">Product</div>
                <div className="text-white font-bold text-sm mt-0.5">{adjustingProduct.name}</div>
                <div className="font-mono text-xs text-white/50 mt-1">
                  SKU: {adjustingProduct.sku} • Current Branch Stock: {adjustingProduct.currentStock} units
                </div>
              </div>

              <div>
                <label className="block text-white/50 uppercase text-[10px] font-mono mb-1">
                  New Physical Count (Quantity on Hand)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono text-lg font-bold focus:border-white focus:outline-none"
                />
                <div className="text-[11px] font-mono text-white/40 mt-1">
                  Variance:{' '}
                  <span
                    className={
                      adjustNewStock - adjustingProduct.currentStock >= 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-red-400 font-bold'
                    }
                  >
                    {adjustNewStock - adjustingProduct.currentStock >= 0 ? '+' : ''}
                    {adjustNewStock - adjustingProduct.currentStock} units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-white/50 uppercase text-[10px] font-mono mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222222] px-3 py-2 text-white font-mono text-xs focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="Periodic Branch Cycle Count">Periodic Branch Cycle Count</option>
                  <option value="Physical Stock Recount & Reconciliation">Physical Stock Recount & Reconciliation</option>
                  <option value="Damaged / Expired Goods Write-off">Damaged / Expired Goods Write-off</option>
                  <option value="Store Shrinkage / Loss Adjustment">Store Shrinkage / Loss Adjustment</option>
                  <option value="Direct Supplier Inbound Delivery Received">Direct Supplier Inbound Delivery Received</option>
                  <option value="Internal Inter-Branch Stock Inflow">Internal Inter-Branch Stock Inflow</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-2 text-white/50 hover:text-white font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Receipt / Thermal Slip */}
      {inspectingOrder && (
        <ReceiptModal order={inspectingOrder} onClose={() => setInspectingOrder(null)} />
      )}
    </div>
  );
};
