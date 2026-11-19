# API atual

O controller local expõe a API em `http://127.0.0.1:1098/api`.

## Estado

### `GET /health`

Retorna `{ "status": "ok" }` quando o controller está ativo.

### `GET /cluster`

Retorna o snapshot real dos cinco nós lógicos do controller, incluindo papel, termo,
commit index, último índice aplicado, líder e estado de processo.

### `GET /nodes/:id`

Retorna o estado de um nó registrado.

## Operações KV

### `POST /command`

Recebe uma operação `PUT`, `DELETE` ou `CAS`. Se o nó que recebeu a chamada não for
líder, a resposta informa o líder conhecido.

### `GET /query?key=chave`

Consulta a máquina KV do nó local. Leituras linearizáveis via ReadIndex ainda estão
pendentes e não devem ser anunciadas como disponíveis.

## Controle

- `POST /cluster/start`
- `POST /cluster/stop`
- `POST /nodes/:id/start`
- `POST /nodes/:id/stop`
- `POST /nodes/:id/restart`
- `POST /partition` com grupos de nós
- `POST /partition/heal`
- `GET /metrics`
- `GET /api/ws` para eventos do controller

Consulte os tipos em `packages/chaos/src/cluster-dev.ts` antes de integrar um cliente.
