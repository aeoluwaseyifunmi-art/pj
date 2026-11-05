import React, { useState } from 'react';
import { Order } from '../../types/database';
import {
  Printer,
  X,
  CheckCircle,
  Download,
  Mail,
  Copy,
  Check,
  Share2,
  Smartphone,
  FileText
} from 'lucide-react';
import { getAccessToken } from '../../services/googleAuth';
import { sendEmailViaGmail } from '../../services/googleWorkspaceApi';
import { dbStore } from '../../db/databaseStore';
import { formatNaira } from '../../utils/nigerianBanks';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  onReceiptPrinted?: (order: Order) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, onReceiptPrinted }) => {
  if (!order) return null;

  const isWholesale = order.channel === 'wholesale';
  const [receiptMode, setReceiptMode] = useState<'thermal' | 'standard'>('thermal');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    // Attempt to extract phone from customer if available
    const cust = dbStore.getState().customers.find((c) => c.id === order.customerId);
    return cust?.phone || '';
  });
  const [customerEmail, setCustomerEmail] = useState<string>(() => {
    const cust = dbStore.getState().customers.find((c) => c.id === order.customerId);
    return cust?.email || '';
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Generate plain text receipt for WhatsApp, SMS, or clipboard
  const generatePlainTextReceipt = (): string => {
    const dateStr = new Date(order.createdAt).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const lines: string[] = [];
    lines.push('🧾 *OMNISTOCK ENTERPRISE - OFFICIAL RECEIPT*');
    lines.push(`Receipt #: ${order.orderNumber}`);
    lines.push(`Date: ${dateStr}`);
    lines.push(`Location: ${order.locationName}`);
    lines.push(`Cashier: ${order.inputerName || order.cashier}`);
    if (order.supervisedBy) {
      lines.push(`Supervised by: ${order.supervisedBy}`);
    }
    lines.push(`Customer: ${order.customerCompany || order.customerName}`);
    lines.push('----------------------------------------');
    lines.push('ITEMS:');
    order.items.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. ${item.name}\n   ${item.quantity} x ${formatNaira(item.unitPrice)} = ${formatNaira(item.subtotal)}`
      );
    });
    lines.push('----------------------------------------');
    lines.push(`Subtotal: ${formatNaira(order.subtotal)}`);
    if (order.discountTotal > 0) {
      lines.push(`Discounts: -${formatNaira(order.discountTotal)}`);
    }
    lines.push(`VAT (7.5%): ${formatNaira(order.taxTotal)}`);
    lines.push(`*TOTAL PAID: ${formatNaira(order.grandTotal)}*`);
    lines.push('----------------------------------------');
    lines.push(`Payment Method: ${order.paymentMethod.replace(/_/g, ' ').toUpperCase()}`);

    if (order.cashTendered !== undefined) {
      lines.push(`Cash Tendered: ${formatNaira(order.cashTendered)}`);
      lines.push(`Change Returned: ${formatNaira(order.cashChange || 0)}`);
    }

    if (order.bankVerified || order.paymentMethod === 'bank_transfer') {
      lines.push(`Deposit Bank: ${order.bankName || 'Settlement Bank'}`);
      if (order.nipSessionId) {
        lines.push(`NIBSS NIP Session: ${order.nipSessionId}`);
      }
      lines.push('NIP Settlement Status: VERIFIED DONE ✓');
    }

    if (order.posRrn) {
      lines.push(`POS Card RRN: ${order.posRrn}`);
      if (order.posCardScheme) {
        lines.push(`Card Scheme: ${order.posCardScheme.toUpperCase()}`);
      }
    }

    lines.push('----------------------------------------');
    lines.push('Thank you for your business!');
    lines.push('Keep this receipt for returns or warranty claims.');
    return lines.join('\n');
  };

  const handlePrint = () => {
    try {
      dbStore.recordReceiptPrinted(order.id, order.inputerId);
      if (onReceiptPrinted) {
        onReceiptPrinted(order);
      }
    } catch (e) {
      console.warn('Error recording receipt print:', e);
    }
    window.print();
  };

  const handleCopyText = () => {
    const text = generatePlainTextReceipt();
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setStatusMessage('Receipt copied to clipboard!');
    setTimeout(() => {
      setIsCopied(false);
      setStatusMessage(null);
    }, 3000);
  };

  const handleShareWhatsApp = () => {
    const text = generatePlainTextReceipt();
    const encodedText = encodeURIComponent(text);

    // Clean phone number (strip spaces, dashes, leading zero for Nigerian numbers)
    let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `234${cleanPhone.slice(1)}`;
    }

    const whatsappUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setStatusMessage('Receipt opened in WhatsApp!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSendEmail = async () => {
    const recipient = customerEmail.trim();
    if (!recipient) {
      setStatusMessage('Please enter a recipient email address.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const subject = `Receipt for Order ${order.orderNumber} - OmniStock`;
    const plainText = generatePlainTextReceipt();

    // Check if user has Google Workspace OAuth token
    const token = await getAccessToken();
    if (token) {
      setIsSendingEmail(true);
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">OmniStock Receipt</h2>
            <p style="color: #64748b; font-size: 13px;">Order <strong>${order.orderNumber}</strong> (${order.locationName})</p>
            <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 16px 0;" />
            <pre style="font-family: monospace; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${plainText}</pre>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 16px;">Thank you for shopping with OmniStock!</p>
          </div>
        `;
        await sendEmailViaGmail(token, recipient, subject, htmlBody);
        setStatusMessage(`Receipt emailed via Gmail to ${recipient}!`);
      } catch (err: any) {
        // Fallback to mailto if Gmail API fails
        const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
        window.location.href = mailtoUrl;
        setStatusMessage(`Email composer opened for ${recipient}.`);
      } finally {
        setIsSendingEmail(false);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } else {
      // Standard mailto fallback
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
      window.location.href = mailtoUrl;
      setStatusMessage(`Email client opened for ${recipient}.`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(order, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${order.orderNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full text-slate-200 overflow-hidden shadow-2xl my-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {isWholesale ? 'Wholesale Commercial Invoice' : 'Point-of-Sale Receipt'}
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setReceiptMode('thermal')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                receiptMode === 'thermal'
                  ? 'bg-slate-800 text-emerald-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm Thermal
            </button>
            <button
              onClick={() => setReceiptMode('standard')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                receiptMode === 'standard'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard A4
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Receipt Sharing Action Bar */}
        <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800 space-y-2.5 no-print">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Digital Receipt Sharing</span>
            </span>
            {statusMessage && (
              <span className="text-[11px] text-emerald-400 font-medium animate-pulse">
                {statusMessage}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* WhatsApp Input & Button */}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="WhatsApp (080... or +234)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={handleShareWhatsApp}
                title="Send digital receipt via WhatsApp"
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Email Input & Button */}
            <div className="flex gap-1.5">
              <input
                type="email"
                placeholder="Customer email address"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                title="Send digital receipt via Email"
                className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>{isSendingEmail ? 'Sending...' : 'Email'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <button
              onClick={handleCopyText}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Receipt Text Copied' : 'Copy Formatted Text'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 bg-slate-950/40 overflow-y-auto max-h-[55vh]">
          {/* Thermal Roll Format (80mm width) */}
          <div
            className={`thermal-receipt-container mx-auto ${
              receiptMode === 'thermal'
                ? 'max-w-[320px] bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-[11px]'
                : 'max-w-md bg-slate-950 border border-slate-800 rounded-lg p-5 font-sans text-xs'
            }`}
          >
            {/* Store & Location Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-800">
              <h2 className="text-sm font-bold text-white tracking-wider">OMNISTOCK ENTERPRISE</h2>
              <p className="text-slate-400 text-[11px]">{order.locationName}</p>
              <p className="text-slate-400 text-[10px]">
                Channel: <span className="text-white uppercase font-semibold">{order.channel}</span> · Register POS
              </p>
              <p className="text-slate-400 text-[10px] tabular-nums">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Reference & Cashier */}
            <div className="grid grid-cols-2 gap-1 py-2.5 border-b border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Receipt No:</span>
                <span className="font-mono text-white font-bold">{order.orderNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Cashier:</span>
                <span className="text-slate-200 font-medium">
                  {order.inputerName || order.cashier}
                </span>
              </div>
              {order.customerName && (
                <div className="col-span-2 pt-1 border-t border-slate-800/40">
                  <span className="text-slate-400 text-[10px]">Customer: </span>
                  <span className="text-slate-200">
                    {order.customerCompany ? `${order.customerCompany} (${order.customerName})` : order.customerName}
                  </span>
                </div>
              )}
              {order.supervisedBy && (
                <div className="col-span-2 pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Branch Supervision:</span>
                  <span className="text-emerald-400 font-medium">✓ {order.supervisedBy}</span>
                </div>
              )}
            </div>

            {/* Line Items List */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-slate-800">
              <div className="flex justify-between text-slate-400 pb-1 text-[10px] font-semibold uppercase">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty x Rate</span>
                <span className="w-1/4 text-right">Amount</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="w-1/2 pr-1">
                    <p className="text-white font-medium line-clamp-2">{item.name}</p>
                    <p className="text-slate-400 text-[10px] font-mono">{item.sku}</p>
                  </div>
                  <div className="w-1/4 text-center tabular-nums text-slate-300 text-[10px]">
                    {item.quantity} x {formatNaira(item.unitPrice)}
                  </div>
                  <div className="w-1/4 text-right tabular-nums text-white font-semibold">
                    {formatNaira(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="py-2.5 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="text-slate-200">{formatNaira(order.subtotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discounts:</span>
                  <span>-{formatNaira(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>VAT (7.5%):</span>
                <span className="text-slate-200">{formatNaira(order.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-800">
                <span>TOTAL:</span>
                <span className="text-emerald-400">{formatNaira(order.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Details & Nigerian Verification Stamp */}
            <div className="pt-2 border-t border-dashed border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Payment Method:</span>
                <span className="text-slate-200 uppercase font-medium">
                  {order.paymentMethod.replace(/_/g, ' ')}
                </span>
              </div>

              {order.cashTendered !== undefined && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Cash Tendered:</span>
                    <span className="text-slate-200">{formatNaira(order.cashTendered)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Change:</span>
                    <span>{formatNaira(order.cashChange || 0)}</span>
                  </div>
                </>
              )}

              {/* Nigerian Bank Settlement Stamp */}
              {(order.bankVerified || order.paymentMethod === 'bank_transfer' || order.bankTransactionRef) && (
                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded text-[10px] space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>NIP TRANSFER: DONE</span>
                    <span>VERIFIED ✓</span>
                  </div>
                  {order.bankName && (
                    <div className="flex justify-between text-slate-300">
                      <span>Bank:</span>
                      <span>{order.bankName}</span>
                    </div>
                  )}
                  {order.nipSessionId && (
                    <div className="flex justify-between text-slate-400">
                      <span>NIP Session:</span>
                      <span className="font-mono truncate max-w-[170px]" title={order.nipSessionId}>
                        {order.nipSessionId}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* POS Terminal Card Scheme Stamp */}
              {order.posRrn && (
                <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded text-[10px] space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>POS CARD PAYMENT</span>
                    <span>APPROVED ✓</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Card Scheme:</span>
                    <span>{(order.posCardScheme || 'Verve').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Retrieval Ref (RRN):</span>
                    <span className="font-mono">{order.posRrn}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Barcode & Footer Stamp */}
            <div className="pt-3 text-center space-y-1 border-t border-slate-800 mt-2">
              <div className="h-7 mx-auto max-w-[160px] flex items-end justify-center gap-0.5 bg-slate-900/60 px-3 py-1 rounded">
                {[2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 3, 4, 2, 1, 3, 2, 4, 1].map((h, i) => (
                  <div key={i} className="bg-slate-300 w-1" style={{ height: `${h * 4 + 4}px` }} />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">{order.orderNumber}</p>
              <p className="text-[10px] text-slate-400">Thank you for your patronage!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 no-print">
          <div className="text-[11px] text-slate-400">
            {receiptMode === 'thermal' ? 'Optimized for 80mm thermal receipt roll printers' : 'Standard invoice format'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
