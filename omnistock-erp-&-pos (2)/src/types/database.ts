export type LocationType = 'warehouse' | 'retail_store' | 'distribution_center';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address: string;
  isPrimary: boolean;
}

export interface PriceTier {
  id: string;
  productId: string;
  minQuantity: number;
  tierLabel: string;
  unitPrice: number;
  discountPercent: number;
}

export interface ProductVariation {
  id: string;
  name: string; // e.g. "500g", "1kg", "Small", "Medium", "Large", "Pack of 6"
  sku?: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice?: number;
  costPrice?: number;
  stock?: number;
  inStock?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  costPrice: number;
  retailPrice: number;
  wholesaleBasePrice: number;
  minWholesaleQty: number;
  imageUrl?: string;
  taxRate: number;
  reorderThreshold: number;
  targetStockLevel: number;
  hasVariations?: boolean;
  variationType?: string; // e.g. "Size", "Weight / Volume", "Pack Size", "Color"
  variations?: ProductVariation[];
}

export interface InventoryLevel {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  batchLot: string;
  expiryDate?: string;
  binLocation: string;
  updatedAt: string;
}

export type MovementType =
  | 'sale'
  | 'wholesale_fulfillment'
  | 'purchase_restock'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_loss'
  | 'return';

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  locationId: string;
  type: MovementType;
  quantityChange: number;
  previousQty: number;
  newQty: number;
  referenceNumber: string;
  reason: string;
  operator: string;
}

export type CustomerType = 'retail_walkin' | 'wholesale_business' | 'vip_retail';
export type PaymentTerms = 'immediate' | 'net15' | 'net30' | 'net60';

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  type: CustomerType;
  taxId?: string;
  resaleCertVerified: boolean;
  email: string;
  phone: string;
  paymentTerms: PaymentTerms;
  creditLimit: number;
  outstandingBalance: number;
  discountTier?: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  originalPrice: number;
  appliedTierName?: string;
  subtotal: number;
  totalCost: number;
}

export type OrderChannel = 'retail' | 'wholesale';
export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'net_terms_invoice'
  | 'wire_transfer'
  | 'bank_transfer'
  | 'split';
export type PaymentStatus = 'paid' | 'pending_net30' | 'partially_paid' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  channel: OrderChannel;
  locationId: string;
  locationName: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerTaxId?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  costTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashTendered?: number;
  cashChange?: number;
  cashier: string;
  inputerId?: string;
  inputerName?: string;
  paidAmount?: number;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  refundRestocked?: boolean;
  receiptPrinted?: boolean;
  notes?: string;
  bankAccountId?: string;
  bankName?: string;
  bankTransactionRef?: string;
  nipSessionId?: string;
  posRrn?: string;
  posCardScheme?: string;
  bankVerified?: boolean;
  bankVerifiedAt?: string;
  supervisedBy?: string; // Branch manager staff code or name
  supervisedAt?: string; // ISO timestamp of manager sign-off
  supervisorNotes?: string;
  createdAt: string;
}

export interface LinkedBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string; // e.g. "•••• 6821" or raw digits
  cbnBankCode?: string; // CBN / NIBSS bank routing code e.g. "058", "50515"
  nuban?: string; // 10-digit NUBAN
  ussdCode?: string; // USSD quick dial prefix e.g. "*737#", "*5573#"
  posTerminalId?: string; // Terminal ID for in-store POS (e.g. "2034MN88")
  posMerchantId?: string; // Merchant ID
  routingNumber?: string;
  swiftBic?: string;
  currency: string;
  accountType: 'checking' | 'savings' | 'merchant_settlement';
  isDefault: boolean;
  status: 'active' | 'pending_verification' | 'disconnected';
  balance: number;
  lastSyncedAt: string;
  autoVerifyIncoming: boolean;
}

export type BankTransactionType = 'credit_sale' | 'wholesale_settlement' | 'transfer_in' | 'payout';
export type BankVerificationStatus = 'verified' | 'pending' | 'failed';

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankName: string;
  orderId?: string;
  orderNumber?: string;
  referenceCode: string;
  nipSessionId?: string; // 30-digit NIBSS Instant Payment (NIP) session reference
  posRrn?: string; // 12-digit Retrieval Reference Number for Nigerian POS card payments
  cardScheme?: 'verve' | 'mastercard' | 'visa' | 'other';
  type: BankTransactionType;
  amount: number;
  currency: string;
  senderName: string;
  status: BankVerificationStatus;
  verifiedAt?: string;
  verifiedBy: 'auto_bank_webhook' | 'instant_api' | 'manual_admin' | 'nibss_nip_instant' | 'pos_terminal_sync';
  description: string;
  createdAt: string;
}

export type InputerRole =
  | 'branch_manager'
  | 'shift_supervisor'
  | 'senior_cashier'
  | 'retail_inputer'
  | 'wholesale_inputer';

export type InputerStatus = 'active' | 'suspended';

export interface Inputer {
  id: string;
  staffCode: string; // e.g. "INP-01", "BM-01"
  name: string;
  email: string;
  phone: string;
  pin: string; // 4-digit quick access PIN for POS web terminal
  role: InputerRole;
  assignedLocationId: string;
  status: InputerStatus;
  receiptsPrintedCount: number;
  totalSalesVolume: number;
  createdAt: string;
  lastActiveAt?: string;
}

export interface RegisterShift {
  id: string;
  registerId: string;
  locationId: string;
  cashier: string;
  openingFloat: number;
  openedAt: string;
  closedAt?: string;
  cashCollected: number;
  cardCollected: number;
  expectedCash: number;
  actualCashCount?: number;
  cashVariance?: number;
  status: 'open' | 'closed';
}

export type InputerActionType =
  | 'login'
  | 'sale_completed'
  | 'receipt_printed'
  | 'stock_adjustment'
  | 'shift_opened'
  | 'shift_closed'
  | 'pin_updated'
  | 'sale_supervised'
  | 'shift_supervised'
  | 'cashier_audit'
  | 'branch_review';

export interface InputerActivity {
  id: string;
  inputerId: string; // Staff code or Inputer ID (e.g. "INP-01", "BM-01")
  inputerName: string;
  actionType: InputerActionType;
  title: string;
  description: string;
  locationId?: string;
  locationName?: string;
  referenceNumber?: string;
  amount?: number;
  timestamp: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. "PO-2026-081"
  supplierName: string;
  supplierEmail?: string;
  supplierContact?: string;
  destinationLocationId: string;
  destinationLocationName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  createdAt: string;
  expectedDeliveryDate?: string;
  receivedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  entityType: 'order' | 'inventory' | 'product' | 'location' | 'purchase_order' | 'customer' | 'bank' | 'auth';
  entityId: string;
  details: string;
  ipAddress?: string;
}


