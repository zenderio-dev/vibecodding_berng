#!/usr/bin/env node

/**
 * MCP1 Local Server
 * Простой локальный MCP сервер для предоставления информации агентам
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.MCP_PORT || 3001;
const SERVER_NAME = process.env.MCP_SERVER_NAME || 'mcp1';

// Хранилище данных
const dataStore = {
  status: 'running',
  timestamp: new Date().toISOString(),
  info: {
    name: SERVER_NAME,
    version: '1.0.0',
    type: 'local-mcp-server'
  },
  agents: [],
  context: {}
};

// Обработчик запросов
const requestHandler = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // Маршруты
  if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  }
  else if (pathname === '/info') {
    res.writeHead(200);
    res.end(JSON.stringify(dataStore.info));
  }
  else if (pathname === '/context') {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(dataStore.context));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          dataStore.context = { ...dataStore.context, ...data };
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, context: dataStore.context }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  }
  else if (pathname === '/agents') {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(dataStore.agents));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const agent = JSON.parse(body);
          agent.id = `agent-${Date.now()}`;
          agent.registered = new Date().toISOString();
          dataStore.agents.push(agent);
          res.writeHead(201);
          res.end(JSON.stringify(agent));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
  }
  else if (pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'MCP1 Server is running',
      endpoints: {
        '/health': 'GET - Check server health',
        '/info': 'GET - Get server info',
        '/context': 'GET/POST - Manage context data',
        '/agents': 'GET/POST - Manage registered agents'
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

server.listen(PORT, () => {
  console.log(`\n🚀 MCP1 Server запущен на http://localhost:${PORT}`);
  console.log(`📋 Доступные endpoints:`);
  console.log(`   GET  /health - Проверка здоровья сервера`);
  console.log(`   GET  /info - Информация о сервере`);
  console.log(`   GET/POST /context - Управление контекстом`);
  console.log(`   GET/POST /agents - Управление агентами\n`);
});

server.on('error', (err) => {
  console.error(`❌ Ошибка сервера: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 MCP1 Server завершает работу...');
  server.close(() => {
    console.log('✓ Сервер остановлен');
    process.exit(0);
  });
});
