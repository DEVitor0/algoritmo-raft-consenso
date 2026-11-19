# Guia de Uso

> Este guia descreve controles visuais e dados simulados. Os estados, métricas e resultados de falha não representam um cluster Raft real.

## Iniciando o Sistema

### Modo Desenvolvimento Local

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd dashboard
npm run dev
```

Acesse: `http://localhost:3000`

### Modo Docker

```bash
# Iniciar cluster completo
docker-compose -f docker-compose.raft.dev.yml up -d

# Verificar status
docker-compose ps

# Acessar logs
docker-compose logs -f node1
```

Acesse: `http://localhost:3000`

---

## Interagindo com o Cluster

### Via Dashboard

A interface web oferece controle completo sobre o cluster.

#### Visão Geral do Cluster

- Status geral (líder, nós ativos, termo atual)
- Métricas simuladas atualizadas pelo servidor
- Gráficos de latência e throughput

#### Gerenciamento de Nós

- Listar todos os nós
- Visualizar status individual
- Verificar saúde de cada nó

#### Controles de Simulação

- **Matar Nó**: Simula falha de um nó específico
- **Particionar Rede**: Cria partição entre nós
- **Reiniciar Nó**: Restaura nó falho
- **Reset Cluster**: Reinicia todos os nós

### Via API REST

#### Obter Estado do Cluster

```bash
curl http://localhost:1098/api/raft/state
```

Resposta:
```json
{
  "currentTerm": 5,
  "leaderId": "node1",
  "nodeState": "Leader",
  "commitIndex": 342,
  "lastApplied": 342,
  "clusterSize": 5,
  "activeNodes": 5
}
```

#### Listar Nós

```bash
curl http://localhost:1098/api/raft/nodes
```

Resposta:
```json
{
  "nodes": [
    {
      "id": "node1",
      "status": "Leader",
      "lastHeartbeat": 1704585600000,
      "term": 5,
      "logIndex": 342,
      "ip": "172.18.0.2",
      "port": 1098
    },
    {
      "id": "node2",
      "status": "Follower",
      "lastHeartbeat": 1704585599500,
      "term": 5,
      "logIndex": 342,
      "ip": "172.18.0.3",
      "port": 1099
    }
  ]
}
```

#### Visualizar Logs

```bash
curl http://localhost:1098/api/raft/logs
```

Resposta:
```json
{
  "logs": [
    {
      "index": 340,
      "term": 5,
      "command": "SET key1 value1",
      "timestamp": 1704585590000,
      "status": "Committed"
    },
    {
      "index": 341,
      "term": 5,
      "command": "SET key2 value2",
      "timestamp": 1704585595000,
      "status": "Committed"
    }
  ],
  "totalEntries": 342,
  "commitIndex": 342
}
```

#### Métricas de Performance

```bash
curl http://localhost:1098/api/raft/metrics
```

Resposta:
```json
{
  "metrics": {
    "latency": [12, 15, 18, 14, 16],
    "throughput": [5234, 5456, 5123, 5678, 5345], // valores ilustrativos/simulados
    "memoryUsage": [45.2, 46.1, 45.8, 46.3, 45.9],
    "cpuUsage": [23.4, 25.1, 22.8, 24.5, 23.9],
    "networkIO": [1.2, 1.3, 1.1, 1.4, 1.2],
    "diskIO": [0.5, 0.6, 0.5, 0.7, 0.6]
  },
  "timestamps": [
    1704585560000,
    1704585570000,
    1704585580000,
    1704585590000,
    1704585600000
  ]
}
```

---

## Operações Comuns

### Enviar Comando ao Cluster

```bash
curl -X POST http://localhost:1098/api/raft/command \
  -H "Content-Type: application/json" \
  -d '{"command": "SET mykey myvalue"}'
```

Resposta:
```json
{
  "success": true,
  "index": 343,
  "term": 5,
  "leaderId": "node1"
}
```

### Verificar Saúde do Sistema

```bash
curl http://localhost:1098/api/raft/health
```

Resposta:
```json
{
  "healthy": true,
  "leaderPresent": true,
  "quorumSize": 3,
  "activeNodes": 5,
  "partitioned": false,
  "syncStatus": 100
}
```

### Obter Configuração Atual

```bash
curl http://localhost:1098/api/raft/config
```

Resposta:
```json
{
  "nodeId": "node1",
  "clusterSize": 5,
  "electionTimeoutMin": 1500,
  "electionTimeoutMax": 3000,
  "heartbeatInterval": 500,
  "peers": ["node2", "node3", "node4", "node5"]
}
```

---

## Simulação de Falhas

### Simular Falha de Nó

#### Via Dashboard

1. Acesse "Controle de Simulação"
2. Selecione o nó desejado
3. Clique em "Matar Nó"
4. Observe a eleição de novo líder

#### Via API

```bash
curl -X POST http://localhost:1098/api/raft/simulation/kill \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "node3"}'
```

**Comportamento Esperado**:
- Nó3 para de responder
- Heartbeats falham
- Se era líder: o painel mostra uma mudança simulada de líder
- A interface continua mostrando 4 nós ativos

### Simular Partição de Rede

```bash
curl -X POST http://localhost:1098/api/raft/simulation/partition \
  -H "Content-Type: application/json" \
  -d '{
    "group1": ["node1", "node2"],
    "group2": ["node3", "node4", "node5"]
  }'
```

**Comportamento Esperado**:
- Cluster se divide em duas partições
- Partição majoritária (3 nós) elege líder
- Partição minoritária (2 nós) não consegue eleger líder
- Writes só funcionam na partição majoritária

### Restaurar Nó

```bash
curl -X POST http://localhost:1098/api/raft/simulation/revive \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "node3"}'
```

**Comportamento da Simulação**:
- Nó3 muda visualmente para o estado reiniciado
- A interface representa uma possível sincronização
- O nó retorna visualmente ao estado Follower
- O painel volta a mostrar 5 nós

### Heal Partição

```bash
curl -X POST http://localhost:1098/api/raft/simulation/heal
```

**Comportamento Esperado**:
- Comunicação restaurada entre todas partições
- Nós minoritários se atualizam
- Cluster unificado com único líder
- Logs inconsistentes são corrigidos

---

## Testes de Performance

### Teste de Throughput

```bash
curl -X POST http://localhost:1098/api/raft/performance/throughput \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 60,
    "concurrency": 10,
    "commandSize": 100
  }'
```

Parâmetros:
- `duration`: Duração do teste em segundos
- `concurrency`: Número de clientes simultâneos
- `commandSize`: Tamanho médio do comando em bytes

Resposta:
```json
{
  "totalRequests": 123456,
  "successfulRequests": 123450,
  "failedRequests": 6,
  "throughput": 2057.5, // valor ilustrativo/simulado
  "avgLatency": 12.3,
  "p50Latency": 10.5,
  "p95Latency": 18.2,
  "p99Latency": 25.7
}
```

### Teste de Latência

```bash
curl -X POST http://localhost:1098/api/raft/performance/latency \
  -H "Content-Type: application/json" \
  -d '{
    "requests": 1000,
    "interval": 10
  }'
```

### Teste de Recuperação

```bash
curl -X POST http://localhost:1098/api/raft/performance/recovery \
  -H "Content-Type: application/json" \
  -d '{
    "killNodes": 2,
    "observationTime": 30
  }'
```

Mede tempo de recuperação após falha de nós.

---

## Monitoramento

### Logs do Sistema

#### Visualizar Logs em Tempo Real

```bash
# Logs do nó específico
tail -f logs/node1.log

# Todos os logs
tail -f logs/*.log
```

#### Filtrar por Nível

```bash
# Apenas erros
grep "ERROR" logs/node1.log

# Warnings e erros
grep -E "WARN|ERROR" logs/node1.log
```

### Métricas

#### Via Dashboard

O dashboard exibe automaticamente:
- Latência de writes (ms)
- Throughput (ops/s)
- Uso de CPU (%)
- Uso de Memória (%)
- I/O de Rede (MB/s)
- I/O de Disco (MB/s)

#### Via Prometheus (se configurado)

```bash
curl http://localhost:1098/metrics
```

Formato Prometheus para integração com Grafana.

---

## Casos de Uso Práticos

### Exemplo 1: Banco de Dados Distribuído

Usar Raft para replicar estado de um KV store:

```bash
# SET operation
curl -X POST http://localhost:1098/api/raft/command \
  -d '{"command": "SET user:1234 {\"name\":\"João\",\"age\":30}"}'

# GET operation (pode ser feito em qualquer nó)
curl http://localhost:1098/api/raft/query?key=user:1234
```

### Exemplo 2: Sistema de Configuração

Usar Raft para manter configuração consistente:

```bash
# Atualizar configuração
curl -X POST http://localhost:1098/api/raft/command \
  -d '{"command": "CONFIG_SET max_connections 1000"}'

# Ler configuração
curl http://localhost:1098/api/raft/query?key=max_connections
```

### Exemplo 3: Lock Distribuído

Implementar mutex distribuído:

```bash
# Adquirir lock
curl -X POST http://localhost:1098/api/raft/command \
  -d '{"command": "LOCK resource_123 client_456"}'

# Liberar lock
curl -X POST http://localhost:1098/api/raft/command \
  -d '{"command": "UNLOCK resource_123 client_456"}'
```

---

## Depuração

### Verificar Estado de um Nó

```bash
curl http://localhost:1098/api/raft/debug/state
```

### Dump do Log

```bash
curl http://localhost:1098/api/raft/debug/log > raft_log_dump.json
```

### Análise de Eleições

```bash
curl http://localhost:1098/api/raft/debug/elections
```

Retorna histórico de eleições com timings.

### Verificar Inconsistências

```bash
curl http://localhost:1098/api/raft/debug/consistency
```

Compara logs entre todos os nós.

---

## Boas Práticas

### Performance

1. **Ajustar timeouts**: Balancear entre falsa eleição e tempo de recuperação
2. **Batch writes**: Agrupar comandos quando possível
3. **Read from followers**: Para leituras que toleram eventual consistency
4. **Monitorar métricas**: Identificar gargalos precocemente

### Confiabilidade

1. **Mínimo 3 nós**: Para tolerar 1 falha
2. **Backup regular**: Snapshots do estado
3. **Logs persistentes**: Usar MongoDB ou filesystem
4. **Monitoramento ativo**: Alertas para falhas

### Segurança

1. **Autenticação**: Ativar JWT para APIs
2. **TLS/SSL**: Criptografar comunicação
3. **Rate limiting**: Prevenir DoS
4. **Validação de entrada**: Sanitizar comandos

---

## Troubleshooting

### Cluster não elege líder

**Sintomas**: Todos os nós em estado Candidate

**Causas possíveis**:
- Latência de rede alta
- Timeouts mal configurados
- Partição de rede

**Solução**:
```bash
# Verificar conectividade
for node in node{1..5}; do
  curl http://$node:1098/api/poll
done

# Aumentar timeouts
# Editar .env:
RAFT_ELECTION_TIMEOUT_MIN=3000
RAFT_ELECTION_TIMEOUT_MAX=6000
```

### Logs divergentes

**Sintomas**: Inconsistência entre nós

**Solução**:
```bash
# Forçar sincronização
curl -X POST http://localhost:1098/api/raft/admin/sync

# Se persistir, recriar cluster
./stopandremovealldockercontainers.sh
./startupDev.sh
```

### Alta latência

**Sintomas**: Writes lentos (> 100ms)

**Causas possíveis**:
- Disco lento
- Rede congestionada
- CPU sobrecarregada

**Solução**:
```bash
# Verificar recursos
docker stats

# Aumentar recursos
# docker-compose.yml:
services:
  node1:
    cpus: '2'
    mem_limit: 2g
```

---

## Referências

- [API Reference](API.md) - Documentação completa dos endpoints
- [Dashboard Guide](DASHBOARD.md) - Detalhes da interface web
- [Architecture](ARCHITECTURE.md) - Entendimento do sistema