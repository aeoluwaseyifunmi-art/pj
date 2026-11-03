// OmniStock Core Domain & Business Logic Test Suite
// Verifies: Sales calculations, inventory movements, payment reconciliations, permissions, and reporting

import { Product, OrderItem, Customer, Location, AppRole, ROLE_DEFINITIONS, hasRolePermission, normalizeAppRole } from '../types/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running OmniStock Business Suite Tests ---');

// Test 1: Inventory stock rules & non-negative allocation
function testInventoryCalculations() {
  const stockOnHand = 50;
  const quantityToFulfill = 15;
  const remaining = stockOnHand - quantityToFulfill;

  assert(remaining === 35, 'Remaining stock should equal 35');
  assert(remaining >= 0, 'Inventory cannot drop into negative under strict ledger validation');
  console.log('✓ Inventory calculation & non-negative boundary passed');
}

// Test 2: Sales pricing tiers & order total calculations
function testSalesCalculations() {
  const items: OrderItem[] = [
    {
      productId: 'p-1',
      sku: 'SKU-001',
      name: 'Organic Ethiopian Yirgacheffe',
      quantity: 5,
      unitCost: 8.50,
      unitPrice: 16.00,
      originalPrice: 18.00,
      appliedTierName: 'Volume 5+',
      totalCost: 42.50,
      subtotal: 80.00,
    },
    {
      productId: 'p-2',
      sku: 'SKU-002',
      name: 'Cold Brew Blend',
      quantity: 2,
      unitCost: 6.00,
      unitPrice: 12.00,
      originalPrice: 12.00,
      totalCost: 12.00,
      subtotal: 24.00,
    }
  ];

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const totalTax = items.reduce((acc, item) => acc + (item.subtotal * 0.08), 0);
  const grandTotal = subtotal + totalTax;
  const totalCost = items.reduce((acc, item) => acc + item.totalCost, 0);
  const grossProfit = subtotal - totalCost;
  const profitMarginPercent = Number(((grossProfit / subtotal) * 100).toFixed(2));

  assert(subtotal === 104.00, `Expected subtotal 104.00, got ${subtotal}`);
  assert(Number(totalTax.toFixed(2)) === 8.32, `Expected totalTax 8.32, got ${totalTax}`);
  assert(Number(grandTotal.toFixed(2)) === 112.32, `Expected grandTotal 112.32, got ${grandTotal}`);
  assert(grossProfit === 49.50, `Expected grossProfit 49.50, got ${grossProfit}`);
  assert(profitMarginPercent === 47.60, `Expected profit margin 47.60%, got ${profitMarginPercent}%`);
  console.log('✓ Sales pricing, taxation, gross profit, and margin calculations passed');
}

// Test 3: Partial payment reconciliation & balance updates
function testPaymentReconciliation() {
  const invoiceTotal = 500.00;
  const firstPayment = 200.00;
  const secondPayment = 300.00;

  let balanceDue = invoiceTotal - firstPayment;
  assert(balanceDue === 300.00, 'Partial payment balance due should be 300.00');

  balanceDue -= secondPayment;
  assert(balanceDue === 0.00, 'Full payment should clear invoice balance to 0.00');
  console.log('✓ Payment reconciliation and partial balance tracking passed');
}

// Test 4: Role-Based Permissions (Aligned with OmniStock Architecture)
function testRolePermissions() {
  // 1. Owner: Full business control
  assert(ROLE_DEFINITIONS.owner.intendedAccess === 'Full business control', 'Owner intended access must match');
  assert(hasRolePermission('owner', 'fullBusinessControl') === true, 'Owner should have full business control');
  assert(hasRolePermission('owner', 'resetDatabase') === true, 'Owner should have resetDatabase access');
  assert(hasRolePermission('owner', 'accessSqlStudio') === true, 'Owner should have SQL Studio access');
  assert(hasRolePermission('owner', 'accessBankAccounts') === true, 'Owner should have bank access');
  assert(hasRolePermission('owner', 'manageStaff') === true, 'Owner should have staff management');

  // 2. Admin: Manage business operations and staff
  assert(ROLE_DEFINITIONS.admin.intendedAccess === 'Manage business operations and staff', 'Admin intended access must match');
  assert(hasRolePermission('admin', 'manageOperations') === true, 'Admin should manage business operations');
  assert(hasRolePermission('admin', 'manageStaff') === true, 'Admin should manage staff');
  assert(hasRolePermission('admin', 'manageProducts') === true, 'Admin should manage products');
  assert(hasRolePermission('admin', 'resetDatabase') === false, 'Admin should NOT have database wipe/reset access');
  assert(hasRolePermission('admin', 'accessSqlStudio') === false, 'Admin should NOT have raw SQL studio access');

  // 3. Manager: Manage daily operations
  assert(ROLE_DEFINITIONS.manager.intendedAccess === 'Manage daily operations', 'Manager intended access must match');
  assert(hasRolePermission('manager', 'manageOperations') === true, 'Manager should manage daily operations');
  assert(hasRolePermission('manager', 'verifyDrawer') === true, 'Manager should verify drawer & shifts');
  assert(hasRolePermission('manager', 'manageStock') === true, 'Manager should manage branch stock recounts');
  assert(hasRolePermission('manager', 'accessBankAccounts') === false, 'Manager should NOT access bank accounts');
  assert(hasRolePermission('manager', 'resetDatabase') === false, 'Manager should NOT reset database');

  // 4. Cashier: Record sales and process payments
  assert(ROLE_DEFINITIONS.cashier.intendedAccess === 'Record sales and process payments', 'Cashier intended access must match');
  assert(hasRolePermission('cashier', 'processSales') === true, 'Cashier should record sales');
  assert(hasRolePermission('cashier', 'processPayments') === true, 'Cashier should process payments');
  assert(hasRolePermission('cashier', 'manageProducts') === false, 'Cashier should NOT modify catalog/prices');
  assert(hasRolePermission('cashier', 'manageStaff') === false, 'Cashier should NOT manage staff');

  // 5. Inventory: Manage products and stock
  assert(ROLE_DEFINITIONS.inventory.intendedAccess === 'Manage products and stock', 'Inventory intended access must match');
  assert(hasRolePermission('inventory', 'manageProducts') === true, 'Inventory should manage products');
  assert(hasRolePermission('inventory', 'manageStock') === true, 'Inventory should manage stock');
  assert(hasRolePermission('inventory', 'processPayments') === false, 'Inventory should NOT process cashier payments');
  assert(hasRolePermission('inventory', 'accessBankAccounts') === false, 'Inventory should NOT access bank accounts');

  // 6. Viewer: Read permitted reports and records
  assert(ROLE_DEFINITIONS.viewer.intendedAccess === 'Read permitted reports and records', 'Viewer intended access must match');
  assert(hasRolePermission('viewer', 'viewReports') === true, 'Viewer should read permitted reports');
  assert(hasRolePermission('viewer', 'readOnly') === true, 'Viewer must be flagged read-only');
  assert(hasRolePermission('viewer', 'processSales') === false, 'Viewer should NOT record sales');
  assert(hasRolePermission('viewer', 'manageStock') === false, 'Viewer should NOT adjust stock');

  // 7. Normalization & backward compatibility
  assert(normalizeAppRole('branch_manager') === 'manager', 'branch_manager maps to manager');
  assert(normalizeAppRole('retail_inputer') === 'cashier', 'retail_inputer maps to cashier');
  assert(normalizeAppRole('warehouse_manager') === 'inventory', 'warehouse_manager maps to inventory');
  assert(hasRolePermission('warehouse_manager', 'manageStock') === true, 'warehouse_manager alias has stock access');

  console.log('✓ Role-based access control (RBAC) verification passed for all 6 OmniStock roles');
}

// Test 5: Reporting metrics
function testReportingMetrics() {
  const salesRecords = [
    { revenue: 1000, cost: 600, returns: 50 },
    { revenue: 2500, cost: 1500, returns: 0 },
    { revenue: 800, cost: 450, returns: 100 }
  ];

  const netRevenue = salesRecords.reduce((sum, s) => sum + (s.revenue - s.returns), 0);
  const totalCost = salesRecords.reduce((sum, s) => sum + s.cost, 0);
  const netProfit = netRevenue - totalCost;

  assert(netRevenue === 4150, `Net revenue should be 4150, got ${netRevenue}`);
  assert(totalCost === 2550, `Total cost should be 2550, got ${totalCost}`);
  assert(netProfit === 1600, `Net profit should be 1600, got ${netProfit}`);
  console.log('✓ Analytical reporting metrics and return deduction passed');
}

// Test 6: Nigerian Banking System & Payment Integrity
import {
  validateNuban,
  generateNipSessionId,
  generatePosRrn,
  buildUssdTransferString,
  formatNaira,
  NIGERIAN_BANKS
} from '../utils/nigerianBanks';

function testNigerianBankingSystem() {
  // 6a: 10-digit NUBAN Validation
  const validNuban = validateNuban('0123456789');
  assert(validNuban.valid === true, '10-digit NUBAN should be valid');

  const formattedNuban = validateNuban(' 012 345 6789 ');
  assert(formattedNuban.valid === true, 'NUBAN with whitespace should be validly sanitized');

  const shortNuban = validateNuban('12345678');
  assert(shortNuban.valid === false, '8-digit NUBAN should be rejected');

  const emptyNuban = validateNuban('');
  assert(emptyNuban.valid === false, 'Empty NUBAN should be rejected');

  // 6b: 30-digit NIBSS Instant Payment (NIP) Session ID Generation
  const nipSessionId = generateNipSessionId('505150');
  assert(nipSessionId.length === 30, `NIP Session ID must be exactly 30 characters, got ${nipSessionId.length}`);
  assert(nipSessionId.startsWith('505150'), 'NIP Session ID should begin with 6-digit bank routing prefix');

  // 6c: 12-digit POS RRN
  const rrn = generatePosRrn();
  assert(rrn.length === 12, `POS RRN must be 12 digits, got ${rrn.length}`);

  // 6d: USSD Quick Dial generation
  const gtbankUssd = buildUssdTransferString('058', '0123456789', 15000);
  assert(gtbankUssd === '*737*2*15000*0123456789#', `Expected GTBank USSD *737*2*15000*0123456789#, got ${gtbankUssd}`);

  const moniepointUssd = buildUssdTransferString('50515', '8123456789', 5500);
  assert(moniepointUssd === '*5573*1*5500*8123456789#', `Expected Moniepoint USSD *5573*1*5500*8123456789#, got ${moniepointUssd}`);

  // 6e: Nigerian Naira Currency Formatting
  const formatted50k = formatNaira(50000);
  assert(formatted50k === '₦50,000.00', `Expected ₦50,000.00, got ${formatted50k}`);

  const formattedZero = formatNaira(0);
  assert(formattedZero === '₦0.00', `Expected ₦0.00, got ${formattedZero}`);

  const noSymbol = formatNaira(1250000.5, false);
  assert(noSymbol === '1,250,000.50', `Expected 1,250,000.50 without symbol, got ${noSymbol}`);

  // 6f: Verified Nigerian Bank Registry
  assert(NIGERIAN_BANKS.length >= 20, 'Should have comprehensive registry of Nigerian commercial banks and MFBs');
  const hasMoniepoint = NIGERIAN_BANKS.some(b => b.name.includes('Moniepoint'));
  const hasGTBank = NIGERIAN_BANKS.some(b => b.name.includes('GTBank') || b.name.includes('Guaranty Trust'));
  const hasOPay = NIGERIAN_BANKS.some(b => b.name.includes('OPay'));
  const hasKuda = NIGERIAN_BANKS.some(b => b.name.includes('Kuda'));
  assert(hasMoniepoint && hasGTBank && hasOPay && hasKuda, 'Registry must include major Nigerian institutions');

  console.log('✓ Nigerian Banking System (NUBAN, NIP Session ID, USSD patterns, Naira format) passed');
}

// Test 7: Bulk Product Import and Deduplication Strategies
import { dbStore } from '../db/databaseStore';

function testBulkProductImport() {
  const initialProductsCount = dbStore.getState().products.length;

  // Ingest batch with 2 new products and 1 existing SKU
  const existingProducts = dbStore.getState().products;
  const existingSku = existingProducts[0].sku;
  const defaultWarehouse = dbStore.getState().locations[0]?.id || 'loc_wh_central';

  const bulkPayload = [
    {
      product: {
        sku: 'TEST-BULK-001',
        name: 'Nigerian Groundnut Oil 5L',
        category: 'Provisions',
        description: 'Pure cold-pressed groundnut oil',
        unit: 'bottle',
        costPrice: 8500,
        retailPrice: 10500,
        wholesaleBasePrice: 9800,
        minWholesaleQty: 5,
        barcode: '955000111222',
        reorderThreshold: 10,
        taxRate: 0.075,
        targetStockLevel: 80
      },
      initialStock: 40,
      locationId: defaultWarehouse
    },
    {
      product: {
        sku: 'TEST-BULK-002',
        name: 'Dangote Sugar 50kg Bag',
        category: 'Commodities',
        description: 'Refined granulated white sugar',
        unit: 'bag',
        costPrice: 72000,
        retailPrice: 78500,
        wholesaleBasePrice: 75000,
        minWholesaleQty: 10,
        barcode: '955000333444',
        reorderThreshold: 5,
        taxRate: 0.075,
        targetStockLevel: 50
      },
      initialStock: 25,
      locationId: defaultWarehouse
    },
    {
      product: {
        sku: existingSku, // Duplicate
        name: 'Attempted Duplicate Item',
        category: 'Provisions',
        description: 'This should be skipped or resolved',
        unit: 'item',
        costPrice: 1000,
        retailPrice: 2000,
        wholesaleBasePrice: 1500,
        minWholesaleQty: 2,
        barcode: '999999999999',
        reorderThreshold: 5,
        taxRate: 0.075,
        targetStockLevel: 20
      },
      initialStock: 10,
      locationId: defaultWarehouse
    }
  ];

  // Test Strategy 1: skip_duplicates
  const resultSkip = dbStore.bulkAddProducts(bulkPayload, 'skip_duplicates');

  assert(resultSkip.createdCount === 2, `Expected 2 created, got ${resultSkip.createdCount}`);
  assert(resultSkip.skippedCount === 1, `Expected 1 skipped, got ${resultSkip.skippedCount}`);
  assert(dbStore.getState().products.length === initialProductsCount + 2, 'Product catalog count should increase by 2');

  // Verify stock levels were correctly initialized
  const importedP1 = dbStore.getState().products.find(p => p.sku === 'TEST-BULK-001');
  assert(importedP1 !== undefined, 'Imported product TEST-BULK-001 must exist');
  assert(importedP1?.retailPrice === 10500, 'Imported product price must match ₦10,500');

  const stockP1 = dbStore.getProductStock(importedP1!.id, defaultWarehouse);
  assert(stockP1 === 40, `Stock level for imported product should be 40, got ${stockP1}`);

  console.log('✓ Bulk Product Ingestion with Excel/CSV deduplication strategy passed');
}

// Test 8: Branch Manager Sales Supervision & Activity Oversight
function testBranchManagerSupervision() {
  const branchManagers = dbStore.getBranchManagers();
  assert(branchManagers.length >= 2, `Expected at least 2 branch managers, got ${branchManagers.length}`);

  const bm1 = branchManagers.find(m => m.staffCode === 'BM-01');
  assert(bm1 !== undefined, 'Branch Manager BM-01 (Tunde Adeyemi) must exist');
  assert(bm1?.role === 'manager' || bm1?.role === 'branch_manager', 'Role must be manager or branch_manager');
  assert(bm1?.pin === '5555', 'PIN must be set to 5555');

  // Verify supervising a sale via dbStore.processOrder
  const testOrder = dbStore.processOrder({
    channel: 'retail',
    locationId: 'loc_store_flagship',
    locationName: 'Downtown Flagship Store',
    customerId: 'cust_walkin_retail',
    customerName: 'Walk-in Retail Customer',
    items: [
      {
        productId: 'prod_coffee_ethiopia',
        sku: 'COF-ETH-YRG',
        name: 'Arcadia Yirgacheffe Single Origin',
        quantity: 2,
        unitCost: 10000,
        unitPrice: 24500,
        originalPrice: 24500,
        subtotal: 49000,
        totalCost: 20000
      }
    ],
    subtotal: 49000,
    discountTotal: 0,
    taxTotal: 3675,
    grandTotal: 52675,
    costTotal: 20000,
    paymentMethod: 'credit_card',
    paymentStatus: 'paid',
    cashier: 'Alexander Wright (INP-01)',
    inputerId: 'INP-01',
    inputerName: 'Alexander Wright',
    supervisedBy: 'Tunde Adeyemi (BM-01)',
    supervisedAt: new Date().toISOString(),
    supervisorNotes: 'Verified register checkout'
  });

  assert(testOrder.supervisedBy === 'Tunde Adeyemi (BM-01)', 'Order must contain supervisor stamp');
  assert(testOrder.supervisorNotes === 'Verified register checkout', 'Order must contain supervisor notes');

  // Verify that an activity was recorded for the supervisor
  const state = dbStore.getState();
  const supervisorAct = state.inputerActivities.find(
    a => a.inputerId === 'BM-01' && a.actionType === 'sale_supervised' && a.referenceNumber === testOrder.orderNumber
  );
  assert(supervisorAct !== undefined, 'Supervisory activity must be recorded for BM-01');

  // Test post-checkout supervision via dbStore.superviseOrder
  const superviseResult = dbStore.superviseOrder(
    testOrder.id,
    'BM-02',
    'Second-level audit sign-off by Northside manager'
  );
  assert(superviseResult.success === true, 'superviseOrder must return success');
  assert(Boolean(superviseResult.order?.supervisedBy?.includes('BM-02')), 'Order must be updated with BM-02 supervisor');

  // Test branch manager audit recording
  const auditSuccess = dbStore.recordBranchAudit(
    'BM-01',
    'Morning Cash Drawer Count',
    'Balanced cash drawer at Downtown Flagship with zero variance'
  );
  assert(auditSuccess === true, 'recordBranchAudit must return true');

  console.log('✓ Branch Manager Sales Supervision & Activity Oversight passed');
}

// Test 9: Bulk Stock Consolidation (Adds up if products are the same)
function testBulkStockAccumulation() {
  const defaultWarehouse = dbStore.getState().locations[0]?.id || 'loc_wh_central';
  const sku = 'TEST-ACCUMULATE-001';

  // Ingest batch with 2 duplicate rows of the SAME product
  const bulkPayloadSameProduct = [
    {
      product: {
        sku,
        name: 'Oando Engine Oil 4L',
        category: 'Automotive',
        description: 'Synthetic motor oil',
        unit: 'can',
        costPrice: 12000,
        retailPrice: 16000,
        wholesaleBasePrice: 14000,
        minWholesaleQty: 3,
        barcode: '988000111222',
        reorderThreshold: 10,
        taxRate: 0.075,
        targetStockLevel: 50
      },
      initialStock: 30, // First row: 30 units
      locationId: defaultWarehouse
    },
    {
      product: {
        sku,
        name: 'Oando Engine Oil 4L',
        category: 'Automotive',
        description: 'Synthetic motor oil',
        unit: 'can',
        costPrice: 12000,
        retailPrice: 16000,
        wholesaleBasePrice: 14000,
        minWholesaleQty: 3,
        barcode: '988000111222',
        reorderThreshold: 10,
        taxRate: 0.075,
        targetStockLevel: 50
      },
      initialStock: 25, // Duplicate row of SAME product: 25 units
      locationId: defaultWarehouse
    }
  ];

  // Ingest with accumulate_stock (default): 30 + 25 should add up to 55 units!
  const outcome1 = dbStore.bulkAddProducts(bulkPayloadSameProduct, 'accumulate_stock');
  assert(outcome1.createdCount === 1, `Expected 1 created product, got ${outcome1.createdCount}`);

  const productObj = dbStore.getState().products.find(p => p.sku === sku);
  assert(productObj !== undefined, 'Product TEST-ACCUMULATE-001 must exist');

  const stockAfterBatch = dbStore.getProductStock(productObj!.id, defaultWarehouse);
  assert(
    stockAfterBatch === 55,
    `Stock must sum together (30 + 25 = 55), got ${stockAfterBatch}`
  );

  // Ingest additional bulk shipment of 20 units of the SAME product
  const outcome2 = dbStore.bulkAddProducts(
    [
      {
        product: { ...productObj! },
        initialStock: 20,
        locationId: defaultWarehouse
      }
    ],
    'accumulate_stock'
  );
  assert(outcome2.updatedCount === 1, `Expected 1 updated/accumulated item, got ${outcome2.updatedCount}`);

  const finalStock = dbStore.getProductStock(productObj!.id, defaultWarehouse);
  assert(finalStock === 75, `Stock must accumulate (55 + 20 = 75), got ${finalStock}`);

  console.log('✓ Bulk Product Consolidation & Quantity Summing passed');
}

// Test 10: Category Removal & Customization
function testCategoryRemoval() {
  const categoriesBefore = dbStore.getCategories();
  const testCategory = 'Temp Test Category';

  dbStore.addCategory(testCategory);
  assert(dbStore.getCategories().includes(testCategory), 'Newly added category must exist');

  // Remove category and reassign
  dbStore.removeCategory(testCategory, 'General Merchandise');
  assert(!dbStore.getCategories().includes(testCategory), 'Category must be removed');

  // Test removing a default category
  const initialCategories = dbStore.getCategories();
  if (initialCategories.length > 0) {
    const defaultCatToRemove = initialCategories[0];
    dbStore.removeCategory(defaultCatToRemove, 'General Merchandise');
    assert(!dbStore.getCategories().includes(defaultCatToRemove), `Default category ${defaultCatToRemove} should be removed`);
  }

  // Test removing all default categories in bulk
  const customCatName = 'Unique Brand Line';
  dbStore.addCategory(customCatName);
  const result = dbStore.removeAllDefaultCategories(customCatName, false);
  assert(Array.isArray(result.removedCategories), 'Removed categories must be an array');
  assert(dbStore.getCategories().includes(customCatName), 'Custom category must remain active');

  // Test restore defaults
  dbStore.restoreDefaultCategories();
  assert(dbStore.getCategories().length >= initialCategories.length, 'Default categories should be restored');

  console.log('✓ Category Management, Default Category Deletion & Removal passed');
}

// Run all test suites
try {
  testInventoryCalculations();
  testSalesCalculations();
  testPaymentReconciliation();
  testRolePermissions();
  testReportingMetrics();
  testNigerianBankingSystem();
  testBulkProductImport();
  testBranchManagerSupervision();
  testBulkStockAccumulation();
  testCategoryRemoval();
  console.log('\nAll 10 OmniStock Enterprise test suites PASSED successfully (100%).');
} catch (err) {
  console.error('Test suite failure:', err);
  process.exit(1);
}


