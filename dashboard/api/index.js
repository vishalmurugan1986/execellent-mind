// Excellent Mind dashboard on Vercel. vercel.json sends every /api/* request here; the web pages in
// public/ are served as static files. Settings come from the project's environment variables.
import { createHandler } from '../lib/handler.mjs';
import { postgresStore } from '../lib/store-postgres.mjs';

const env = process.env;
const dbUrl = env.DATABASE_URL ?? env.POSTGRES_URL;
const missing = ['SCHOOL_KEY', 'ADMIN_PASSWORD'].filter((k) => !env[k]).concat(dbUrl ? [] : ['DATABASE_URL']);

const handle = missing.length
  ? null
  : createHandler({
      config: { schoolName: env.SCHOOL_NAME || 'My School', schoolKey: env.SCHOOL_KEY, adminPassword: env.ADMIN_PASSWORD, sessionSecret: env.SESSION_SECRET },
      store: postgresStore(dbUrl),
    });

export default function handler(req, res) {
  if (!handle) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: `Dashboard not configured: set ${missing.join(', ')} in the Vercel project settings.` }));
  }
  // The rewrite passes the original path as ?p=; fall back to req.url if the platform kept it.
  const url = new URL(req.url, 'http://x');
  const p = url.searchParams.get('p');
  const pathname = p != null ? `/api/${p}` : url.pathname;
  return handle(req, res, pathname);
}
