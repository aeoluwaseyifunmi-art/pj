/**
 * Nigerian Banking Ecosystem Utilities & Reference Registry
 * Covers CBN commercial banks, licensed Microfinance Banks, FinTech operators,
 * 10-digit NUBAN algorithms, NIBSS Instant Payments (NIP) session tracking,
 * and USSD transfer strings.
 */

export interface NigerianBankInfo {
  code: string; // CBN 3-digit or NIBSS routing code
  name: string;
  category: 'commercial' | 'fintech_mfb' | 'merchant_pos';
  ussdPrefix: string;
  transferUssdPattern: string; // placeholder string e.g. "*737*2*{amount}*{account}#"
  popular: boolean;
  color: string;
}

export const NIGERIAN_BANKS: NigerianBankInfo[] = [
  {
    code: '50515',
    name: 'Moniepoint MFB',
    category: 'fintech_mfb',
    ussdPrefix: '*5573#',
    transferUssdPattern: '*5573*1*{amount}*{account}#',
    popular: true,
    color: '#0052FF'
  },
  {
    code: '058',
    name: 'Guaranty Trust Bank (GTBank)',
    category: 'commercial',
    ussdPrefix: '*737#',
    transferUssdPattern: '*737*2*{amount}*{account}#',
    popular: true,
    color: '#E04F00'
  },
  {
    code: '057',
    name: 'Zenith Bank PLC',
    category: 'commercial',
    ussdPrefix: '*966#',
    transferUssdPattern: '*966*{amount}*{account}#',
    popular: true,
    color: '#C41230'
  },
  {
    code: '044',
    name: 'Access Bank PLC',
    category: 'commercial',
    ussdPrefix: '*901#',
    transferUssdPattern: '*901*2*{amount}*{account}#',
    popular: true,
    color: '#F58220'
  },
  {
    code: '011',
    name: 'First Bank of Nigeria',
    category: 'commercial',
    ussdPrefix: '*894#',
    transferUssdPattern: '*894*{amount}*{account}#',
    popular: true,
    color: '#00205B'
  },
  {
    code: '033',
    name: 'United Bank for Africa (UBA)',
    category: 'commercial',
    ussdPrefix: '*919#',
    transferUssdPattern: '*919*3*{account}*{amount}#',
    popular: true,
    color: '#D11019'
  },
  {
    code: '999992',
    name: 'OPay Digital Services',
    category: 'fintech_mfb',
    ussdPrefix: '*955#',
    transferUssdPattern: '*955*2*{amount}*{account}#',
    popular: true,
    color: '#13C296'
  },
  {
    code: '999991',
    name: 'PalmPay Limited',
    category: 'fintech_mfb',
    ussdPrefix: '*861#',
    transferUssdPattern: '*861*{amount}*{account}#',
    popular: true,
    color: '#7B2CBF'
  },
  {
    code: '50211',
    name: 'Kuda Microfinance Bank',
    category: 'fintech_mfb',
    ussdPrefix: '*894#',
    transferUssdPattern: '*894*99*{account}*{amount}#',
    popular: true,
    color: '#40196D'
  },
  {
    code: '221',
    name: 'Stanbic IBTC Bank',
    category: 'commercial',
    ussdPrefix: '*909#',
    transferUssdPattern: '*909*22*{amount}*{account}#',
    popular: true,
    color: '#0033A0'
  },
  {
    code: '070',
    name: 'Fidelity Bank PLC',
    category: 'commercial',
    ussdPrefix: '*770#',
    transferUssdPattern: '*770*{account}*{amount}#',
    popular: false,
    color: '#1A365D'
  },
  {
    code: '214',
    name: 'First City Monument Bank (FCMB)',
    category: 'commercial',
    ussdPrefix: '*329#',
    transferUssdPattern: '*329*{amount}*{account}#',
    popular: false,
    color: '#4A0E4E'
  },
  {
    code: '032',
    name: 'Union Bank of Nigeria',
    category: 'commercial',
    ussdPrefix: '*826#',
    transferUssdPattern: '*826*2*{amount}*{account}#',
    popular: false,
    color: '#009FE3'
  },
  {
    code: '232',
    name: 'Sterling Bank PLC',
    category: 'commercial',
    ussdPrefix: '*822#',
    transferUssdPattern: '*822*{amount}*{account}#',
    popular: false,
    color: '#84BD00'
  },
  {
    code: '035',
    name: 'Wema Bank / ALAT',
    category: 'commercial',
    ussdPrefix: '*945#',
    transferUssdPattern: '*945*1*{account}*{amount}#',
    popular: false,
    color: '#800080'
  },
  {
    code: '076',
    name: 'Polaris Bank',
    category: 'commercial',
    ussdPrefix: '*833#',
    transferUssdPattern: '*833*{amount}*{account}#',
    popular: false,
    color: '#5C068C'
  },
  {
    code: '050',
    name: 'Ecobank Nigeria',
    category: 'commercial',
    ussdPrefix: '*326#',
    transferUssdPattern: '*326*{amount}*{account}#',
    popular: false,
    color: '#005E85'
  },
  {
    code: '301',
    name: 'Jaiz Bank PLC',
    category: 'commercial',
    ussdPrefix: '*773#',
    transferUssdPattern: '*773*{amount}*{account}#',
    popular: false,
    color: '#006837'
  },
  {
    code: '302',
    name: 'Taj Bank',
    category: 'commercial',
    ussdPrefix: '*898#',
    transferUssdPattern: '*898*{amount}*{account}#',
    popular: false,
    color: '#E30613'
  },
  {
    code: '303',
    name: 'Lotus Bank',
    category: 'commercial',
    ussdPrefix: '*5045#',
    transferUssdPattern: '*5045*{amount}*{account}#',
    popular: false,
    color: '#105B38'
  },
  {
    code: '101',
    name: 'Providus Bank',
    category: 'commercial',
    ussdPrefix: '*101#',
    transferUssdPattern: '*101*{amount}*{account}#',
    popular: false,
    color: '#F48024'
  },
  {
    code: '566',
    name: 'VFD Microfinance Bank',
    category: 'fintech_mfb',
    ussdPrefix: '*566#',
    transferUssdPattern: '*566*{amount}*{account}#',
    popular: false,
    color: '#E01E37'
  }
];

/**
 * Standard Nigerian Currency Formatter
 * Formats numbers into Nigerian Naira (₦) representation
 */
export function formatNaira(amount: number | string | undefined | null, showSymbol = true): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return showSymbol ? '₦0.00' : '0.00';

  const formatted = num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return showSymbol ? `₦${formatted}` : formatted;
}

/**
 * Validates Nigeria Uniform Bank Account Number (NUBAN)
 * NUBAN is strictly a 10-digit number.
 */
export function validateNuban(accountNumber: string): { valid: boolean; message?: string } {
  const cleaned = accountNumber.trim().replace(/\D/g, '');
  if (!cleaned) {
    return { valid: false, message: 'Account number is required' };
  }
  if (cleaned.length !== 10) {
    return {
      valid: false,
      message: `NUBAN must be exactly 10 digits (currently ${cleaned.length} digits)`
    };
  }
  return { valid: true };
}

/**
 * Generates an authentic 30-digit NIBSS Instant Payment (NIP) Session ID
 * Standard format used across all Nigerian banking institutions:
 * [BankCode 6 digits][YYMMDDHHMMSS 12 digits][Random serial 12 digits]
 */
export function generateNipSessionId(bankCode = '999001'): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const datePart = `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomPart = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const cleanBankCode = bankCode.replace(/\D/g, '').padEnd(6, '0').slice(0, 6);
  return `${cleanBankCode}${datePart}${randomPart}`;
}

/**
 * Generates an automated Retrieval Reference Number (RRN) for Nigerian POS card payments
 * Standard 12-digit format printed on Moniepoint, OPay, and Baxi POS customer receipts.
 */
export function generatePosRrn(): string {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hour = String(now.getHours()).padStart(2, '0');
  const random = String(Math.floor(1000000 + Math.random() * 9000000));
  return `${String(now.getFullYear()).slice(-1)}${String(dayOfYear).padStart(3, '0')}${hour}${random}`.slice(0, 12);
}

/**
 * Builds standard USSD quick dial string for customer phone transfer
 */
export function buildUssdTransferString(bankNameOrCode: string, nuban: string, amount: number): string {
  const bank = NIGERIAN_BANKS.find(
    (b) => b.code === bankNameOrCode || b.name.toLowerCase().includes(bankNameOrCode.toLowerCase())
  ) || NIGERIAN_BANKS[1]; // default GTBank

  const roundedAmount = Math.round(amount);
  const cleanNuban = nuban.replace(/\D/g, '');

  return bank.transferUssdPattern
    .replace('{amount}', roundedAmount.toString())
    .replace('{account}', cleanNuban);
}

/**
 * Simulates real-time CBN NUBAN Name Inquiry service
 * Returns verified enterprise account holder name
 */
export function simulateNubanLookup(bankName: string, nuban: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const clean = nuban.replace(/\D/g, '');
      if (clean.length === 10) {
        resolve(`OMNISTOCK ENTERPRISES NIG LTD - [Verified NUBAN]`);
      } else {
        resolve(`ENTERPRISE ACCOUNT - [NUBAN: ${clean}]`);
      }
    }, 600);
  });
}
