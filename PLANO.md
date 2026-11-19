# Plano de transformação em laboratório Raft

## Regras de execução

- [ ] Manter o núcleo Raft determinístico e sem efeitos externos.
- [ ] Após cada passo: executar lint, checagem de tipos e testes disponíveis.
- [ ] Atualizar este arquivo e commitar cada tarefa concluída.
- [ ] Registrar bloqueios e não afirmar recursos não implementados ou não testados.
- [ ] Não usar `Math.random` nem dados inventados em estados ou métricas exibidos.

## Fase 0 — Fundação

- [ ] Auditar dependências e remover auth/JWT/bcrypt/Mongoose/Redis/lodash/cluster/passport não usados.
- [ ] Remover serviços quebrados do Docker Compose e referências a arquivos inexistentes.
- [x] Reorganizar o código em npm workspaces:
  - [x] `packages/raft-core`
  - [x] `packages/node`
  - [x] `packages/client`
  - [x] `packages/chaos`
  - [x] `packages/dashboard`
- [x] Configurar TypeScript 5 strict compartilhado.
- [x] Substituir o ponto de entrada do Grunt por scripts com tsup.
- [x] Configurar ESLint, Prettier e Vitest.
- [x] Configurar GitHub Actions para lint, tipos, testes unitários/propriedades e build.
- [x] Remover os diretórios legados e dependências que ainda não são usados.

## Fase 1 — `packages/raft-core`

- [x] Criar máquina de estados determinística baseada em eventos e efeitos.
- [x] Injetar relógio, PRNG e transporte por interfaces.
- [x] Modelar estados Follower, Candidate e Leader como uniões discriminadas.
- [x] Modelar RequestVote e AppendEntries conforme o paper.
- [x] Implementar eleição, timeout, voto único, regra de log atualizado, maioria e heartbeats.
- [x] Implementar replicação, conflito, `nextIndex`, `matchIndex`, commit por maioria no termo atual e aplicação.
- [ ] Adicionar comentários curtos para regras sutis.
- [ ] Ampliar testes unitários para todas as regras e bordas.

## Fase 2 — Persistência, rede e aplicação

- [ ] Implementar WAL JSON Lines com CRC e fsync.
- [ ] Implementar recuperação tolerante à última linha corrompida.
- [ ] Implementar `Transport` HTTP/JSON com Fastify.
- [ ] Implementar transporte em memória para testes.
- [ ] Implementar state machine KV: GET, PUT, DELETE e CAS.
- [ ] Implementar idempotência por `clientId` e sequência.
- [ ] Implementar leituras linearizáveis com ReadIndex.
- [ ] Implementar cliente com descoberta, redirecionamento, retry e backoff.
- [ ] Implementar snapshots, compactação e InstallSnapshot.
- [ ] Implementar CLI para iniciar nó, put, get e status.

## Fase 3 — Verificação de correção

- [ ] Criar simulador determinístico com relógio virtual e seed.
- [ ] Simular perda, atraso, reordenação, duplicação e partições.
- [ ] Adicionar testes fast-check das invariantes Raft.
- [ ] Implementar verificador de linearizabilidade por chave.
- [ ] Testar históricos válidos e inválidos.
- [ ] Criar cenários nomeados e relatórios reproduzíveis.
- [ ] Avaliar especificação TLA+ opcional.

## Fase 4 — Observabilidade e benchmark

- [ ] Expor métricas Prometheus reais em `/metrics`.
- [ ] Adicionar logs estruturados JSON.
- [ ] Criar gerador de carga closed-loop.
- [ ] Produzir histogramas p50/p95/p99, vazão e failover.
- [ ] Gerar relatórios JSON/Markdown com metodologia e máquina.

## Fase 5 — Orquestração e dashboard

- [ ] Criar controlador para subir, derrubar e reiniciar nós.
- [ ] Expor API REST e WebSocket do controlador.
- [ ] Implementar injeção administrativa de partição, atraso e perda.
- [ ] Criar `npm run cluster:dev`.
- [ ] Criar compose com cinco nós, controlador e healthchecks.
- [ ] Reescrever dashboard com React Query, Zustand e Recharts/visx.
- [ ] Implementar páginas Cluster, Console KV, Chaos Lab, Replay, Benchmark, Consistência e Modo didático.
- [ ] Adicionar Storybook, testes de componentes, E2E Playwright e acessibilidade básica.

## Fase 6 — Acabamento

- [ ] Criar Dockerfile multi-stage, `.dockerignore` e healthchecks.
- [ ] Atualizar README somente com fatos implementados/testados.
- [ ] Adicionar diagrama Mermaid e metodologia de benchmark real.
- [ ] Criar ADRs sobre transporte, núcleo puro e WAL.
- [ ] Criar `CHANGELOG.md`, `CONTRIBUTING.md` e `LICENSE`.
- [ ] Preparar versão `0.1.0` e tag após validação.

## Registro de bloqueios

- 2026-11-18: `.github/copilot-instructions.md` não encontrado no checkout.
- 2026-11-18: alterações documentais anteriores estavam pendentes no worktree; serão preservadas.
- 2026-11-19: `npm install` bloqueado porque os workspaces `@raft/raft-core` ainda não existiam quando a instalação foi tentada; repetir após a criação do núcleo.
