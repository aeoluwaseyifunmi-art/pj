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
  notes?: string;
  createdAt: string;
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
