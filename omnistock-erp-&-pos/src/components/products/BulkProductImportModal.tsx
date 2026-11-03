import React, { useState, useRef } from 'react';
import { dbStore, DatabaseState } from '../../db/databaseStore';
import {
  parseProductSpreadsheet,
  ParsedSpreadsheetResult,
  ParsedProductRow,
  downloadSampleExcelTemplate,
  downloadSampleCsvTemplate
} from '../../utils/spreadsheetUtils';
import { formatNaira } from '../../utils/nigerianBanks';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Building,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface BulkProductImportModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({
  dbState,
  onClose,
  onSuccess
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedSpreadsheetResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Settings
  const [targetLocationId, setTargetLocationId] = useState<string>(
    () => dbStore.getActiveLocationId() || dbState.locations[0]?.id || 'loc_wh_central'
  );
  const [duplicateStrategy, setDuplicateStrategy] = useState<
    'accumulate_stock' | 'skip_duplicates' | 'overwrite_existing' | 'create_new_sku'
  >('accumulate_stock');

  // Table filter
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');

  // Ingestion state
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setParseError('Please upload an Excel spreadsheet (.xlsx, .xls) or a CSV file (.csv)');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const existingSkus = new Set(dbState.products.map((p) => p.sku.toUpperCase()));
      const result = await parseProductSpreadsheet(file, existingSkus);

      if (result.totalRows === 0) {
        setParseError('The uploaded spreadsheet contains no rows of product data.');
        setIsParsing(false);
        return;
      }

      setParseResult(result);
    } catch (err: any) {
      console.error('Failed to parse spreadsheet:', err);
      setParseError(err.message || 'Failed to read spreadsheet file. Please verify file formatting.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleExecuteImport = () => {
    if (!parseResult) return;
    const itemsToImport = parseResult.validRows.map((r) => ({
      product: {
        sku: r.sku,
        barcode: r.barcode,
        name: r.name,
        category: r.category,
        description: r.description,
        unit: r.unit,
        costPrice: r.costPrice,
        retailPrice: r.retailPrice,
        wholesaleBasePrice: r.wholesaleBasePrice,
        minWholesaleQty: r.minWholesaleQty,
        taxRate: 0.075, // 7.5% Nigerian VAT standard
        reorderThreshold: r.reorderThreshold,
        targetStockLevel: Math.max(50, r.initialStock * 2)
      },
      initialStock: r.initialStock,
      locationId: targetLocationId
    }));

    setIsImporting(true);

    setTimeout(() => {
      const outcome = dbStore.bulkAddProducts(itemsToImport, duplicateStrategy);
      setIsImporting(false);
      setImportSummary({
        created: outcome.createdCount,
        updated: outcome.updatedCount,
        skipped: outcome.skippedCount
      });

      if (onSuccess) {
        onSuccess(outcome.createdCount + outcome.updatedCount);
      }
    }, 700);
  };

  const allRows: ParsedProductRow[] = parseResult
    ? [...parseResult.validRows, ...parseResult.invalidRows].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  const filteredPreviewRows = allRows.filter((r) => {
    if (previewFilter === 'valid') return r.isValid && r.warnings.length === 0;
    if (previewFilter === 'warning') return r.isValid && r.warnings.length > 0;
    if (previewFilter === 'error') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 text-slate-200 shadow-2xl flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight font-serif">
                  Bulk Product Ingestion
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  EXCEL (.XLSX) & CSV
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload your goods spreadsheet to register hundreds of products, set prices in Nigerian Naira (₦), and ingest initial stock
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {importSummary ? (
            /* Success State */
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white font-serif">Bulk Import Completed!</h3>
              <p className="text-xs text-slate-400">
                Your products and initial inventory levels have been committed to the database and are now ready for immediate retail POS sales and wholesale fulfillment.
              </p>

              <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-center">
                <div>
                  <div className="text-xl font-bold text-emerald-400">{importSummary.created}</div>
                  <div className="text-[10px] text-slate-400 uppercase">New Created</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-400">{importSummary.updated}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Added Up / Updated</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-400">{importSummary.skipped}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Skipped</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  View Updated Catalog
                </button>
              </div>
            </div>
          ) : !parseResult ? (
            /* Upload & Template State */
            <div className="space-y-5">
              {/* Template Download Card */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    Need a ready-made template with sample Nigerian products?
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Includes columns for SKU, Product Name, Category, Cost & Selling Prices (₦), Stock, and Units.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleCsvTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div className="space-y-3 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mx-auto shadow-inner">
                    {isParsing ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    ) : (
                      <Upload className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {isParsing ? 'Analyzing spreadsheet rows...' : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Excel spreadsheets (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
                    <span>UTF-8 Supported</span>
                    <span>•</span>
                    <span>Auto-column matching</span>
                    <span>•</span>
                    <span>Multi-category</span>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Preview & Configuration State */
            <div className="space-y-4">
              {/* File Summary & Ingestion Settings Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* File Stats Card */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300 truncate">{parseResult.fileName}</span>
                    <span className="font-mono text-[10px] text-emerald-400">READY</span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-1 font-mono">
                    <span className="text-2xl font-bold text-white">{parseResult.validRows.length}</span>
                    <span className="text-xs text-slate-400">valid products</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Total rows: {parseResult.totalRows} ({parseResult.invalidRows.length} invalid)
                  </div>
                </div>

                {/* Warehouse Location Selector */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Destination Warehouse / Store</span>
                  </label>
                  <select
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {dbState.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-400">
                    Initial stock levels will be deposited at this facility
                  </div>
                </div>

                {/* Duplicate SKU Handling */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Duplicate & Same-Product Strategy</span>
                  </label>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="accumulate_stock">➕ Add Up Quantities (Recommended: If Same, Sum Stock)</option>
                    <option value="overwrite_existing">Overwrite & Replace Existing Stock</option>
                    <option value="skip_duplicates">Skip Existing SKUs (Keep Current Stock)</option>
                    <option value="create_new_sku">Auto-Generate New Unique SKUs</option>
                  </select>
                  <div className="text-[10px] text-emerald-400">
                    {duplicateStrategy === 'accumulate_stock'
                      ? '✓ Duplicate rows and matching products will automatically add up together'
                      : 'Applies when an SKU appears multiple times or exists in database'}
                  </div>
                </div>
              </div>

              {/* Filter Tabs for Preview */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      previewFilter === 'all'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Rows ({allRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Clean ({parseResult.validRows.filter((r) => r.warnings.length === 0).length})</span>
                  </button>
                  <button
                    onClick={() => setPreviewFilter('warning')}
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      previewFilter === 'warning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Warnings ({parseResult.validRows.filter((r) => r.warnings.length > 0).length})</span>
                  </button>
                  {parseResult.invalidRows.length > 0 && (
                    <button
                      onClick={() => setPreviewFilter('error')}
                      className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                        previewFilter === 'error'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>Errors ({parseResult.invalidRows.length})</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setParseError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-mono tracking-wider sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Cost (₦)</th>
                      <th className="py-2.5 px-3 text-right">Retail Price (₦)</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredPreviewRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">#{row.rowNumber}</td>
                        <td className="py-2 px-3 font-mono text-[11px] font-semibold text-emerald-400">
                          {row.sku}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-100 max-w-xs truncate">
                          {row.name || <span className="text-rose-400 italic">[Empty Name]</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{row.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {formatNaira(row.costPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                          {formatNaira(row.retailPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-300">{row.initialStock}</td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            row.warnings.length > 0 ? (
                              <span
                                title={row.warnings.join(' • ')}
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                <span>Adjusted</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                <span>Valid</span>
                              </span>
                            )
                          ) : (
                            <span
                              title={row.errors.join(' • ')}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800"
                            >
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                              <span>{row.errors[0]}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parseResult && !importSummary && (
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-400">
              Ready to import <strong className="text-white">{parseResult.validRows.length}</strong> items
              into <span className="text-cyan-300">{dbState.locations.find((l) => l.id === targetLocationId)?.name}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting || parseResult.validRows.length === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ingesting into Inventory...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Confirm & Ingest {parseResult.validRows.length} Products</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
