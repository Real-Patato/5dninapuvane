import { handleLogin, handleRegister, handleVerifySession } from './auth.js';

export function aetherSqliteAuthPlugin() {
  return {
    name: 'aether-sqlite-auth-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/auth/')) {
          return next();
        }

        const parseBody = () => new Promise((resolve, reject) => {
          let bodyData = '';
          req.on('data', chunk => { bodyData += chunk; });
          req.on('end', () => {
            try {
              resolve(bodyData ? JSON.parse(bodyData) : {});
            } catch (err) {
              resolve({});
            }
          });
          req.on('error', reject);
        });

        res.setHeader('Content-Type', 'application/json');

        try {
          if (req.url === '/api/auth/login' && req.method === 'POST') {
            const body = await parseBody();
            const result = handleLogin(body);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.data));
            return;
          }

          if (req.url === '/api/auth/register' && req.method === 'POST') {
            const body = await parseBody();
            const result = handleRegister(body);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.data));
            return;
          }

          if ((req.url === '/api/auth/session' || req.url === '/api/auth/verify') && (req.method === 'GET' || req.method === 'POST')) {
            let token = req.headers.authorization || '';
            if (!token && req.method === 'POST') {
              const body = await parseBody();
              token = body.token || '';
            }
            const result = handleVerifySession(token);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.data));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Endpoint not found on SQLite auth server.' }));
        } catch (err) {
          console.error('[SQLite Backend Error]:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
        }
      });
    }
  };
}
