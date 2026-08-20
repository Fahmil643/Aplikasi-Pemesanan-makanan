/**
 * MIE GACOAN DUAL-PORT NODE.JS SERVER
 * Port 3000 -> Customer Portal (customer.html)
 * Port 4000 -> Merchant/Kitchen Portal (merchant.html)
 * Zero external dependencies (uses Node.js built-in http, fs, path).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT_CUSTOMER = 3000;
const PORT_MERCHANT = 4000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');

// MIME type map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readJsonFile(file, fallback = []) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return fallback;
}

function writeJsonFile(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function createHandler(defaultPage) {
  return (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // --- API ROUTES ---
    if (pathname === '/api/orders') {
      if (req.method === 'GET') {
        const orders = readJsonFile(ORDERS_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(orders));
        return;
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const newOrder = JSON.parse(body);
            const orders = readJsonFile(ORDERS_FILE, []);
            orders.unshift(newOrder);
            writeJsonFile(ORDERS_FILE, orders);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Order created' }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status')) {
      const match = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
      if (match && req.method === 'PATCH') {
        const orderId = match[1];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { status } = JSON.parse(body);
            const orders = readJsonFile(ORDERS_FILE, []);
            const target = orders.find(o => o.id === orderId);
            if (target) {
              target.status = status;
              writeJsonFile(ORDERS_FILE, orders);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Status updated' }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
    }

    if (pathname === '/api/menu') {
      if (req.method === 'GET') {
        const menu = readJsonFile(MENU_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(menu));
        return;
      }
    }

    if (pathname.startsWith('/api/menu/') && pathname.endsWith('/availability')) {
      const match = pathname.match(/^\/api\/menu\/([^/]+)\/availability$/);
      if (match && req.method === 'PUT') {
        const menuId = match[1];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { isAvailable } = JSON.parse(body);
            const menu = readJsonFile(MENU_FILE, []);
            const target = menu.find(m => m.id === menuId);
            if (target) {
              target.isAvailable = isAvailable;
              writeJsonFile(MENU_FILE, menu);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Menu availability updated' }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
    }

    // --- STATIC FILES ---
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, defaultPage) : path.join(PUBLIC_DIR, pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  };
}

// Start Server 3000 (Customer)
http.createServer(createHandler('customer.html')).listen(PORT_CUSTOMER, () => {
  console.log(`🛍️ Customer Server running at http://localhost:${PORT_CUSTOMER}`);
});

// Start Server 4000 (Merchant)
http.createServer(createHandler('merchant.html')).listen(PORT_MERCHANT, () => {
  console.log(`👨‍🍳 Merchant Server running at http://localhost:${PORT_MERCHANT}`);
});
