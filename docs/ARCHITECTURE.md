# Arquitetura do Sistema

## Visão Geral

Este projeto implementa uma arquitetura modular e escalável do algoritmo Raft, dividida em camadas bem definidas que separam responsabilidades e facilitam manutenção.

---

## Estrutura de Diretórios

```
RaftTs-main/
├── core/                      # Núcleo do sistema
│   ├── auth/                  # Autenticação e autorização
│   │   ├── configs/          # Configurações de segurança
│   │   └── providers/        # JWT e criptografia
│   ├── baseServer/           # Servidor HTTP base
│   │   ├── core/            # Implementação do servidor
│   │   ├── routes/          # Rotas HTTP
│   │   └── configs/         # Mapeamento de rotas
│   ├── crypto/              # Opções de criptografia
│   ├── models/              # Interfaces e tipos
│   │   ├── dataAccess/     # Modelos de persistência
│   │   ├── filesystem/     # Operações de arquivo
│   │   ├── infrastructure/ # Jobs e filas
│   │   ├── queue/          # Estruturas de fila
│   │   └── streams/        # Processamento de streams
│   ├── providers/           # Implementações de serviços
│   │   ├── dataAccess/     # MongoDB e Redis
│   │   ├── filesystem/     # Sistema de arquivos
│   │   ├── infrastructure/ # MQ, broadcast, load balance
│   │   ├── keyVal/         # Cache key-value
│   │   ├── queue/          # Gerenciamento de filas
│   │   └── streams/        # Produtores e consumidores
│   └── utils/               # Utilitários compartilhados
├── raftNode/                # Implementação do Raft
│   ├── models/             # Estruturas de dados
│   │   ├── Node.ts         # Atributos do nó
│   │   ├── LeaderElection.ts
│   │   └── LogReplication.ts
│   ├── providers/          # Lógica de consenso
│   │   ├── LeaderElectionProvider.ts
│   │   └── LogReplicationProvider.ts
│   ├── InitRaftNodeService.ts
│   └── StartRaftNodeService.ts
├── machineDiscovery/        # Descoberta de nós
│   ├── InitMachineDiscoveryService.ts
│   └── StartMachineDiscoveryService.ts
├── dashboard/               # Interface web
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # Clientes HTTP
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Funções auxiliares
│   │   ├── types/          # Tipos TypeScript
│   │   ├── theme/          # Configuração Material-UI
│   │   └── config/         # Constantes
│   └── public/             # Assets estáticos
├── lb/                      # Load balancer
│   ├── configs/            # Configurações HAProxy
│   └── Dockerfiles
└── docs/                    # Documentação
```

---

## Camadas do Sistema

### 1. Camada de Rede (Network Layer)

**Responsabilidade**: Comunicação entre nós do cluster.

**Componentes**:

- **SocketRouterProvider**: Gerenciamento de conexões ZeroMQ
  - Padrão PUB/SUB para broadcasts
  - Padrão REQ/REP para comunicação ponto-a-ponto
  - Heartbeats periódicos

- **MachineDiscoveryProvider**: Descoberta automática de nós
  - Registro de novos nós
  - Detecção de falhas
  - Atualização da topologia

**Tecnologias**: ZeroMQ 6.0, TCP sockets

### 2. Camada de Consenso (Consensus Layer)

**Responsabilidade**: Implementação do algoritmo Raft.

**Componentes**:

- **LeaderElectionProvider**
  - Gerenciamento de eleições
  - Controle de timeouts
  - Votação distribuída
  - Transição de estados (Follower → Candidate → Leader)

- **LogReplicationProvider**
  - Replicação de entradas
  - Verificação de consistência
  - Commit de entradas
  - Aplicação à máquina de estados

- **Node Models**
  - NodeState: Status atual do nó
  - VoteRequest/Response: Estruturas de votação
  - AppendEntries Request/Response: Replicação de logs

**Fluxo de Dados**:
```
Cliente → Leader → LogReplicationProvider → Followers → Commit → Response
```

### 3. Camada de Aplicação (Application Layer)

**Responsabilidade**: Lógica de negócio e exposição de APIs.

**Componentes**:

- **BaseServer**: Servidor HTTP Express
  - Middleware de autenticação
  - Tratamento de erros
  - CORS e segurança
  - Logging de requisições

- **RaftRoute**: Endpoints REST
  - `/api/raft/state`: Estado do cluster
  - `/api/raft/nodes`: Informações dos nós
  - `/api/raft/logs`: Visualização de logs
  - `/api/raft/metrics`: Métricas de performance
  - `/api/raft/simulation`: Controle de simulações

- **Authentication**: Sistema de autenticação
  - JWT tokens
  - Criptografia de senhas
  - Gestão de sessões

### 4. Camada de Persistência (Persistence Layer)

**Responsabilidade**: Armazenamento durável de dados.

**Componentes**:

- **MongooseProvider**: Persistência MongoDB (opcional)
  - Logs permanentes
  - Snapshots do sistema
  - Histórico de métricas

- **RedisProvider**: Cache distribuído (opcional)
  - Estado volátil
  - Sessões ativas
  - Cache de consultas

- **FileOpProvider**: Sistema de arquivos
  - Logs locais
  - Configurações
  - Snapshots

### 5. Camada de Apresentação (Presentation Layer)

**Responsabilidade**: Interface com o usuário.

**Componentes**:

- **Dashboard React**
  - ClusterOverview: Visão geral do cluster
  - NodeManagement: Gerenciamento de nós
  - LogViewer: Visualização de logs
  - MetricsAnalytics: Gráficos e estatísticas
  - SimulationControls: Simulação de falhas
  - PerformanceTesting: Testes de carga

- **Services**
  - RaftService: Cliente HTTP para API
  - Axios interceptors para autenticação

- **Hooks Customizados**
  - useServerHealth: Monitoramento de saúde
  - useRequestLogs: Polling de logs

---

## Padrões de Projeto Utilizados

### Singleton Pattern

Utilizado em providers críticos para garantir única instância:

```typescript
export class LogProvider {
  private static instance: LogProvider;
  
  static getInstance(): LogProvider {
    if (!LogProvider.instance) {
      LogProvider.instance = new LogProvider();
    }
    return LogProvider.instance;
  }
}
```

### Observer Pattern

Implementado para notificações de mudança de estado:

```typescript
class RaftNode {
  private observers: Observer[] = [];
  
  notifyStateChange(newState: NodeState) {
    this.observers.forEach(obs => obs.update(newState));
  }
}
```

### Strategy Pattern

Diferentes estratégias de persistência:

```typescript
interface PersistenceStrategy {
  save(data: any): Promise<void>;
  load(): Promise<any>;
}

class MongoStrategy implements PersistenceStrategy { ... }
class FileStrategy implements PersistenceStrategy { ... }
```

### Factory Pattern

Criação de nós e serviços:

```typescript
class NodeFactory {
  static createNode(config: NodeConfig): RaftNode {
    return new RaftNode(config);
  }
}
```

---

## Comunicação Entre Componentes

### Fluxo de Eleição

```
1. Follower timeout expira
2. LeaderElectionProvider inicia eleição
3. SocketRouterProvider envia RequestVote
4. Nós respondem com votos
5. Maioria alcançada
6. Estado atualizado para Leader
7. Observadores notificados
```

### Fluxo de Replicação

```
1. Cliente → HTTP POST /api/raft/command
2. RaftRoute → LogReplicationProvider.appendEntry()
3. Leader adiciona ao log local
4. SocketRouterProvider.broadcast(AppendEntries)
5. Followers recebem e replicam
6. Followers enviam confirmação
7. Maioria confirmada → entrada committed
8. RaftRoute responde ao cliente
```

### Fluxo de Monitoramento

```
1. Dashboard → Polling /api/raft/metrics (2s)
2. RaftRoute coleta dados dos nós
3. Métricas agregadas e formatadas
4. Response JSON enviado
5. Dashboard atualiza gráficos
```

---

## Escalabilidade e Performance

### Horizontal Scaling

- Cluster suporta até 7 nós eficientemente
- Além de 7 nós: considerar múltiplos clusters
- Load balancer (HAProxy) distribui leituras

### Otimizações Implementadas

1. **Connection Pooling**: Reutilização de conexões ZeroMQ
2. **Batch Processing**: Agrupamento de comandos
3. **Async I/O**: Operações não-bloqueantes
4. **Caching**: Redis para dados frequentes
5. **Compressão**: Logs e snapshots comprimidos

### Métricas de Performance

Esperadas em hardware modesto (4 cores, 8GB RAM):

- **Latência de escrita**: 10-50ms
- **Throughput**: 5.000-10.000 ops/s
- **Tempo de eleição**: 500ms-1s
- **Recovery time**: < 2s

---

## Segurança

### Autenticação

- JWT tokens com expiração
- Refresh tokens para sessões longas
- Bcrypt para hash de senhas

### Comunicação

- TLS/SSL para conexões externas (configurável)
- Autenticação mútua entre nós
- Rate limiting em APIs

### Isolamento

- Containerização com Docker
- Network namespaces isolados
- Resource limits (CPU, memória)

---

## Extensibilidade

### Adicionando Novos Endpoints

```typescript
// core/baseServer/routes/CustomRoute.ts
export class CustomRoute extends BaseRoute {
  constructor() {
    super('/api/custom');
  }
  
  protected initRoutes() {
    this.router.get('/data', this.getData);
  }
  
  private getData = async (req, res) => {
    // Implementação
  };
}
```

### Novos Providers

```typescript
// core/providers/custom/CustomProvider.ts
export class CustomProvider {
  async execute(data: any): Promise<Result> {
    // Implementação
  }
}
```

### Plugins no Dashboard

```typescript
// dashboard/src/plugins/CustomPlugin.tsx
export const CustomPlugin: React.FC = () => {
  // Componente customizado
};
```

---

## Dependências Principais

### Backend

- **express**: 4.x - Framework HTTP
- **zeromq**: 6.0.0-beta.6 - Messaging
- **typescript**: 4.7.4 - Linguagem
- **mongoose**: 7.x - ODM MongoDB
- **redis**: 4.x - Cliente Redis
- **bcrypt**: 5.x - Hashing
- **jsonwebtoken**: 9.x - JWT

### Frontend

- **react**: 18.x - UI library
- **@mui/material**: 5.x - Componentes
- **chart.js**: 4.x - Gráficos
- **axios**: 1.x - HTTP client
- **react-router-dom**: 6.x - Roteamento

### DevOps

- **docker**: >= 20.x
- **docker-compose**: >= 2.x
- **haproxy**: 2.x
- **grunt**: 1.x - Task runner

---

## Considerações de Design

### Trade-offs

1. **Consistência vs Disponibilidade**
   - Escolha: Forte consistência (CP no teorema CAP)
   - Razão: Natureza do Raft, requisito de maioria

2. **Simplicidade vs Performance**
   - Escolha: Código legível sobre micro-otimizações
   - Razão: Propósito educacional, manutenibilidade

3. **Monolito vs Microserviços**
   - Escolha: Monolito modular
   - Razão: Complexidade reduzida, cluster pequeno

### Decisões Técnicas

- **TypeScript**: Type safety, melhor DX
- **ZeroMQ**: Performance, flexibilidade de padrões
- **React**: Ecosystem rico, componentização
- **Docker**: Reprodutibilidade, isolamento