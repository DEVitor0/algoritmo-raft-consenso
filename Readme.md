<div align="center">
  <img src="docs/image/solo.png" alt="Raft Logo" width="150" />
  <h1>The Raft Consensus Algorithm</h1>
</div>

## Sobre o Projeto

Este projeto fornece uma implementação em TypeScript do protocolo de consenso Raft, acompanhada por um painel de simulação web. A implementação segue a especificação original, cobrindo eleição de líder, replicação de logs e tolerância a falhas. O painel permite visualizar em tempo real o estado do cluster, os logs de cada nó e a troca de mensagens, além de possibilitar a injeção controlada de falhas para observação do comportamento do sistema.

### Documentação Oficial

Para aprofundamento teórico sobre o algoritmo Raft, consulte a documentação oficial: [https://raft.github.io/](https://raft.github.io/)

---

## Índice da Documentação

- [Visão Geral do Algoritmo](docs/ALGORITHM.md) - Explicação detalhada do funcionamento do Raft
- [Arquitetura do Sistema](docs/ARCHITECTURE.md) - Estrutura e organização do código
- [Guia de Instalação](docs/INSTALLATION.md) - Instruções para configuração do ambiente
- [Guia de Uso](docs/USAGE.md) - Como executar e interagir com o sistema
- [API Reference](docs/API.md) - Documentação dos endpoints REST
- [Dashboard](docs/DASHBOARD.md) - Guia de uso da interface web
- [Docker](docs/DOCKER.md) - Configuração e orquestração de containers

---

## Características Principais

- **Eleição de Líder**: Implementação do mecanismo de eleição distribuída
- **Replicação de Logs**: Sistema de replicação com garantia de consistência
- **Simulação de Falhas**: Ferramentas para testar partições de rede e recuperação de nós
- **Dashboard Interativo**: Interface web para monitoramento e controle do cluster
- **Métricas em Tempo Real**: Visualização de latência, throughput e uso de recursos
- **Testes de Performance**: Ferramentas integradas para benchmarking
- **Containerização**: Ambiente completamente dockerizado para facilitar experimentação

---

## Tecnologias Utilizadas

### Backend
- **Node.js v20**: Runtime JavaScript
- **TypeScript 4.7**: Tipagem estática
- **Express**: Framework HTTP
- **ZeroMQ 6.0**: Comunicação entre processos
- **Redis**: Cache distribuído (opcional)
- **MongoDB**: Persistência de dados (opcional)

### Frontend
- **React 18**: Biblioteca UI
- **Vite 5**: Build tool e dev server
- **Material-UI 5**: Componentes visuais
- **Chart.js 4**: Visualização de métricas
- **Axios**: Cliente HTTP

### Infraestrutura
- **Docker & Docker Compose**: Containerização
- **HAProxy**: Load balancer
- **Grunt**: Task runner

---

## Início Rápido

```bash
# Clonar o repositório
git clone https://github.com/DEVitor0/algoritmo-raft-consenso.git
cd algoritmo-raft-consenso

# Instalar dependências
npm install
cd dashboard && npm install && cd ..

# Iniciar cluster com Docker
docker-compose -f docker-compose.raft.dev.yml up

# Acessar dashboard
http://localhost:3000
```

Para instruções detalhadas, consulte o [Guia de Instalação](docs/INSTALLATION.md).

---

## Estrutura do Projeto

```
.
├── core/                  # Código principal do servidor
│   ├── auth/             # Sistema de autenticação
│   ├── baseServer/       # Servidor HTTP base
│   ├── models/           # Interfaces e tipos
│   ├── providers/        # Implementações de serviços
│   └── utils/            # Utilitários compartilhados
├── raftNode/             # Implementação do algoritmo Raft
│   ├── models/          # Estruturas de dados do Raft
│   └── providers/       # Eleição e replicação
├── machineDiscovery/     # Descoberta de nós
├── dashboard/            # Interface web React
├── lb/                   # Configuração do load balancer
└── docs/                 # Documentação completa
```

## Autor

**DEVitor0**
- GitHub: [@DEVitor0](https://github.com/DEVitor0)
- Linkedin: [DEVitor0](https://www.linkedin.com/in/devitor0/)
- Email: [devitormoreira@gmail.com](mailto:devitormoreira@gmail.com)

---

## Referências

- [In Search of an Understandable Consensus Algorithm (Extended Version)](https://raft.github.io/raft.pdf) - Paper original do Raft
- [Raft Consensus Algorithm](https://raft.github.io/) - Site oficial
- [The Secret Lives of Data - Raft](http://thesecretlivesofdata.com/raft/) - Visualização interativa