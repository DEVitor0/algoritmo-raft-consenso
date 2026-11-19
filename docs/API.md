# API Reference

> Os endpoints deste projeto gerenciam um simulador visual. Métricas, líderes, logs e históricos são representações simuladas e não medem ou implementam consenso Raft distribuído.

## Base URL

```
http://localhost:1098/api
```

## Autenticação

Endpoints protegidos requerem token JWT no header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Health Check

#### GET /poll

Verifica se o servidor está respondendo.

**Request**:
```bash
curl http://localhost:1098/api/poll
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": 1704585600000
}
```

---

### Estado do Cluster

#### GET /raft/state

Retorna estado atual do cluster.

**Request**:
```bash
curl http://localhost:1098/api/raft/state
```

**Response** (200 OK):
```json
{
  "currentTerm": 5,
  "leaderId": "node1",
  "nodeState": "Leader",
  "commitIndex": 342,
  "lastApplied": 342,
  "clusterSize": 5,
  "activeNodes": 5,
  "votedFor": null
}
```

**Campos**:
- `currentTerm`: Termo atual do nó
- `leaderId`: ID do líder atual (null se não houver)
- `nodeState`: `Leader`, `Follower`, ou `Candidate`
- `commitIndex`: Índice da última entrada committed
- `lastApplied`: Índice da última entrada aplicada
- `clusterSize`: Tamanho configurado do cluster
- `activeNodes`: Número de nós ativos
- `votedFor`: ID do nó que recebeu voto (ou null)

---

### Gerenciamento de Nós

#### GET /raft/nodes

Lista todos os nós do cluster.

**Request**:
```bash
curl http://localhost:1098/api/raft/nodes
```

**Response** (200 OK):
```json
{
  "nodes": [
    {
      "id": "node1",
      "status": "Leader",
      "lastHeartbeat": 1704585600000,
      "voteCount": 3,
      "logIndex": 342,
      "commitIndex": 342,
      "term": 5,
      "ip": "172.18.0.2",
      "port": 1098
    },
    {
      "id": "node2",
      "status": "Follower",
      "lastHeartbeat": 1704585599500,
      "voteCount": 0,
      "logIndex": 342,
      "commitIndex": 342,
      "term": 5,
      "ip": "172.18.0.3",
      "port": 1099
    }
  ],
  "totalNodes": 5,
  "leader": "node1"
}
```

#### GET /raft/nodes/:nodeId

Detalhes de um nó específico.

**Request**:
```bash
curl http://localhost:1098/api/raft/nodes/node2
```

**Response** (200 OK):
```json
{
  "id": "node2",
  "status": "Follower",
  "term": 5,
  "votedFor": null,
  "log": {
    "lastIndex": 342,
    "lastTerm": 5,
    "size": 342
  },
  "commitIndex": 342,
  "lastApplied": 342,
  "nextIndex": {},
  "matchIndex": {},
  "lastHeartbeat": 1704585599500,
  "uptime": 3600000
}
```

---

### Logs

#### GET /raft/logs

Retorna entradas do log replicado.

**Query Parameters**:
- `start` (opcional): Índice inicial (default: 0)
- `limit` (opcional): Número de entradas (default: 100)
- `term` (opcional): Filtrar por termo
- `status` (opcional): Filtrar por status (`Pending`, `Committed`, `Applied`)

**Request**:
```bash
curl "http://localhost:1098/api/raft/logs?start=300&limit=50"
```

**Response** (200 OK):
```json
{
  "logs": [
    {
      "index": 300,
      "term": 5,
      "command": "SET key1 value1",
      "timestamp": 1704585590000,
      "status": "Committed",
      "clientId": "client-123",
      "size": 24
    },
    {
      "index": 301,
      "term": 5,
      "command": "SET key2 value2",
      "timestamp": 1704585591000,
      "status": "Committed",
      "clientId": "client-456",
      "size": 24
    }
  ],
  "totalEntries": 342,
  "commitIndex": 342,
  "hasMore": true
}
```

#### POST /raft/command

Submete um comando ao cluster.

**Request Body**:
```json
{
  "command": "SET mykey myvalue",
  "clientId": "client-789"
}
```

**Request**:
```bash
curl -X POST http://localhost:1098/api/raft/command \
  -H "Content-Type: application/json" \
  -d '{"command": "SET mykey myvalue"}'
```

**Response** (201 Created):
```json
{
  "success": true,
  "index": 343,
  "term": 5,
  "leaderId": "node1",
  "timestamp": 1704585600000
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "success": false,
  "error": "No leader available",
  "currentTerm": 5
}
```

#### GET /raft/query

Lê valor sem passar pelo log (eventual consistency).

**Query Parameters**:
- `key`: Chave a ser lida

**Request**:
```bash
curl "http://localhost:1098/api/raft/query?key=mykey"
```

**Response** (200 OK):
```json
{
  "key": "mykey",
  "value": "myvalue",
  "term": 5,
  "index": 343
}
```

---

### Métricas

#### GET /raft/metrics

Retorna métricas de performance.

**Query Parameters**:
- `window` (opcional): Janela de tempo em segundos (default: 300)

**Request**:
```bash
curl "http://localhost:1098/api/raft/metrics?window=60"
```

**Response** (200 OK):
```json
{
  "metrics": {
    "latency": [12, 15, 18, 14, 16, 13, 17, 15, 14, 16],
    "throughput": [5234, 5456, 5123, 5678, 5345, 5567, 5423, 5612, 5389, 5501], // valores ilustrativos/simulados
    "memoryUsage": [45.2, 46.1, 45.8, 46.3, 45.9, 46.0, 45.7, 46.2, 45.8, 46.1],
    "cpuUsage": [23.4, 25.1, 22.8, 24.5, 23.9, 24.2, 23.6, 24.8, 23.7, 24.3],
    "networkIO": [1.2, 1.3, 1.1, 1.4, 1.2, 1.3, 1.2, 1.4, 1.2, 1.3],
    "diskIO": [0.5, 0.6, 0.5, 0.7, 0.6, 0.6, 0.5, 0.7, 0.6, 0.6]
  },
  "timestamps": [...],
  "summary": {
    "avgLatency": 14.9,
    "avgThroughput": 5432.8,
    "avgMemory": 45.96,
    "avgCPU": 24.03
  }
}
```

#### GET /raft/analytics

Estatísticas agregadas.

**Request**:
```bash
curl http://localhost:1098/api/raft/analytics
```

**Response** (200 OK):
```json
{
  "totalCommands": 123456,
  "successfulCommands": 123450,
  "failedCommands": 6,
  "avgLatency": 14.2,
  "p50Latency": 12.0,
  "p95Latency": 28.5,
  "p99Latency": 45.2,
  "elections": {
    "total": 3,
    "avgDuration": 856,
    "lastElection": 1704582000000
  },
  "uptime": 86400000,
  "logSize": 342,
  "snapshotCount": 5
}
```

---

### Health

#### GET /raft/health

Verifica saúde do cluster.

**Request**:
```bash
curl http://localhost:1098/api/raft/health
```

**Response** (200 OK):
```json
{
  "healthy": true,
  "leaderPresent": true,
  "quorumSize": 3,
  "activeNodes": 5,
  "partitioned": false,
  "syncStatus": 100,
  "issues": []
}
```

**Response com problemas** (200 OK):
```json
{
  "healthy": false,
  "leaderPresent": false,
  "quorumSize": 3,
  "activeNodes": 2,
  "partitioned": true,
  "syncStatus": 65,
  "issues": [
    "No leader elected",
    "Network partition detected",
    "node3 unreachable",
    "node4 unreachable",
    "node5 unreachable"
  ]
}
```

---

### Simulação

#### POST /raft/simulation/kill

Mata um nó específico.

**Request Body**:
```json
{
  "nodeId": "node3"
}
```

**Request**:
```bash
curl -X POST http://localhost:1098/api/raft/simulation/kill \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "node3"}'
```

**Response** (200 OK):
```json
{
  "success": true,
  "nodeId": "node3",
  "previousState": "Follower",
  "timestamp": 1704585600000
}
```

#### POST /raft/simulation/revive

Revive um nó morto.

**Request Body**:
```json
{
  "nodeId": "node3"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "nodeId": "node3",
  "currentState": "Follower",
  "logsSynced": 342,
  "timestamp": 1704585700000
}
```

#### POST /raft/simulation/partition

Cria partição de rede.

**Request Body**:
```json
{
  "group1": ["node1", "node2"],
  "group2": ["node3", "node4", "node5"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "partitions": 2,
  "majorityPartition": 2,
  "timestamp": 1704585600000
}
```

#### POST /raft/simulation/heal

Remove todas as partições.

**Response** (200 OK):
```json
{
  "success": true,
  "nodesReconnected": 5,
  "newLeader": "node1",
  "timestamp": 1704585700000
}
```

#### POST /raft/simulation/delay

Adiciona latência artificial.

**Request Body**:
```json
{
  "nodeId": "node2",
  "delay": 500
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "nodeId": "node2",
  "delayMs": 500
}
```

---

### Performance Testing

#### POST /raft/performance/throughput

Teste de throughput.

**Request Body**:
```json
{
  "duration": 60,
  "concurrency": 10,
  "commandSize": 100
}
```

**Response** (200 OK):
```json
{
  "totalRequests": 123456,
  "successfulRequests": 123450,
  "failedRequests": 6,
  "throughput": 2057.5, // valor ilustrativo/simulado
  "avgLatency": 12.3,
  "minLatency": 5.2,
  "maxLatency": 156.7,
  "p50Latency": 10.5,
  "p95Latency": 18.2,
  "p99Latency": 25.7,
  "duration": 60000
}
```

#### POST /raft/performance/latency

Teste de latência.

**Request Body**:
```json
{
  "requests": 1000,
  "interval": 10
}
```

**Response** (200 OK):
```json
{
  "samples": 1000,
  "avgLatency": 14.2,
  "minLatency": 8.1,
  "maxLatency": 89.3,
  "stdDeviation": 12.5,
  "percentiles": {
    "p50": 12.0,
    "p90": 25.3,
    "p95": 35.7,
    "p99": 58.2
  }
}
```

#### POST /raft/performance/recovery

Teste de recuperação.

**Request Body**:
```json
{
  "killNodes": 2,
  "observationTime": 30
}
```

**Response** (200 OK):
```json
{
  "killedNodes": ["node3", "node4"],
  "electionTime": 1230,
  "recoveryTime": 2450,
  "dataLoss": 0,
  "downtime": 1230,
  "success": true
}
```

---

### Configuração

#### GET /raft/config

Retorna configuração atual.

**Response** (200 OK):
```json
{
  "nodeId": "node1",
  "clusterSize": 5,
  "peers": ["node2", "node3", "node4", "node5"],
  "electionTimeoutMin": 1500,
  "electionTimeoutMax": 3000,
  "heartbeatInterval": 500,
  "logCompactionThreshold": 10000,
  "snapshotInterval": 3600000
}
```

#### PUT /raft/config

Atualiza configuração (requer reinicialização).

**Request Body**:
```json
{
  "electionTimeoutMin": 2000,
  "electionTimeoutMax": 4000,
  "heartbeatInterval": 600
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration updated. Restart required.",
  "updatedFields": [
    "electionTimeoutMin",
    "electionTimeoutMax",
    "heartbeatInterval"
  ]
}
```

---

### Debug

#### GET /raft/debug/state

Estado detalhado para debugging.

**Response** (200 OK):
```json
{
  "nodeId": "node1",
  "state": "Leader",
  "term": 5,
  "votedFor": null,
  "log": {
    "entries": 342,
    "lastIndex": 342,
    "lastTerm": 5,
    "committed": 342,
    "applied": 342
  },
  "peers": {
    "node2": {
      "nextIndex": 343,
      "matchIndex": 342,
      "lastContact": 1704585599500
    },
    ...
  },
  "timers": {
    "electionTimeout": 2450,
    "heartbeatInterval": 500,
    "lastHeartbeat": 1704585600000
  }
}
```

#### GET /raft/debug/elections

Histórico de eleições.

**Response** (200 OK):
```json
{
  "elections": [
    {
      "term": 1,
      "startTime": 1704582000000,
      "endTime": 1704582001200,
      "duration": 1200,
      "winner": "node1",
      "votes": {
        "node1": "node1",
        "node2": "node1",
        "node3": "node1",
        "node4": "node2",
        "node5": "node1"
      }
    },
    ...
  ],
  "totalElections": 3
}
```

#### GET /raft/debug/consistency

Verifica consistência entre nós.

**Response** (200 OK):
```json
{
  "consistent": true,
  "nodes": {
    "node1": {
      "lastIndex": 342,
      "lastTerm": 5,
      "checksum": "a1b2c3d4"
    },
    "node2": {
      "lastIndex": 342,
      "lastTerm": 5,
      "checksum": "a1b2c3d4"
    },
    ...
  },
  "inconsistencies": []
}
```

---

## Códigos de Status

- **200 OK**: Requisição bem-sucedida
- **201 Created**: Recurso criado
- **400 Bad Request**: Parâmetros inválidos
- **401 Unauthorized**: Autenticação necessária
- **403 Forbidden**: Sem permissão
- **404 Not Found**: Recurso não encontrado
- **500 Internal Server Error**: Erro no servidor
- **503 Service Unavailable**: Cluster sem líder

## Rate Limiting

- **Limite**: 1000 requisições/minuto por IP
- **Header de resposta**: `X-RateLimit-Remaining`
- **Código ao exceder**: 429 Too Many Requests