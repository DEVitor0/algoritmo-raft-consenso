<div align="center">
  <img src="docs/image/solo.png" alt="Raft Logo" width="150" />
  <h1>Simulador Visual do Algoritmo Raft</h1>
</div>

## Sobre o Projeto

Este projeto é um **simulador visual e didático do algoritmo de consenso Raft**, desenvolvido em TypeScript. Ele mostra em uma interface web conceitos como nós, líderes, logs e estados de falha para facilitar o estudo do Raft.

O funcionamento exibido no painel é uma representação visual gerada pelo projeto. O projeto não é atualmente uma implementação distribuída e real do protocolo Raft.

## O que o projeto faz

- Exibe uma representação visual de nós de um cluster.
- Permite visualizar estados como líder, seguidor e candidato.
- Permite simular a queda ou reinício de nós.
- Permite simular partições de rede e lentidão de nós.
- Exibe logs, termos e métricas ilustrativas no dashboard.
- Gera dados aleatórios para ajudar a observar diferentes estados da interface.

## Status e limitações

- As métricas de latência, throughput, CPU e memória são **simuladas**.
- Os dados exibidos não representam medições reais de desempenho.
- A eleição de líder do painel usa uma escolha aleatória e não implementa o protocolo RequestVote.
- A replicação exibida não utiliza AppendEntries entre nós reais.
- Os cinco nós são fixos no código de simulação.
- Um motor Raft real, com eleição por timeout aleatório, replicação via AppendEntries e tolerância a falhas distribuída, está planejado, mas ainda não foi implementado.

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

- **Visualização de Estados**: Interface web com representação de líder, seguidores e candidatos
- **Simulação de Falhas**: Ferramentas visuais para representar quedas de nós e partições de rede
- **Dashboard Interativo**: Interface web para observar estados e logs simulados
- **Métricas Ilustrativas**: Visualização de latência, throughput e recursos gerados aleatoriamente
- **Testes Visuais de Carga**: Controles didáticos que alteram valores simulados
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
├── raftNode/             # Estruturas e lugares reservados para o futuro motor Raft
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