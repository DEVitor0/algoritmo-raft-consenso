# Docker - Configuração e Orquestração

## Visão Geral

O projeto utiliza Docker para criar um cluster Raft multi-nó com load balancing via HAProxy. Cada nó executa em um container isolado, permitindo simulação realista de ambiente distribuído.

---

## Arquitetura Docker

### Componentes

```
┌─────────────────────────────────────────────┐
│              HAProxy LB                     │
│        (porta 1098 → nós)                   │
└─────────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┬──────────┐
      │              │              │          │
  ┌───▼───┐     ┌───▼───┐     ┌───▼───┐  ┌───▼───┐
  │ Node1 │     │ Node2 │     │ Node3 │  │ Node4 │
  │ :3001 │     │ :3002 │     │ :3003 │  │ :3004 │
  └───────┘     └───────┘     └───────┘  └───────┘
       │             │             │          │
       └─────────────┴─────────────┴──────────┘
                     │
              ┌──────▼──────┐
              │   Redis     │
              │   :6379     │
              └─────────────┘
```

### Rede

- **Nome**: `raft-network`
- **Driver**: bridge
- **Subnet**: 172.20.0.0/16

---

## Dockerfiles

### Node Dockerfile

**Localização**: `raftNode/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    zeromq-dev

# Dependências Node
COPY package*.json ./
RUN npm ci --only=production

# Código fonte
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/raftNode/StartRaftNodeService.js"]
```

**Otimizações**:
- Imagem Alpine (menor tamanho)
- Multi-stage build (em produção)
- Cache de camadas npm
- Apenas dependências de produção

### Load Balancer Dockerfile

**Localização**: `lb/Dockerfile.portal.dev.lb`

```dockerfile
FROM haproxy:2.8-alpine

COPY lb/configs/haproxy.portal.dev.cfg /usr/local/etc/haproxy/haproxy.cfg

EXPOSE 1098 8404

CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]
```

---

## Docker Compose

### Arquivo Principal

**Localização**: `docker-compose.raft.dev.yml`

```yaml
version: '3.8'

services:
  # Redis (persistência)
  redis:
    image: redis:7-alpine
    container_name: raft-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - raft-network
    command: redis-server --appendonly yes

  # Nó 1
  raft-node-1:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    container_name: raft-node-1
    environment:
      - NODE_ID=1
      - NODE_PORT=3001
      - REDIS_URL=redis://redis:6379
      - CLUSTER_SIZE=4
      - PEER_1=raft-node-2:3002
      - PEER_2=raft-node-3:3003
      - PEER_3=raft-node-4:3004
    ports:
      - "3001:3001"
    depends_on:
      - redis
    networks:
      - raft-network
    restart: unless-stopped

  # Nó 2
  raft-node-2:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    container_name: raft-node-2
    environment:
      - NODE_ID=2
      - NODE_PORT=3002
      - REDIS_URL=redis://redis:6379
      - CLUSTER_SIZE=4
      - PEER_1=raft-node-1:3001
      - PEER_2=raft-node-3:3003
      - PEER_3=raft-node-4:3004
    ports:
      - "3002:3002"
    depends_on:
      - redis
    networks:
      - raft-network
    restart: unless-stopped

  # Nó 3
  raft-node-3:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    container_name: raft-node-3
    environment:
      - NODE_ID=3
      - NODE_PORT=3003
      - REDIS_URL=redis://redis:6379
      - CLUSTER_SIZE=4
      - PEER_1=raft-node-1:3001
      - PEER_2=raft-node-2:3002
      - PEER_3=raft-node-4:3004
    ports:
      - "3003:3003"
    depends_on:
      - redis
    networks:
      - raft-network
    restart: unless-stopped

  # Nó 4
  raft-node-4:
    build:
      context: .
      dockerfile: raftNode/Dockerfile
    container_name: raft-node-4
    environment:
      - NODE_ID=4
      - NODE_PORT=3004
      - REDIS_URL=redis://redis:6379
      - CLUSTER_SIZE=4
      - PEER_1=raft-node-1:3001
      - PEER_2=raft-node-2:3002
      - PEER_3=raft-node-3:3003
    ports:
      - "3004:3004"
    depends_on:
      - redis
    networks:
      - raft-network
    restart: unless-stopped

  # Load Balancer
  haproxy:
    build:
      context: .
      dockerfile: lb/Dockerfile.portal.dev.lb
    container_name: raft-haproxy
    ports:
      - "1098:1098"  # API
      - "8404:8404"  # Stats
    depends_on:
      - raft-node-1
      - raft-node-2
      - raft-node-3
      - raft-node-4
    networks:
      - raft-network
    restart: unless-stopped

networks:
  raft-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  redis_data:
    driver: local
```

---

## HAProxy Configuração

**Localização**: `lb/configs/haproxy.portal.dev.cfg`

```haproxy
global
    log stdout format raw local0
    maxconn 4096
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    retries 3

# Stats
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if TRUE

# Frontend
frontend raft_api
    bind *:1098
    mode http
    
    # CORS
    http-response add-header Access-Control-Allow-Origin "*"
    http-response add-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    http-response add-header Access-Control-Allow-Headers "Content-Type, Authorization"
    
    # Health check bypass
    acl is_health path_beg /api/poll
    use_backend health_check if is_health
    
    default_backend raft_nodes

# Backend - Nós Raft
backend raft_nodes
    mode http
    balance roundrobin
    option httpchk GET /api/poll
    
    server node1 raft-node-1:3001 check inter 2s rise 2 fall 3
    server node2 raft-node-2:3002 check inter 2s rise 2 fall 3
    server node3 raft-node-3:3003 check inter 2s rise 2 fall 3
    server node4 raft-node-4:3004 check inter 2s rise 2 fall 3

# Backend - Health Check
backend health_check
    mode http
    server health raft-node-1:3001
```

**Estratégias de Balanceamento**:
- `roundrobin`: Distribui igualmente
- `leastconn`: Menos conexões
- `source`: Baseado em IP cliente
- `uri`: Baseado em URI

**Health Checks**:
- Intervalo: 2 segundos
- Rise: 2 checks bem-sucedidos para marcar UP
- Fall: 3 checks falhos para marcar DOWN

---

## Comandos Docker

### Iniciar Cluster

```bash
# Build e start
docker-compose -f docker-compose.raft.dev.yml up --build

# Background
docker-compose -f docker-compose.raft.dev.yml up -d

# Rebuild específico
docker-compose -f docker-compose.raft.dev.yml up --build raft-node-1
```

### Parar Cluster

```bash
# Parar gracefully
docker-compose -f docker-compose.raft.dev.yml down

# Parar e remover volumes
docker-compose -f docker-compose.raft.dev.yml down -v

# Parar específico
docker-compose -f docker-compose.raft.dev.yml stop raft-node-2
```

### Logs

```bash
# Todos os serviços
docker-compose -f docker-compose.raft.dev.yml logs -f

# Serviço específico
docker-compose -f docker-compose.raft.dev.yml logs -f raft-node-1

# Últimas 100 linhas
docker-compose -f docker-compose.raft.dev.yml logs --tail=100 raft-node-2
```

### Inspecionar

```bash
# Status dos containers
docker-compose -f docker-compose.raft.dev.yml ps

# Detalhes de um container
docker inspect raft-node-1

# Uso de recursos
docker stats

# Rede
docker network inspect raft_raft-network
```

### Shell no Container

```bash
# Entrar no container
docker exec -it raft-node-1 sh

# Executar comando
docker exec raft-node-1 node -v

# Como root
docker exec -u 0 -it raft-node-1 sh
```

### Limpeza

```bash
# Remover containers parados
docker-compose -f docker-compose.raft.dev.yml rm

# Remover imagens não utilizadas
docker image prune -a

# Remover tudo (cuidado!)
docker system prune -a --volumes
```

---

## Scripts de Automação

### startupDev.sh

```bash
#!/bin/bash

echo "🚀 Iniciando cluster Raft..."

# Verifica Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando"
    exit 1
fi

# Build imagens
echo "📦 Construindo imagens..."
docker-compose -f docker-compose.raft.dev.yml build

# Inicia serviços
echo "🔧 Iniciando serviços..."
docker-compose -f docker-compose.raft.dev.yml up -d

# Aguarda inicialização
echo "⏳ Aguardando inicialização..."
sleep 10

# Health check
echo "🏥 Verificando saúde..."
for i in {1..4}; do
    if curl -sf http://localhost:300$i/api/poll > /dev/null; then
        echo "✅ Node $i: OK"
    else
        echo "❌ Node $i: FALHOU"
    fi
done

echo "✨ Cluster pronto!"
echo "📊 Dashboard: http://localhost:3000"
echo "📈 HAProxy Stats: http://localhost:8404/stats"
```

### stopandremovealldockercontainers.sh

```bash
#!/bin/bash

echo "🛑 Parando cluster Raft..."

docker-compose -f docker-compose.raft.dev.yml down -v

echo "🧹 Limpando recursos..."
docker system prune -f

echo "✅ Cluster parado e limpo"
```

**Tornar executável**:
```bash
chmod +x startupDev.sh stopandremovealldockercontainers.sh
```

---

## Volumes e Persistência

### Redis Volume

```yaml
volumes:
  redis_data:
    driver: local
```

**Localização**: `/var/lib/docker/volumes/raft_redis_data`

**Backup**:
```bash
docker run --rm -v raft_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
```

**Restore**:
```bash
docker run --rm -v raft_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

### Logs Volume

Para persistir logs:

```yaml
services:
  raft-node-1:
    volumes:
      - ./logs/node1:/app/logs
```

---

## Networking

### Comunicação entre Containers

**Por nome de serviço**:
```typescript
// Dentro do container
const peerUrl = 'http://raft-node-2:3002';
```

**Por IP**:
```bash
# Descobrir IP
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' raft-node-1
```

### Expor Portas Adicionais

```yaml
services:
  raft-node-1:
    ports:
      - "3001:3001"    # API
      - "4001:4001"    # ZMQ
      - "9090:9090"    # Metrics
```

### DNS Customizado

```yaml
services:
  raft-node-1:
    extra_hosts:
      - "external-service:192.168.1.100"
```

---

## Variáveis de Ambiente

### Configuração por Nó

```yaml
environment:
  # Identificação
  - NODE_ID=1
  - NODE_NAME=node-1
  
  # Rede
  - NODE_PORT=3001
  - HOST=0.0.0.0
  
  # Cluster
  - CLUSTER_SIZE=4
  - PEER_1=raft-node-2:3002
  - PEER_2=raft-node-3:3003
  - PEER_3=raft-node-4:3004
  
  # Redis
  - REDIS_URL=redis://redis:6379
  - REDIS_DB=0
  
  # Raft
  - ELECTION_TIMEOUT=150
  - HEARTBEAT_INTERVAL=50
  
  # Logs
  - LOG_LEVEL=info
  - LOG_FORMAT=json
```

### Arquivo .env

```bash
# .env
NODE_ENV=development
CLUSTER_SIZE=4
REDIS_PASSWORD=secret123
```

Carregar no compose:
```yaml
services:
  raft-node-1:
    env_file:
      - .env
```

---

## Health Checks

### Docker Native

```yaml
services:
  raft-node-1:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/poll"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

### Status

```bash
# Ver status de health
docker-compose ps

# Detalhes
docker inspect --format='{{json .State.Health}}' raft-node-1 | jq
```

---

## Escalabilidade

### Adicionar Novo Nó

1. **Adicionar ao docker-compose.yml**:

```yaml
raft-node-5:
  build:
    context: .
    dockerfile: raftNode/Dockerfile
  container_name: raft-node-5
  environment:
    - NODE_ID=5
    - NODE_PORT=3005
    - CLUSTER_SIZE=5
    # ... peers
  ports:
    - "3005:3005"
  networks:
    - raft-network
```

2. **Atualizar HAProxy**:

```haproxy
backend raft_nodes
    server node5 raft-node-5:3005 check inter 2s rise 2 fall 3
```

3. **Atualizar peers dos outros nós**:

```yaml
- PEER_4=raft-node-5:3005
```

4. **Rebuild e restart**:

```bash
docker-compose up -d --build
```

---

## Monitoramento

### Logs Centralizados

**Fluentd**:

```yaml
services:
  raft-node-1:
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: raft.node1
```

**Graylog/ELK**:

```yaml
logging:
  driver: gelf
  options:
    gelf-address: udp://graylog:12201
```

### Métricas

**Prometheus**:

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

**Grafana**:

```yaml
services:
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Troubleshooting

### Container não inicia

```bash
# Ver logs de criação
docker-compose logs raft-node-1

# Erros de build
docker-compose build --no-cache raft-node-1

# Inspecionar exit code
docker inspect raft-node-1 --format='{{.State.ExitCode}}'
```

### Problemas de Rede

```bash
# Testar conectividade
docker exec raft-node-1 ping raft-node-2

# Verificar DNS
docker exec raft-node-1 nslookup raft-node-2

# Listar conexões
docker exec raft-node-1 netstat -tupln
```

### Performance Lenta

```bash
# Uso de recursos
docker stats --no-stream

# Limitar recursos
docker-compose.yml:
  services:
    raft-node-1:
      deploy:
        resources:
          limits:
            cpus: '0.5'
            memory: 512M
```

### Redis Connection Failed

```bash
# Verificar Redis está rodando
docker exec raft-redis redis-cli ping

# Testar conexão
docker exec raft-node-1 sh -c 'apk add redis && redis-cli -h redis ping'

# Logs do Redis
docker logs raft-redis
```

### Port Already in Use

```bash
# Identificar processo
lsof -i :3001

# Matar processo
kill -9 <PID>

# Ou mudar porta no compose
ports:
  - "3011:3001"
```

---

## Produção

### Otimizações

**Multi-stage Build**:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache zeromq-dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/raftNode/StartRaftNodeService.js"]
```

**Healthcheck Robusto**:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
```

### Segurança

**Secrets**:

```yaml
secrets:
  redis_password:
    file: ./secrets/redis_password.txt

services:
  redis:
    secrets:
      - redis_password
    command: redis-server --requirepass $(cat /run/secrets/redis_password)
```

**Read-only Root**:

```yaml
services:
  raft-node-1:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

### Deploy com Docker Swarm

```bash
# Inicializar Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.raft.dev.yml raft

# Escalar
docker service scale raft_raft-node=6

# Status
docker stack services raft
```

---

## Recursos Adicionais

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [HAProxy Documentation](http://www.haproxy.org/#docs)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)