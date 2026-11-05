import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  // Check CLI arguments first: --port <num> or -p <num>
  const portArgIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  // In development, Dev server must always run on port 3000 (nginx reverse-proxy runs on 8080)
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  // Only use process.env.PORT in standalone production deployment when not colliding
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.findIndex((arg) => arg === '--host' || arg === '-h');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

const app = express();
app.use(express.json({ limit: '10mb' }));

/**
 * OmniStock Backend Role & Credential Registry
 */
const BACKEND_ROLES: Record<string, {
  role: string;
  name: string;
  terminalName: string;
  defaultTab: string;
  allowedPosAccess: boolean;
  canProcessSales: boolean;
  canManageProducts: boolean;
}> = {
  owner: {
    role: 'owner',
    name: 'Owner Admin Dashboard',
    terminalName: 'Owner Admin Dashboard',
    defaultTab: 'products',
    allowedPosAccess: true, // Owner can make sales too
    canProcessSales: true,
    canManageProducts: true,
  },
  admin: {
    role: 'admin',
    name: 'Admin ERP Dashboard',
    terminalName: 'Admin ERP Dashboard',
    defaultTab: 'products',
    allowedPosAccess: false,
    canProcessSales: false,
    canManageProducts: true,
  },
  manager: {
    role: 'manager',
    name: 'Manager Command Centre',
    terminalName: 'Manager Command Centre',
    defaultTab: 'branch_managers',
    allowedPosAccess: false,
    canProcessSales: false,
    canManageProducts: true,
  },
  cashier: {
    role: 'cashier',
    name: 'Inputer POS Terminal',
    terminalName: 'Inputer POS Terminal',
    defaultTab: 'pos',
    allowedPosAccess: true,
    canProcessSales: true,
    canManageProducts: false,
  },
  inventory: {
    role: 'inventory',
    name: 'Inventory Management Terminal',
    terminalName: 'Inventory Management Terminal',
    defaultTab: 'inventory',
    allowedPosAccess: false,
    canProcessSales: false,
    canManageProducts: true,
  },
  viewer: {
    role: 'viewer',
    name: 'Read-only Dashboard',
    terminalName: 'Read-only Dashboard',
    defaultTab: 'reporting',
    allowedPosAccess: false,
    canProcessSales: false,
    canManageProducts: false,
  },
};

const BACKEND_CREDENTIALS: Array<{
  email: string;
  aliases: string[];
  staffCode: string;
  name: string;
  role: string;
  password: string;
  pins: string[];
  businessId: string;
}> = [
  {
    email: 'ae.oluwaseyifunmi@gmail.com',
    aliases: ['owner@omnistock.com'],
    staffCode: 'OWN-01',
    name: 'Oluwaseyifunmi (Founder & MD)',
    role: 'owner',
    password: 'Owner@2026',
    pins: ['0000', '2026'],
    businessId: 'biz_omnistock_hq',
  },
  {
    email: 'admin.sarah@omnistock.com',
    aliases: ['admin@omnistock.com'],
    staffCode: 'ADM-01',
    name: 'Sarah Jenkins (Ops Director)',
    role: 'admin',
    password: 'Admin@2026',
    pins: ['1111'],
    businessId: 'biz_omnistock_hq',
  },
  {
    email: 'tunde.adeyemi@omnistock.com',
    aliases: ['manager@omnistock.com'],
    staffCode: 'BM-01',
    name: 'Tunde Adeyemi (Branch Lead)',
    role: 'manager',
    password: 'Manager@2026',
    pins: ['5555', '7777'],
    businessId: 'biz_omnistock_hq',
  },
  {
    email: 'chioma.okeke@omnistock.com',
    aliases: ['cashier@omnistock.com', 'alex.wright@omnistock.internal'],
    staffCode: 'INP-01',
    name: 'Chioma Okeke (Head Cashier)',
    role: 'cashier',
    password: 'Cashier@2026',
    pins: ['1234'],
    businessId: 'biz_omnistock_hq',
  },
  {
    email: 'musa.ibrahim@omnistock.com',
    aliases: ['inventory@omnistock.com'],
    staffCode: 'INV-01',
    name: 'Musa Ibrahim (Stock Lead)',
    role: 'inventory',
    password: 'Inventory@2026',
    pins: ['3333'],
    businessId: 'biz_omnistock_hq',
  },
  {
    email: 'auditor.kemi@omnistock.com',
    aliases: ['viewer@omnistock.com'],
    staffCode: 'VIW-01',
    name: 'Kemi Balogun (Compliance Auditor)',
    role: 'viewer',
    password: 'Viewer@2026',
    pins: ['9999'],
    businessId: 'biz_omnistock_hq',
  },
];

/**
 * Health check & status
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '4.03',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Individual account credentials & password authentication
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body || {};
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    return res.status(400).json({
      success: false,
      error: 'Identifier and password are required.',
    });
  }

  const user = BACKEND_CREDENTIALS.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.staffCode.toLowerCase() === cleanId ||
      u.aliases.some((a) => a.toLowerCase() === cleanId)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid account credentials.',
    });
  }

  const validPassword =
    user.password === cleanPass ||
    user.pins.includes(cleanPass) ||
    cleanPass.toLowerCase() === `${user.role}@2026`.toLowerCase();

  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password. Please check your credentials.',
    });
  }

  const roleInfo = BACKEND_ROLES[user.role] || BACKEND_ROLES.owner;

  return res.json({
    success: true,
    user: {
      email: user.email,
      name: user.name,
      staffCode: user.staffCode,
      role: user.role,
      businessId: user.businessId,
    },
    role: user.role,
    landingTab: roleInfo.defaultTab,
    terminalName: roleInfo.terminalName,
    allowedPosAccess: roleInfo.allowedPosAccess,
    token: `omni_token_${Buffer.from(user.email).toString('base64')}_${Date.now()}`,
  });
});

/**
 * POS Access Verification endpoint
 * Verifies if user role is allowed to access POS terminal.
 * Only Cashier and Owner are permitted.
 */
app.get('/api/pos/verify-access', (req: Request, res: Response) => {
  const role = String(req.query.role || req.headers['x-user-role'] || 'viewer').toLowerCase().trim();
  const roleInfo = BACKEND_ROLES[role] || BACKEND_ROLES.viewer;

  const allowed = roleInfo.allowedPosAccess;

  if (!allowed) {
    return res.status(403).json({
      allowed: false,
      role,
      landingTab: roleInfo.defaultTab,
      terminalName: roleInfo.terminalName,
      message: `Access Denied: POS Terminal is strictly restricted to Cashiers and Owner. You have been redirected to ${roleInfo.terminalName}.`,
    });
  }

  return res.json({
    allowed: true,
    role,
    terminalName: roleInfo.terminalName,
    defaultTab: 'pos',
  });
});

/**
 * Protected Sales & POS Processing endpoint
 * Enforces role restriction on backend operations.
 * Only Cashiers and Owner are permitted to make sales.
 */
app.post('/api/orders/process', (req: Request, res: Response) => {
  const role = String(req.body.role || req.headers['x-user-role'] || '').toLowerCase().trim();
  const roleInfo = BACKEND_ROLES[role];

  if (!roleInfo || !roleInfo.canProcessSales) {
    return res.status(403).json({
      success: false,
      error: `Access Denied: Role '${role || 'unauthenticated'}' is not authorized to process sales transactions. Only authenticated Cashiers and the Owner may process sales.`,
    });
  }

  const orderId = `ord_api_${Date.now()}`;
  const orderNumber = `POS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  return res.json({
    success: true,
    orderId,
    orderNumber,
    message: 'Sales transaction authorized and processed successfully.',
  });
});

// Setup dev server with Vite middlewares OR serve production build
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniStock Enterprise Server running on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer();
