# Guia de Instalação

## Requisitos do Sistema

### Software Obrigatório

- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0

### Software Opcional

- **MongoDB**: >= 6.0 (para persistência)
- **Redis**: >= 7.0 (para cache)
- **Git**: >= 2.30

### Requisitos de Hardware

**Mínimo**:
- CPU: 2 cores
- RAM: 4GB
- Disco: 2GB livre

**Recomendado**:
- CPU: 4 cores
- RAM: 8GB
- Disco: 10GB livre

---

## Instalação Local

### 1. Clonar o Repositório

```bash
git clone https://github.com/DEVitor0/algoritmo-raft-consenso.git
cd algoritmo-raft-consenso
```

### 2. Instalar Dependências do Backend

```bash
npm install
```

Se houver erros com ZeroMQ, instale dependências do sistema:

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y build-essential libzmq3-dev
```

**macOS**:
```bash
brew install zeromq
```

**Windows**:
```bash
# Usar WSL2 ou instalar Visual Studio Build Tools
npm install --global windows-build-tools
```

### 3. Instalar Dependências do Frontend

```bash
cd dashboard
npm install
cd ..
```

### 4. Configurar Variáveis de Ambiente

#### Backend

Crie `.env` na raiz do projeto:

```bash
# Servidor
NODE_ENV=development
PORT=1098

# Raft
RAFT_NODE_ID=node1
RAFT_CLUSTER_SIZE=5
RAFT_ELECTION_TIMEOUT_MIN=1500
RAFT_ELECTION_TIMEOUT_MAX=3000
RAFT_HEARTBEAT_INTERVAL=500

# MongoDB (opcional)
MONGODB_URI=mongodb://localhost:27017/raft
MONGODB_ENABLED=false

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false

# Autenticação
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=24h

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/raft.log
```

#### Frontend

Crie `dashboard/.env`:

```bash
VITE_API_URL=http://localhost:1098
VITE_WS_URL=ws://localhost:1098
VITE_POLLING_INTERVAL=2000
```

### 5. Build do Projeto

```bash
# Build backend
npm run build

# Build frontend
cd dashboard
npm run build
cd ..
```

---

## Instalação com Docker

### Método Rápido

```bash
# Iniciar cluster completo (5 nós + dashboard + load balancer)
docker-compose -f docker-compose.raft.dev.yml up -d

# Verificar status
docker-compose -f docker-compose.raft.dev.yml ps

# Ver logs
docker-compose -f docker-compose.raft.dev.yml logs -f
```

### Configuração Personalizada

#### docker-compose.raft.dev.yml

```yaml
version: '3.8'

services:
  node1:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    environment:
      - RAFT_NODE_ID=node1
      - RAFT_PEERS=node2,node3,node4,node5
      - PORT=1098
    ports:
      - "1098:1098"
    networks:
      - raft-network

  node2:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    environment:
      - RAFT_NODE_ID=node2
      - RAFT_PEERS=node1,node3,node4,node5
      - PORT=1099
    ports:
      - "1099:1099"
    networks:
      - raft-network

  # ... node3, node4, node5 similarmente

  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://lb:80
    depends_on:
      - lb
    networks:
      - raft-network

  lb:
    build:
      context: ./lb
      dockerfile: Dockerfile.portal.dev.lb
    ports:
      - "80:80"
      - "8404:8404"  # Stats
    depends_on:
      - node1
      - node2
      - node3
      - node4
      - node5
    networks:
      - raft-network

networks:
  raft-network:
    driver: bridge
```

### Build Manual de Imagens

```bash
# Backend
docker build -t raft-node:latest -f raftNode/Dockerfile .

# Frontend
docker build -t raft-dashboard:latest -f dashboard/Dockerfile ./dashboard

# Load Balancer
docker build -t raft-lb:latest -f lb/Dockerfile.portal.dev.lb ./lb
```

---

## Verificação da Instalação

### Testar Backend

```bash
# Iniciar um nó
npm run start:dev

# Em outro terminal, testar endpoint
curl http://localhost:1098/api/poll
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": 1704585600000
}
```

### Testar Frontend

```bash
cd dashboard
npm run dev
```

Acesse `http://localhost:3000` no navegador.

### Testar Cluster Docker

```bash
# Verificar saúde dos nós
for port in 1098 1099 1100 1101 1102; do
  curl http://localhost:$port/api/raft/state
done

# Dashboard
curl http://localhost:3000

# HAProxy stats
curl http://localhost:8404/stats
```

---

## Resolução de Problemas

### ZeroMQ não compila

**Erro**: `npm ERR! code 1` durante instalação

**Solução**:
```bash
# Limpar cache npm
npm cache clean --force

# Instalar dependências do sistema
sudo apt-get install -y python3 make g++ libzmq3-dev

# Reinstalar
npm install zeromq --build-from-source
```

### Portas em uso

**Erro**: `EADDRINUSE: address already in use`

**Solução**:
```bash
# Verificar processo usando a porta
lsof -i :1098

# Matar processo
kill -9 <PID>

# Ou mudar porta no .env
PORT=9000
```

### Docker out of memory

**Erro**: Containers reiniciando constantemente

**Solução**:
```bash
# Aumentar memória do Docker Desktop
# Settings > Resources > Memory > 4GB+

# Ou adicionar limits no docker-compose.yml
services:
  node1:
    mem_limit: 512m
    memswap_limit: 512m
```

### Frontend não conecta ao backend

**Erro**: `Network Error` no browser console

**Solução**:
1. Verificar se backend está rodando: `curl http://localhost:1098/api/poll`
2. Verificar CORS no backend
3. Confirmar `VITE_API_URL` correto no `dashboard/.env`
4. Restartar dev server: `npm run dev`

### Build falha no TypeScript

**Erro**: `TS2307: Cannot find module`

**Solução**:
```bash
# Limpar cache do TypeScript
rm -rf node_modules
rm package-lock.json
npm install

# Rebuild
npm run build
```

---

## Configurações Avançadas

### Cluster com MongoDB

1. Iniciar MongoDB:
```bash
docker run -d -p 27017:27017 --name mongo mongo:6
```

2. Habilitar no `.env`:
```bash
MONGODB_ENABLED=true
MONGODB_URI=mongodb://localhost:27017/raft
```

3. Reiniciar nós

### Cluster com Redis

1. Iniciar Redis:
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

2. Habilitar no `.env`:
```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### SSL/TLS

1. Gerar certificados:
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

2. Configurar no `.env`:
```bash
SSL_ENABLED=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

3. Atualizar `VITE_API_URL` para `https://`

---

## Scripts Úteis

### Development

```bash
# Backend dev com hot reload
npm run dev

# Frontend dev
cd dashboard && npm run dev

# Ambos simultaneamente
npm run dev:all
```

### Production

```bash
# Build otimizado
npm run build
NODE_ENV=production npm start

# Dashboard production build
cd dashboard
npm run build
npm run preview
```

### Docker

```bash
# Iniciar cluster
./startupDev.sh

# Parar cluster
./stopandremovealldockercontainers.sh

# Logs de um nó específico
docker-compose logs -f node1

# Rebuild após mudanças
docker-compose up -d --build
```

### Testing

```bash
# Testes unitários
npm test

# Testes com coverage
npm run test:coverage

# Testes E2E
npm run test:e2e
```

---

## Próximos Passos

Após a instalação bem-sucedida:

1. Leia o [Guia de Uso](USAGE.md)
2. Explore a [API Reference](API.md)
3. Familiarize-se com o [Dashboard](DASHBOARD.md)
4. Experimente [Simulações de Falhas](USAGE.md#simulação-de-falhas)