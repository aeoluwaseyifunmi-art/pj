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
 * Health check & status
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '4.02',
    timestamp: new Date().toISOString(),
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
