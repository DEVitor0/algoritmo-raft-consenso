# Arquitetura do Sistema

> Este documento descreve a estrutura atual do simulador e os componentes planejados para um futuro motor Raft. Os dados e estados exibidos são representações simuladas.

## Visão Geral

Este projeto usa uma estrutura modular para apresentar um simulador visual e didático do algoritmo Raft. Os componentes deixam reservado o local onde um motor Raft real poderá ser implementado.

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
├── raftNode/                # Estruturas e providers planejados do Raft
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

**Responsabilidade**: Local reservado para a implementação futura do algoritmo Raft.

**Componentes**:

- **LeaderElectionProvider**
  - Atualmente vazio; a eleição exibida na API é sorteada pelo simulador
  - Implementação futura: timeouts, votos RequestVote e estados Follower → Candidate → Leader

- **LogReplicationProvider**
  - Atualmente vazio; os logs exibidos são dados simulados
  - Implementação futura: AppendEntries, consistência, quorum e commit

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

### Fluxo de Eleição Exibido pelo Simulador

```
1. O endpoint de simulação incrementa o termo
2. Os estados dos nós são alterados em memória
3. Um líder é escolhido aleatoriamente
4. O dashboard recebe o novo estado

Isso não representa uma eleição Raft distribuída real.
```

### Fluxo de Replicação Exibido pelo Simulador

```
1. Cliente envia um comando ao endpoint
2. Uma entrada é adicionada à lista em memória
3. O status muda de Pending para Committed após um atraso artificial
4. O dashboard recebe o estado atualizado

Não há AppendEntries nem replicação entre processos reais.
```

### Fluxo de Monitoramento

```
1. Dashboard consulta o endpoint de métricas
2. RaftRoute gera valores aleatórios simulados
3. Os valores são enviados ao dashboard
4. Os gráficos são atualizados
```

---

## Escalabilidade e Performance

### Horizontal Scaling

- Cluster suporta até 7 nós eficientemente
- Além de 7 nós: considerar múltiplos clusters
- Load balancer (HAProxy) distribui leituras

### Otimizações não implementadas neste simulador

1. **Connection Pooling**: Reutilização de conexões ZeroMQ
2. **Batch Processing**: Agrupamento de comandos
3. **Async I/O**: Operações não-bloqueantes
4. **Caching**: Redis para dados frequentes
5. **Compressão**: Logs e snapshots comprimidos

### Métricas ilustrativas

Os seguintes intervalos são apenas exemplos gerados pelo código de demonstração:

- **Latência simulada**: 10-60ms
- **Throughput simulado**: 500-1.500 ops/s
- **Uso de memória simulada**: 40-60%
- **Uso de CPU simulado**: 20-50%

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