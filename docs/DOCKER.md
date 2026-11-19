# Docker

O [`Dockerfile`](../Dockerfile) usa duas etapas:

1. `build`: instala os workspaces e compila os pacotes.
2. `runtime`: executa o controller local.

Para iniciar:

```bash
docker compose up --build
```

Serviços:

- `controller`: API em `http://localhost:1098`
- `dashboard`: Vite em `http://localhost:5173`

O healthcheck consulta `GET /api/health`. O controller contém cinco nós lógicos em um
processo; não há, ainda, cinco containers Raft independentes.
