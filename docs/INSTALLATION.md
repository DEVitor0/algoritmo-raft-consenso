# Instalação

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Docker e Docker Compose apenas para o ambiente containerizado

## Local

```bash
git clone https://github.com/DEVitor0/algoritmo-raft-consenso.git
cd algoritmo-raft-consenso
npm install
```

Valide a instalação:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Inicie o controller e o dashboard em terminais separados:

```bash
npm run cluster:dev
npm --workspace @raft/dashboard run dev
```

O controller escuta em `127.0.0.1:1098`. O dashboard usa `VITE_RAFT_CONTROLLER_URL`
quando definida; sem essa variável, usa `/api`.

## Docker

O compose atual sobe o controller local e o dashboard:

```bash
docker compose up --build
```

O controller representa cinco nós lógicos dentro do processo. O modo com cinco
processos independentes ainda está pendente e não deve ser anunciado como disponível.
