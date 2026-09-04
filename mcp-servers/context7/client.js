#!/usr/bin/env node

/**
 * Context7 MCP Client
 * Клиент для подключения к удаленному context7 серверу
 */

const http = require('http');
const https = require('https');

const SERVER_URL = process.env.CONTEXT7_URL || 'http://localhost:3007';
const API_KEY = process.env.CONTEXT7_API_KEY || '';
const CLIENT_PORT = process.env.MCP_PORT || 3002;

// Локальный кеш контекста
const contextCache = {
  lastUpdate: null,
  data: {},
  ttl: 5 * 60 * 1000 // 5 минут
};

/**
 * Запрос к context7 серверу
 */
async function fetchFromContext7(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SERVER_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Context7-Client/1.0'
      }
    };

    if (API_KEY) {
      options.headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Context7 returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Обновить кеш контекста
 */
async function updateContextCache() {
  const now = Date.now();
  if (contextCache.lastUpdate && (now - contextCache.lastUpdate) < contextCache.ttl) {
    return contextCache.data;
  }

  try {
    console.log(`[${new Date().toISOString()}] Обновляем контекст из context7...`);
    contextCache.data = await fetchFromContext7('/context');
    contextCache.lastUpdate = now;
    console.log(`✓ Контекст обновлен`);
    return contextCache.data;
  } catch (error) {
    console.error(`❌ Ошибка при загрузке контекста: ${error.message}`);
    return contextCache.data;
  }
}

/**
 * Обработчик запросов к клиенту
 */
const requestHandler = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      connected: !!contextCache.lastUpdate,
      serverUrl: SERVER_URL,
      timestamp: new Date().toISOString()
    }));
  }
  else if (pathname === '/info') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'context7-client',
      version: '1.0.0',
      type: 'mcp-client',
      serverUrl: SERVER_URL,
      cacheStatus: {
        lastUpdate: contextCache.lastUpdate,
        ttl: contextCache.ttl,
        dataSize: Object.keys(contextCache.data).length
      }
    }));
  }
  else if (pathname === '/context') {
    if (req.method === 'GET') {
      updateContextCache().then(data => {
        res.writeHead(200);
        res.end(JSON.stringify({
          source: 'context7',
          cached: true,
          lastUpdate: contextCache.lastUpdate,
          context: data
        }));
      }).catch(err => {
        res.writeHead(503);
        res.end(JSON.stringify({ error: err.message, cached: true, context: contextCache.data }));
      });
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  }
  else if (pathname === '/refresh') {
    contextCache.lastUpdate = null;
    updateContextCache().then(data => {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, context: data }));
    }).catch(err => {
      res.writeHead(503);
      res.end(JSON.stringify({ error: err.message }));
    });
  }
  else if (pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'Context7 MCP Client is running',
      serverUrl: SERVER_URL,
      endpoints: {
        '/health': 'GET - Check client and server health',
        '/info': 'GET - Get client info',
        '/context': 'GET - Get cached context from context7',
        '/refresh': 'GET - Force refresh context cache'
      },
      timestamp: new Date().toISOString()
    }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
};

// Создаем сервер
const server = http.createServer(requestHandler);

server.listen(CLIENT_PORT, () => {
  console.log(`\n🔗 Context7 Client запущен на http://localhost:${CLIENT_PORT}`);
  console.log(`📡 Подключен к серверу: ${SERVER_URL}`);
  console.log(`📋 Доступные endpoints:`);
  console.log(`   GET  /health - Проверка статуса`);
  console.log(`   GET  /info - Информация о клиенте`);
  console.log(`   GET  /context - Получить контекст (кешированный)`);
  console.log(`   GET  /refresh - Обновить кеш контекста\n`);

  // Делаем первый запрос при запуске
  setTimeout(() => updateContextCache(), 1000);
});

server.on('error', (err) => {
  console.error(`❌ Ошибка сервера: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Context7 Client завершает работу...');
  server.close(() => {
    console.log('✓ Сервер остановлен');
    process.exit(0);
  });
});
