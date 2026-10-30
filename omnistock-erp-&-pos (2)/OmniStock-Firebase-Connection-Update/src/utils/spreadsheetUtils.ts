import * as XLSX from 'xlsx';
import { Product, InventoryLevel } from '../types/database';

export interface ParsedProductRow {
  rowNumber: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  costPrice: number;
  retailPrice: number;
  wholesaleBasePrice: number;
  minWholesaleQty: number;
  initialStock: number;
  barcode: string;
  reorderThreshold: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  isDuplicateSku?: boolean;
}

export interface ParsedSpreadsheetResult {
  fileName: string;
  totalRows: number;
  validRows: ParsedProductRow[];
  invalidRows: ParsedProductRow[];
  detectedCategories: string[];
}

/**
 * Fuzzy header mapping to handle user columns flexibly
 */
function normalizeHeaderKey(key: string): string {
  const clean = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (['productname', 'itemname', 'name', 'product', 'title', 'item', 'itemdescription'].includes(clean)) {
    return 'name';
  }
  if (['sku', 'itemcode', 'productcode', 'code', 'partnumber'].includes(clean)) {
    return 'sku';
  }
  if (['category', 'department', 'group', 'productcategory'].includes(clean)) {
    return 'category';
  }
  if (['costprice', 'cost', 'unitcost', 'purchaseprice', 'buyprice', 'costpricengn', 'costnaira'].includes(clean)) {
    return 'costPrice';
  }
  if (['retailprice', 'sellingprice', 'price', 'unitprice', 'saleprice', 'retailpricengn', 'pricenaira'].includes(clean)) {
    return 'retailPrice';
  }
  if (['wholesaleprice', 'wholesalerate', 'b2bprice', 'wholesalebaseprice'].includes(clean)) {
    return 'wholesaleBasePrice';
  }
  if (['minwholesaleqty', 'wholesaleqty', 'minwholesale', 'moq'].includes(clean)) {
    return 'minWholesaleQty';
  }
  if (['initialstock', 'stock', 'quantity', 'qty', 'stockonhand', 'inventory', 'quantityonhand'].includes(clean)) {
    return 'initialStock';
  }
  if (['unit', 'uom', 'packsize', 'package', 'measure'].includes(clean)) {
    return 'unit';
  }
  if (['barcode', 'upc', 'ean', 'barcodenumber'].includes(clean)) {
    return 'barcode';
  }
  if (['description', 'details', 'notes', 'specs'].includes(clean)) {
    return 'description';
  }
  if (['reorderthreshold', 'reorderlevel', 'minstock', 'threshold', 'lowstockalert'].includes(clean)) {
    return 'reorderThreshold';
  }
  return clean;
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file into validated product rows
 */
export async function parseProductSpreadsheet(
  file: File,
  existingSkus: Set<string>
): Promise<ParsedSpreadsheetResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error('Spreadsheet has no readable sheets');
  }

  // Convert to JSON array of raw objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: ''
  });

  const parsedRows: ParsedProductRow[] = [];
  const detectedCategories = new Set<string>();
  const seenFileSkus = new Set<string>();

  rawRows.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const normalized: Record<string, any> = {};

    Object.keys(rawRow).forEach((origKey) => {
      const standardKey = normalizeHeaderKey(origKey);
      normalized[standardKey] = rawRow[origKey];
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Name Validation
    const name = String(normalized.name || '').trim();
    if (!name) {
      errors.push('Product name is required');
    }

    // SKU Generation / Validation
    let sku = String(normalized.sku || '').trim().toUpperCase();
    if (!sku && name) {
      // Auto generate SKU from name
      const prefix = name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase();
      sku = `SKU-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      warnings.push(`No SKU provided, auto-generated: ${sku}`);
    }

    // Duplicate SKU checks
    let isDuplicateSku = false;
    if (sku) {
      if (seenFileSkus.has(sku)) {
        isDuplicateSku = true;
        warnings.push(`Duplicate SKU in uploaded file: ${sku}`);
      } else {
        seenFileSkus.add(sku);
      }

      if (existingSkus.has(sku)) {
        isDuplicateSku = true;
        warnings.push(`SKU already exists in current database: ${sku}`);
      }
    }

    // Prices Parsing
    const rawCost = String(normalized.costPrice || '').replace(/[^\d.]/g, '');
    const costPrice = parseFloat(rawCost) || 0;

    const rawRetail = String(normalized.retailPrice || '').replace(/[^\d.]/g, '');
    let retailPrice = parseFloat(rawRetail) || 0;

    if (retailPrice <= 0 && costPrice > 0) {
      // Fallback: 25% markup
      retailPrice = Number((costPrice * 1.25).toFixed(2));
      warnings.push(`Retail price was missing/zero. Auto-calculated with standard 25% markup (₦${retailPrice.toLocaleString()})`);
    } else if (retailPrice <= 0) {
      errors.push('Retail selling price must be greater than 0');
    }

    // Wholesale Price
    const rawWholesale = String(normalized.wholesaleBasePrice || '').replace(/[^\d.]/g, '');
    let wholesaleBasePrice = parseFloat(rawWholesale) || 0;
    if (wholesaleBasePrice <= 0 && retailPrice > 0) {
      wholesaleBasePrice = Number((retailPrice * 0.85).toFixed(2)); // standard 15% wholesale discount
    }

    const minWholesaleQty = parseInt(String(normalized.minWholesaleQty || '5'), 10) || 5;

    // Stock Quantity
    const rawStock = String(normalized.initialStock || '').replace(/[^\d]/g, '');
    const initialStock = parseInt(rawStock, 10) || 0;

    // Category
    let category = String(normalized.category || '').trim();
    if (!category) {
      category = 'General Merchandise';
      warnings.push('Category was empty, defaulted to General Merchandise');
    }
    detectedCategories.add(category);

    // Unit
    let unit = String(normalized.unit || '').trim();
    if (!unit) {
      unit = 'Piece';
    }

    // Barcode
    let barcode = String(normalized.barcode || '').trim();
    if (!barcode) {
      barcode = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    }

    // Reorder Threshold
    const rawThreshold = String(normalized.reorderThreshold || '').replace(/[^\d]/g, '');
    const reorderThreshold = parseInt(rawThreshold, 10) || Math.max(5, Math.round(initialStock * 0.2));

    const description = String(normalized.description || '').trim();

    const isValid = errors.length === 0;

    parsedRows.push({
      rowNumber,
      sku,
      name,
      category,
      description,
      unit,
      costPrice,
      retailPrice,
      wholesaleBasePrice,
      minWholesaleQty,
      initialStock,
      barcode,
      reorderThreshold,
      isValid,
      warnings,
      errors,
      isDuplicateSku
    });
  });

  return {
    fileName: file.name,
    totalRows: parsedRows.length,
    validRows: parsedRows.filter((r) => r.isValid),
    invalidRows: parsedRows.filter((r) => !r.isValid),
    detectedCategories: Array.from(detectedCategories)
  };
}

/**
 * Downloads a sample Excel (.xlsx) template for bulk product import
 */
export function downloadSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Product Name': 'Dangote Sugar 50kg Bag',
      'SKU': 'SUG-DAN-50KG',
      'Category': 'Food & Provisions',
      'Cost Price (₦)': 68000,
      'Retail Price (₦)': 75000,
      'Wholesale Price (₦)': 71500,
      'Min Wholesale Qty': 5,
      'Initial Stock': 80,
      'Unit': 'Bag',
      'Barcode': '615123456789',
      'Reorder Threshold': 15,
      'Description': 'Fortified granulated white cane sugar from Dangote Sugar Refinery.'
    },
    {
      'Product Name': 'Golden Penny Prime Flour 50kg',
      'SKU': 'FLR-GP-50KG',
      'Category': 'Bakery & Grains',
      'Cost Price (₦)': 54000,
      'Retail Price (₦)': 61000,
      'Wholesale Price (₦)': 57500,
      'Min Wholesale Qty': 10,
      'Initial Stock': 65,
      'Unit': 'Bag',
      'Barcode': '615987654321',
      'Reorder Threshold': 10,
      'Description': 'Premium baker grade wheat flour by Flour Mills of Nigeria PLC.'
    },
    {
      'Product Name': 'Peak Full Cream Milk Carton (24 x 400g)',
      'SKU': 'MLK-PK-24CTN',
      'Category': 'Dairy & Breakfast',
      'Cost Price (₦)': 42500,
      'Retail Price (₦)': 48000,
      'Wholesale Price (₦)': 44800,
      'Min Wholesale Qty': 3,
      'Initial Stock': 120,
      'Unit': 'Carton',
      'Barcode': '615234567890',
      'Reorder Threshold': 25,
      'Description': 'Peak evaporated full cream milk tin master case.'
    },
    {
      'Product Name': 'Indomie Onion Chicken Flavour Carton (40 x 70g)',
      'SKU': 'NDL-IND-40CTN',
      'Category': 'Packaged Foods',
      'Cost Price (₦)': 8900,
      'Retail Price (₦)': 10500,
      'Wholesale Price (₦)': 9400,
      'Min Wholesale Qty': 5,
      'Initial Stock': 250,
      'Unit': 'Carton',
      'Barcode': '615345678901',
      'Reorder Threshold': 40,
      'Description': 'Instant noodles standard carton by Dufil Prima Foods.'
    },
    {
      'Product Name': 'Milo Cocoa Beverage Refill 500g',
      'SKU': 'MLO-NES-500G',
      'Category': 'Beverages',
      'Cost Price (₦)': 3200,
      'Retail Price (₦)': 3950,
      'Wholesale Price (₦)': 3450,
      'Min Wholesale Qty': 12,
      'Initial Stock': 150,
      'Unit': 'Pack',
      'Barcode': '615456789012',
      'Reorder Threshold': 30,
      'Description': 'Nestle Milo energy food drink powder 500g pouch.'
    },
    {
      'Product Name': 'Apple 20W USB-C Fast Power Adapter',
      'SKU': 'CHG-APL-20W',
      'Category': 'Electronics & Gadgets',
      'Cost Price (₦)': 18500,
      'Retail Price (₦)': 26000,
      'Wholesale Price (₦)': 21500,
      'Min Wholesale Qty': 5,
      'Initial Stock': 45,
      'Unit': 'Piece',
      'Barcode': '194252157008',
      'Reorder Threshold': 10,
      'Description': 'Original 20W USB-C wall charger with UK standard 3-pin plug.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 35 }, // Product Name
    { wch: 18 }, // SKU
    { wch: 22 }, // Category
    { wch: 16 }, // Cost Price
    { wch: 16 }, // Retail Price
    { wch: 18 }, // Wholesale Price
    { wch: 18 }, // Min Wholesale Qty
    { wch: 14 }, // Initial Stock
    { wch: 10 }, // Unit
    { wch: 18 }, // Barcode
    { wch: 18 }, // Reorder Threshold
    { wch: 50 }  // Description
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductTemplate');

  XLSX.writeFile(workbook, 'omnistock_bulk_products_template.xlsx');
}

/**
 * Downloads a sample CSV template for bulk product import
 */
export function downloadSampleCsvTemplate(): void {
  const headers = [
    'Product Name',
    'SKU',
    'Category',
    'Cost Price (₦)',
    'Retail Price (₦)',
    'Wholesale Price (₦)',
    'Min Wholesale Qty',
    'Initial Stock',
    'Unit',
    'Barcode',
    'Reorder Threshold',
    'Description'
  ];

  const rows = [
    [
      'Dangote Sugar 50kg Bag',
      'SUG-DAN-50KG',
      'Food & Provisions',
      '68000',
      '75000',
      '71500',
      '5',
      '80',
      'Bag',
      '615123456789',
      '15',
      'Fortified granulated white cane sugar from Dangote Sugar Refinery.'
    ],
    [
      'Golden Penny Prime Flour 50kg',
      'FLR-GP-50KG',
      'Bakery & Grains',
      '54000',
      '61000',
      '57500',
      '10',
      '65',
      'Bag',
      '615987654321',
      '10',
      'Premium baker grade wheat flour by Flour Mills of Nigeria PLC.'
    ],
    [
      'Indomie Onion Chicken Flavour Carton (40 x 70g)',
      'NDL-IND-40CTN',
      'Packaged Foods',
      '8900',
      '10500',
      '9400',
      '5',
      '250',
      'Carton',
      '615345678901',
      '40',
      'Instant noodles standard carton by Dufil Prima Foods.'
    ],
    [
      'Peak Full Cream Milk Carton (24 x 400g)',
      'MLK-PK-24CTN',
      'Dairy & Breakfast',
      '42500',
      '48000',
      '44800',
      '3',
      '120',
      'Carton',
      '615234567890',
      '25',
      'Peak evaporated full cream milk tin master case.'
    ]
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'omnistock_bulk_products_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all existing catalog products and stock levels to an Excel workbook
 */
export function exportProductsToWorkbook(
  products: Product[],
  inventoryLevels: InventoryLevel[],
  fileName = 'omnistock_products_export'
): void {
  const exportRows = products.map((prod) => {
    const totalStock = inventoryLevels
      .filter((inv) => inv.productId === prod.id)
      .reduce((sum, inv) => sum + inv.quantityOnHand, 0);

    return {
      'SKU': prod.sku,
      'Product Name': prod.name,
      'Category': prod.category,
      'Cost Price (₦)': prod.costPrice,
      'Retail Price (₦)': prod.retailPrice,
      'Wholesale Price (₦)': prod.wholesaleBasePrice,
      'Min Wholesale Qty': prod.minWholesaleQty,
      'Stock on Hand': totalStock,
      'Unit': prod.unit,
      'Barcode': prod.barcode,
      'Reorder Threshold': prod.reorderThreshold,
      'Description': prod.description || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 50 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductsCatalog');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
