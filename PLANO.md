# Plano de transformação em laboratório Raft

## Regras de execução

- [x] Manter o núcleo Raft determinístico e sem efeitos externos.
- [x] Após cada passo: executar lint, checagem de tipos e testes disponíveis.
- [x] Atualizar este arquivo e commitar cada tarefa concluída.
- [x] Registrar bloqueios e não afirmar recursos não implementados ou não testados.
- [x] Não usar `Math.random` nem dados inventados em estados ou métricas exibidos.

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

- [x] Implementar WAL JSON Lines com CRC e fsync.
- [x] Implementar recuperação tolerante à última linha corrompida.
- [x] Implementar transporte HTTP/JSON e adaptador para Fastify.
- [x] Implementar transporte em memória para testes.
- [x] Implementar state machine KV: GET, PUT, DELETE e CAS.
- [x] Implementar idempotência por identificador de requisição.
- [ ] Implementar leituras linearizáveis com ReadIndex.
- [x] Implementar cliente com redirecionamento, retry, backoff e sequência.
- [x] Implementar snapshots persistidos, compactação e instalação de snapshot no nó.
- [x] Implementar confirmação de liderança para ReadIndex.
- [x] Implementar CLI para iniciar nó, put, get e status.

## Fase 3 — Verificação de correção

- [x] Criar simulador determinístico com relógio virtual e seed.
- [x] Simular perda, atraso, reordenação, duplicação e partições.
- [x] Adicionar testes fast-check das invariantes Raft.
- [x] Implementar verificador de linearizabilidade por chave.
- [x] Testar históricos válidos e inválidos.
- [x] Criar cenários nomeados e relatórios reproduzíveis.
- [ ] Avaliar especificação TLA+ opcional.

## Fase 4 — Observabilidade e benchmark

- [x] Expor métricas Prometheus reais em `/metrics`.
- [x] Adicionar logs estruturados JSON.
- [x] Criar gerador de carga closed-loop.
- [x] Produzir histogramas p50/p95/p99.
- [x] Gerar relatórios JSON/Markdown com metodologia e máquina.
- [ ] Medir e relatar tempo de failover em cenários reais.

## Fase 5 — Orquestração e dashboard

- [x] Criar controlador para subir, derrubar e reiniciar nós.
- [x] Expor API REST e WebSocket do controlador.
- [x] Implementar injeção administrativa de partição.
- [x] Criar `npm run cluster:dev`.
- [ ] Criar compose com cinco nós, controlador e healthchecks.
- [ ] Reescrever dashboard com React Query, Zustand e Recharts/visx (shell atual usa fetch/CSS).
- [x] Criar shell das páginas Cluster, Console KV, Chaos Lab, Replay, Benchmark, Consistência e Modo didático.
- [ ] Adicionar Storybook, testes de componentes, E2E Playwright e acessibilidade básica.

## Fase 6 — Acabamento

- [x] Criar Dockerfile multi-stage, `.dockerignore` e healthchecks.
- [x] Atualizar README somente com fatos implementados/testados.
- [x] Adicionar diagrama Mermaid e metodologia de benchmark real.
- [x] Criar ADRs sobre transporte, núcleo puro e WAL.
- [x] Criar `CHANGELOG.md`, `CONTRIBUTING.md` e `LICENSE`.
- [ ] Preparar versão `0.1.0` e tag após validação.

## Registro de bloqueios

- 2026-11-18: `.github/copilot-instructions.md` não encontrado no checkout.
- 2026-11-18: alterações documentais anteriores estavam pendentes no worktree; serão preservadas.
- 2026-11-19: `npm install` bloqueado porque os workspaces `@raft/raft-core` ainda não existiam quando a instalação foi tentada; repetir após a criação do núcleo.
- 2026-11-19: `fast-check` não está instalado neste checkout; os testes de propriedade usam uma varredura seeded em Vitest sem adicionar dependências.
- 2026-11-19: a validação funcional atual passou (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run format:check`), com 19 testes aprovados.
- 2026-11-19: a entrega ainda não pode ser marcada como `0.1.0`: o controller mantém cinco nós lógicos em um processo, a persistência ainda cobre principalmente a máquina KV, as páginas operacionais além de Cluster são shell, e Storybook/Testing Library/Playwright continuam pendentes.
