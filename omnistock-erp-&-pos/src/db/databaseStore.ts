import {
  Location,
  Product,
  PriceTier,
  InventoryLevel,
  Customer,
  Order,
  OrderItem,
  StockMovement,
  RegisterShift,
  MovementType
} from '../types/database';

import {
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS,
  INITIAL_PRICE_TIERS,
  INITIAL_INVENTORY,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SHIFTS
} from './initialData';

export interface DatabaseState {
  locations: Location[];
  products: Product[];
  priceTiers: PriceTier[];
  inventory: InventoryLevel[];
  customers: Customer[];
  orders: Order[];
  stockMovements: StockMovement[];
  shifts: RegisterShift[];
}

const STORAGE_KEY = 'omnistock_db_state_v1';

class DatabaseStore {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify key tables exist
        if (parsed.products && parsed.inventory && parsed.orders) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage, using initial dataset:', e);
    }

    return {
      locations: [...INITIAL_LOCATIONS],
      products: [...INITIAL_PRODUCTS],
      priceTiers: [...INITIAL_PRICE_TIERS],
      inventory: [...INITIAL_INVENTORY],
      customers: [...INITIAL_CUSTOMERS],
      orders: [...INITIAL_ORDERS],
      stockMovements: [...INITIAL_STOCK_MOVEMENTS],
      shifts: [...INITIAL_SHIFTS]
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save database state to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public resetToFactory() {
    this.state = {
      locations: [...INITIAL_LOCATIONS],
      products: [...INITIAL_PRODUCTS],
      priceTiers: [...INITIAL_PRICE_TIERS],
      inventory: [...INITIAL_INVENTORY],
      customers: [...INITIAL_CUSTOMERS],
      orders: [...INITIAL_ORDERS],
      stockMovements: [...INITIAL_STOCK_MOVEMENTS],
      shifts: [...INITIAL_SHIFTS]
    };
    this.saveState();
  }

  // --- Inventory & Pricing Methods ---

  public getProductStock(productId: string, locationId?: string): number {
    const records = this.state.inventory.filter((inv) => {
      if (locationId) return inv.productId === productId && inv.locationId === locationId;
      return inv.productId === productId;
    });
    return records.reduce((sum, r) => sum + r.quantityOnHand, 0);
  }

  public getProductStockDetails(productId: string) {
    return this.state.inventory
      .filter((inv) => inv.productId === productId)
      .map((inv) => {
        const loc = this.state.locations.find((l) => l.id === inv.locationId);
        return {
          ...inv,
          locationName: loc ? loc.name : inv.locationId,
          locationCode: loc ? loc.code : 'UNKNOWN'
        };
      });
  }

  public calculateProductPrice(
    productId: string,
    quantity: number,
    isWholesale: boolean,
    customerDiscountPercent = 0
  ): {
    unitPrice: number;
    originalPrice: number;
    tierName?: string;
    discountPercent: number;
  } {
    const product = this.state.products.find((p) => p.id === productId);
    if (!product) return { unitPrice: 0, originalPrice: 0, discountPercent: 0 };

    if (!isWholesale) {
      const unitPrice =
        customerDiscountPercent > 0
          ? Number((product.retailPrice * (1 - customerDiscountPercent / 100)).toFixed(2))
          : product.retailPrice;
      return {
        unitPrice,
        originalPrice: product.retailPrice,
        discountPercent: customerDiscountPercent
      };
    }

    // Wholesale calculation: check applicable price tiers
    const tiers = this.state.priceTiers
      .filter((t) => t.productId === productId && quantity >= t.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity);

    if (tiers.length > 0) {
      const bestTier = tiers[0];
      return {
        unitPrice: bestTier.unitPrice,
        originalPrice: product.retailPrice,
        tierName: bestTier.tierLabel,
        discountPercent: bestTier.discountPercent
      };
    }

    // Default wholesale base price if quantity is below tiers
    const wholesalePrice =
      quantity >= product.minWholesaleQty ? product.wholesaleBasePrice : product.retailPrice;

    return {
      unitPrice: wholesalePrice,
      originalPrice: product.retailPrice,
      tierName: quantity >= product.minWholesaleQty ? 'Wholesale Base (MOQ Met)' : undefined,
      discountPercent:
        quantity >= product.minWholesaleQty
          ? Number((((product.retailPrice - product.wholesaleBasePrice) / product.retailPrice) * 100).toFixed(1))
          : 0
    };
  }

  public deductStock(
    productId: string,
    locationId: string,
    quantity: number,
    movementType: MovementType,
    referenceNumber: string,
    reason: string,
    operator: string
  ): boolean {
    const invIndex = this.state.inventory.findIndex(
      (inv) => inv.productId === productId && inv.locationId === locationId
    );

    let prevQty = 0;
    let newQty = 0;

    if (invIndex >= 0) {
      prevQty = this.state.inventory[invIndex].quantityOnHand;
      newQty = Math.max(0, prevQty - quantity);
      this.state.inventory[invIndex] = {
        ...this.state.inventory[invIndex],
        quantityOnHand: newQty,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create record if not found
      prevQty = 0;
      newQty = 0;
      this.state.inventory.push({
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        locationId,
        quantityOnHand: 0,
        quantityReserved: 0,
        batchLot: 'LOT-NEW',
        binLocation: 'Pending Assignment',
        updatedAt: new Date().toISOString()
      });
    }

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      productId,
      locationId,
      type: movementType,
      quantityChange: -quantity,
      previousQty: prevQty,
      newQty,
      referenceNumber,
      reason,
      operator
    };

    this.state.stockMovements.unshift(movement);
    this.saveState();
    return true;
  }

  public restockProduct(
    productId: string,
    locationId: string,
    quantity: number,
    batchLot: string,
    expiryDate: string | undefined,
    referenceNumber: string,
    reason: string,
    operator: string
  ): boolean {
    const invIndex = this.state.inventory.findIndex(
      (inv) => inv.productId === productId && inv.locationId === locationId
    );

    let prevQty = 0;
    let newQty = quantity;

    if (invIndex >= 0) {
      prevQty = this.state.inventory[invIndex].quantityOnHand;
      newQty = prevQty + quantity;
      this.state.inventory[invIndex] = {
        ...this.state.inventory[invIndex],
        quantityOnHand: newQty,
        batchLot: batchLot || this.state.inventory[invIndex].batchLot,
        expiryDate: expiryDate || this.state.inventory[invIndex].expiryDate,
        updatedAt: new Date().toISOString()
      };
    } else {
      this.state.inventory.push({
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        locationId,
        quantityOnHand: quantity,
        quantityReserved: 0,
        batchLot: batchLot || 'LOT-RESTOCK',
        expiryDate,
        binLocation: 'Main Shelf',
        updatedAt: new Date().toISOString()
      });
    }

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      productId,
      locationId,
      type: 'purchase_restock',
      quantityChange: quantity,
      previousQty: prevQty,
      newQty,
      referenceNumber: referenceNumber || `PO-${Date.now().toString().slice(-4)}`,
      reason: reason || 'Inventory Restock Inbound',
      operator: operator || 'Inventory Manager'
    };

    this.state.stockMovements.unshift(movement);
    this.saveState();
    return true;
  }

  public transferStock(
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    reason: string,
    operator: string
  ): { success: boolean; error?: string } {
    if (fromLocationId === toLocationId) {
      return { success: false, error: 'Source and destination locations cannot be identical.' };
    }

    const fromIndex = this.state.inventory.findIndex(
      (i) => i.productId === productId && i.locationId === fromLocationId
    );
    if (fromIndex < 0 || this.state.inventory[fromIndex].quantityOnHand < quantity) {
      return {
        success: false,
        error: `Insufficient stock at source location. Available: ${fromIndex >= 0 ? this.state.inventory[fromIndex].quantityOnHand : 0}`
      };
    }

    const refNum = `TRF-${Date.now().toString().slice(-5)}`;
    const timestamp = new Date().toISOString();

    // Deduct from source
    const sourcePrev = this.state.inventory[fromIndex].quantityOnHand;
    const sourceNew = sourcePrev - quantity;
    this.state.inventory[fromIndex].quantityOnHand = sourceNew;
    this.state.inventory[fromIndex].updatedAt = timestamp;

    this.state.stockMovements.unshift({
      id: `sm_${Date.now()}_src`,
      timestamp,
      productId,
      locationId: fromLocationId,
      type: 'transfer_out',
      quantityChange: -quantity,
      previousQty: sourcePrev,
      newQty: sourceNew,
      referenceNumber: refNum,
      reason: `Transfer outbound to ${this.getLocationName(toLocationId)}: ${reason}`,
      operator
    });

    // Add to destination
    const toIndex = this.state.inventory.findIndex(
      (i) => i.productId === productId && i.locationId === toLocationId
    );
    let destPrev = 0;
    let destNew = quantity;

    if (toIndex >= 0) {
      destPrev = this.state.inventory[toIndex].quantityOnHand;
      destNew = destPrev + quantity;
      this.state.inventory[toIndex].quantityOnHand = destNew;
      this.state.inventory[toIndex].updatedAt = timestamp;
    } else {
      this.state.inventory.push({
        id: `inv_${Date.now()}_dest`,
        productId,
        locationId: toLocationId,
        quantityOnHand: quantity,
        quantityReserved: 0,
        batchLot: this.state.inventory[fromIndex].batchLot,
        binLocation: 'Transit Shelf',
        updatedAt: timestamp
      });
    }

    this.state.stockMovements.unshift({
      id: `sm_${Date.now()}_dest`,
      timestamp,
      productId,
      locationId: toLocationId,
      type: 'transfer_in',
      quantityChange: quantity,
      previousQty: destPrev,
      newQty: destNew,
      referenceNumber: refNum,
      reason: `Transfer inbound from ${this.getLocationName(fromLocationId)}: ${reason}`,
      operator
    });

    this.saveState();
    return { success: true };
  }

  public adjustStock(
    productId: string,
    locationId: string,
    newQuantity: number,
    reason: string,
    operator: string
  ): boolean {
    const invIndex = this.state.inventory.findIndex(
      (i) => i.productId === productId && i.locationId === locationId
    );

    let prevQty = 0;
    if (invIndex >= 0) {
      prevQty = this.state.inventory[invIndex].quantityOnHand;
      this.state.inventory[invIndex].quantityOnHand = newQuantity;
      this.state.inventory[invIndex].updatedAt = new Date().toISOString();
    } else {
      this.state.inventory.push({
        id: `inv_${Date.now()}`,
        productId,
        locationId,
        quantityOnHand: newQuantity,
        quantityReserved: 0,
        batchLot: 'LOT-ADJ',
        binLocation: 'General Bin',
        updatedAt: new Date().toISOString()
      });
    }

    const diff = newQuantity - prevQty;
    this.state.stockMovements.unshift({
      id: `sm_${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId,
      locationId,
      type: diff >= 0 ? 'purchase_restock' : 'adjustment_loss',
      quantityChange: diff,
      previousQty: prevQty,
      newQty: newQuantity,
      referenceNumber: `ADJ-${Date.now().toString().slice(-4)}`,
      reason: reason || 'Manual Physical Audit Adjustment',
      operator
    });

    this.saveState();
    return true;
  }

  // --- POS & Order Execution ---

  public processOrder(orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
    const isWholesale = orderPayload.channel === 'wholesale';
    const prefix = isWholesale ? 'INV-WS' : 'POS-2026';
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `${prefix}-${randomDigits}`;

    const newOrder: Order = {
      ...orderPayload,
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString()
    };

    // Deduct stock for each line item
    orderPayload.items.forEach((item) => {
      this.deductStock(
        item.productId,
        orderPayload.locationId,
        item.quantity,
        isWholesale ? 'wholesale_fulfillment' : 'sale',
        orderNumber,
        isWholesale
          ? `Wholesale order to ${orderPayload.customerCompany || orderPayload.customerName}`
          : 'POS Register Sale',
        orderPayload.cashier
      );
    });

    // Update Customer outstanding balance if Net Terms
    if (isWholesale && orderPayload.paymentStatus === 'pending_net30') {
      const custIndex = this.state.customers.findIndex((c) => c.id === orderPayload.customerId);
      if (custIndex >= 0) {
        this.state.customers[custIndex].outstandingBalance += orderPayload.grandTotal;
      }
    }

    // Update open shift if matching location
    const openShift = this.state.shifts.find(
      (s) => s.locationId === orderPayload.locationId && s.status === 'open'
    );
    if (openShift) {
      if (orderPayload.paymentMethod === 'cash') {
        openShift.cashCollected += orderPayload.grandTotal;
        openShift.expectedCash = openShift.openingFloat + openShift.cashCollected;
      } else if (orderPayload.paymentMethod === 'credit_card' || orderPayload.paymentMethod === 'debit_card') {
        openShift.cardCollected += orderPayload.grandTotal;
      }
    }

    this.state.orders.unshift(newOrder);
    this.saveState();
    return newOrder;
  }

  public closeShift(shiftId: string, actualCashCount: number): RegisterShift | undefined {
    const shiftIndex = this.state.shifts.findIndex((s) => s.id === shiftId);
    if (shiftIndex < 0) return undefined;

    const shift = this.state.shifts[shiftIndex];
    const expected = shift.openingFloat + shift.cashCollected;
    const variance = Number((actualCashCount - expected).toFixed(2));

    this.state.shifts[shiftIndex] = {
      ...shift,
      status: 'closed',
      closedAt: new Date().toISOString(),
      actualCashCount,
      cashVariance: variance
    };

    this.saveState();
    return this.state.shifts[shiftIndex];
  }

  public openNewShift(locationId: string, cashier: string, openingFloat: number): RegisterShift {
    const newShift: RegisterShift = {
      id: `shift_${Date.now()}`,
      registerId: `REG-${Date.now().toString().slice(-4)}`,
      locationId,
      cashier,
      openingFloat,
      openedAt: new Date().toISOString(),
      cashCollected: 0,
      cardCollected: 0,
      expectedCash: openingFloat,
      status: 'open'
    };

    this.state.shifts.unshift(newShift);
    this.saveState();
    return newShift;
  }

  // --- CRUD helpers ---

  public addProduct(product: Omit<Product, 'id'>, initialStock: number, locationId: string): Product {
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}`
    };

    this.state.products.push(newProduct);

    // Seed inventory for this product at the specified location
    this.state.inventory.push({
      id: `inv_${Date.now()}`,
      productId: newProduct.id,
      locationId: locationId || 'loc_wh_central',
      quantityOnHand: initialStock,
      quantityReserved: 0,
      batchLot: 'LOT-NEW-INIT',
      binLocation: 'Aisle 1',
      updatedAt: new Date().toISOString()
    });

    this.state.stockMovements.unshift({
      id: `sm_${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId: newProduct.id,
      locationId: locationId || 'loc_wh_central',
      type: 'purchase_restock',
      quantityChange: initialStock,
      previousQty: 0,
      newQty: initialStock,
      referenceNumber: 'INIT-NEW-SKU',
      reason: 'Initial SKU Registration & Stock Ingestion',
      operator: 'System Admin'
    });

    this.saveState();
    return newProduct;
  }

  public addPriceTier(tier: Omit<PriceTier, 'id'>): PriceTier {
    const newTier: PriceTier = {
      ...tier,
      id: `tier_${Date.now()}`
    };
    this.state.priceTiers.push(newTier);
    this.saveState();
    return newTier;
  }

  public addCustomer(customer: Omit<Customer, 'id' | 'outstandingBalance'>): Customer {
    const newCustomer: Customer = {
      ...customer,
      id: `cust_${Date.now()}`,
      outstandingBalance: 0
    };
    this.state.customers.push(newCustomer);
    this.saveState();
    return newCustomer;
  }

  public getLocationName(locationId: string): string {
    const loc = this.state.locations.find((l) => l.id === locationId);
    return loc ? loc.name : locationId;
  }

  // --- Relational SQL Query Simulator ---
  public executeQuery(sqlString: string): {
    columns: string[];
    rows: any[][];
    executionTimeMs: number;
    rowCount: number;
    error?: string;
  } {
    const startTime = performance.now();
    const cleanSql = sqlString.trim();

    try {
      // Basic SQL parser for standard SELECT queries
      const selectMatch = cleanSql.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

      if (!selectMatch) {
        // Fallback: evaluate table name from query
        const simpleTable = cleanSql.match(/FROM\s+([a-zA-Z_]+)/i);
        if (simpleTable && (this.state as any)[simpleTable[1]]) {
          const tableName = simpleTable[1];
          const rawData = (this.state as any)[tableName] || [];
          const columns = rawData.length > 0 ? Object.keys(rawData[0]) : [];
          const rows = rawData.slice(0, 50).map((r: any) => columns.map((col) => r[col]));
          return {
            columns,
            rows,
            executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
            rowCount: rows.length
          };
        }
        return {
          columns: ['status', 'message'],
          rows: [['Query parsed', 'Executed successfully against database memory buffer.']],
          executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
          rowCount: 1
        };
      }

      const [, rawCols, tableName, rawWhere, rawOrderBy, rawLimit] = selectMatch;

      // Map table name to state property
      const tableMap: Record<string, keyof DatabaseState> = {
        products: 'products',
        inventory: 'inventory',
        inventory_levels: 'inventory',
        locations: 'locations',
        price_tiers: 'priceTiers',
        customers: 'customers',
        orders: 'orders',
        stock_movements: 'stockMovements',
        shifts: 'shifts'
      };

      const key = tableMap[tableName.toLowerCase()];
      if (!key || !(this.state as any)[key]) {
        return {
          columns: ['error'],
          rows: [[`Table '${tableName}' does not exist in schema. Available tables: ${Object.keys(tableMap).join(', ')}`]],
          executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
          rowCount: 0,
          error: `Table '${tableName}' not found`
        };
      }

      let data = [...(this.state as any)[key]];

      // Handle simple WHERE
      if (rawWhere) {
        const whereClause = rawWhere.trim();
        if (whereClause.includes('=')) {
          const [field, val] = whereClause.split('=').map((s) => s.trim().replace(/['"]/g, ''));
          data = data.filter((item) => {
            const itemVal = String(item[field] ?? '').toLowerCase();
            return itemVal === val.toLowerCase();
          });
        }
      }

      // Handle simple ORDER BY
      if (rawOrderBy) {
        const [field, dir] = rawOrderBy.trim().split(/\s+/);
        const isDesc = dir && dir.toUpperCase() === 'DESC';
        data.sort((a, b) => {
          const va = a[field];
          const vb = b[field];
          if (va < vb) return isDesc ? 1 : -1;
          if (va > vb) return isDesc ? -1 : 1;
          return 0;
        });
      }

      // Handle LIMIT
      if (rawLimit) {
        const lim = parseInt(rawLimit, 10);
        data = data.slice(0, lim);
      } else {
        data = data.slice(0, 100);
      }

      // Columns
      let columns: string[] = [];
      if (rawCols.trim() === '*') {
        columns = data.length > 0 ? Object.keys(data[0]) : [];
      } else {
        columns = rawCols.split(',').map((c) => c.trim());
      }

      const rows = data.map((item) => {
        return columns.map((col) => {
          const val = item[col];
          if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
          }
          return val !== undefined ? val : 'NULL';
        });
      });

      return {
        columns,
        rows,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        rowCount: rows.length
      };
    } catch (err: any) {
      return {
        columns: ['error'],
        rows: [[err.message || 'Error processing SQL statement']],
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        rowCount: 0,
        error: err.message
      };
    }
  }
}

export const dbStore = new DatabaseStore();
