#!/usr/bin/env node

/**
 * Health Check Script
 * Проверяет статус MCP серверов
 */

const http = require('http');

async function checkServer(name, url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve({
              name,
              status: 'UP',
              url,
              statusCode: res.statusCode,
              data: result,
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            resolve({
              name,
              status: 'UP',
              url,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          resolve({
            name,
            status: 'DEGRADED',
            url,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        status: 'DOWN',
        url,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 Проверяем статус MCP серверов...\n');

  const results = await Promise.all([
    checkServer('MCP1', 'http://localhost:3001'),
    checkServer('Context7', 'http://localhost:3002')
  ]);

  console.log('📊 Результаты проверки:');
  console.log('─'.repeat(60));

  let allHealthy = true;
  results.forEach(result => {
    const statusIcon = result.status === 'UP' ? '✅' : result.status === 'DOWN' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${result.name.padEnd(15)} ${result.status.padEnd(10)} ${result.url}`);
    if (result.error) {
      console.log(`   └─ Ошибка: ${result.error}`);
      allHealthy = false;
    }
  });

  console.log('─'.repeat(60));
  console.log(`\n${allHealthy ? '✅ Все серверы работают корректно' : '⚠️  Некоторые серверы недоступны'}\n`);

  process.exit(allHealthy ? 0 : 1);
}

main().catch(console.error);
