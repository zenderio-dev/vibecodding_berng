# MCP Servers Configuration

Конфигурация и инструменты для запуска двух MCP серверов: локального `mcp1` и клиента `context7`.

## Структура проекта

```
.
├── mcp-config.json              # Главная конфигурация MCP
├── mcp-servers/
│   ├── mcp1/
│   │   └── server.js            # Локальный MCP1 сервер
│   └── context7/
│       └── client.js            # Клиент Context7 (подключение к удаленному серверу)
├── scripts/
│   └── health-check.js          # Скрипт проверки здоровья серверов
├── .vscode/
│   └── launch.json              # Конфигурация для запуска в VS Code
├── mcp-data/                    # Директория для хранения данных серверов
└── package.json                 # Управление зависимостями
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск всех серверов

```bash
npm start
```

Или отдельные команды:

```bash
# Только MCP1
npm run start:mcp1

# Только Context7
npm run start:context7

# С автоперезагрузкой (требует nodemon)
npm run start:mcp1:watch
npm run start:context7:watch
```

### 3. Проверка статуса

```bash
npm run health:check
```

## MCP1 - Локальный сервер

**Порт:** 3001  
**URL:** `http://localhost:3001`

### Endpoints

- `GET /health` - Проверка здоровья
- `GET /info` - Информация о сервере
- `GET /context` - Получить контекст
- `POST /context` - Обновить контекст
- `GET /agents` - Список агентов
- `POST /agents` - Зарегистрировать агента

### Пример использования

```bash
# Проверка здоровья
curl http://localhost:3001/health

# Получить контекст
curl http://localhost:3001/context

# Добавить контекст
curl -X POST http://localhost:3001/context \
  -H "Content-Type: application/json" \
  -d '{"projectName": "vibecodding", "version": "1.0.0"}'
```

## Context7 - Клиент удаленного сервера

**Порт:** 3002  
**URL:** `http://localhost:3002`  
**Подключение к:** `http://localhost:3007` (по умолчанию)

### Endpoints

- `GET /health` - Проверка здоровья клиента и сервера
- `GET /info` - Информация о клиенте
- `GET /context` - Получить контекст из context7 (кешированный)
- `GET /refresh` - Обновить кеш контекста

### Переменные окружения

```bash
CONTEXT7_URL=http://localhost:3007        # URL сервера context7
CONTEXT7_API_KEY=your-api-key            # API ключ (опционально)
```

### Пример использования

```bash
# Проверка соединения
curl http://localhost:3002/health

# Получить контекст
curl http://localhost:3002/context

# Обновить кеш контекста
curl http://localhost:3002/refresh
```

## Интеграция с VS Code

### Способ 1: Через launch.json

1. Откройте VS Code
2. Перейдите в Run → Run and Debug (Ctrl+Shift+D)
3. Выберите конфигурацию:
   - "Start MCP1 Server" - запуск только MCP1
   - "Start Context7 Client" - запуск только Context7
   - "Start All MCP Servers" - запуск обоих

### Способ 2: Через встроенный терминал

Откройте терминал в VS Code и выполните:

```bash
npm start
```

## Конфигурация MCP серверов в VS Code

Для интеграции с расширением MCP в VS Code, используйте следующую конфигурацию в `settings.json`:

```json
{
  "mcp.servers": {
    "mcp1": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-servers/mcp1/server.js"],
      "env": {
        "MCP_PORT": "3001"
      },
      "autoStart": true
    },
    "context7": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-servers/context7/client.js"],
      "env": {
        "MCP_PORT": "3002",
        "CONTEXT7_URL": "http://localhost:3007"
      },
      "autoStart": true
    }
  }
}
```

## Архитектура взаимодействия

```
┌─────────────────────────────────────────────────┐
│          VS Code + MCP Extension                │
└────────────────┬────────────────────────────────┘
                 │
     ┌───────────┴────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐      ┌──────────────┐
│   MCP1       │      │ Context7     │
│ Local Server │      │   Client     │
│              │      │              │
│ Port: 3001   │      │ Port: 3002   │
└──────────────┘      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Context7     │
                      │ Remote Server│
                      │              │
                      │ Port: 3007   │
                      └──────────────┘
```

## Агенты и контекст

Агенты могут подключаться к серверам и получать актуальную информацию:

```javascript
// Пример для агента
const contextData = await fetch('http://localhost:3001/context');
const agentInfo = await fetch('http://localhost:3001/agents');
```

## Логирование

Оба сервера выводят логи в консоль с временными метками:

```
[2026-09-04T09:46:00.000Z] GET /context
[2026-09-04T09:46:01.000Z] POST /context
```

## Развертывание в production

Для production среды:

1. Используйте PM2 или другой process manager
2. Установите `CONTEXT7_API_KEY` переменную окружения
3. Настройте правильный `CONTEXT7_URL`
4. Включите HTTPS для Context7 соединения
5. Добавьте аутентификацию для MCP1 endpoint

```bash
pm2 start mcp-servers/mcp1/server.js --name "mcp1" --env "MCP_PORT=3001"
pm2 start mcp-servers/context7/client.js --name "context7" --env "CONTEXT7_URL=https://context7.example.com"
```

## Troubleshooting

### Ошибка: "EADDRINUSE :::3001"
Port 3001 уже используется. Смените порт в переменной `MCP_PORT`.

### Ошибка: "Cannot find module 'http'"
Убедитесь, что установлен Node.js >= 20.0.0

### Context7 клиент не подключается к серверу
Проверьте:
- Правильность `CONTEXT7_URL`
- Доступность сервера: `curl http://localhost:3007/health`
- Наличие `CONTEXT7_API_KEY` если требуется

## Поддержка

Для вопросов или проблем обратитесь к документации или откройте issue в репозитории.
