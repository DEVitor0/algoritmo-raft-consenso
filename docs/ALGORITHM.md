# Algoritmo Raft no laboratório

O protocolo descrito aqui é implementado pelo núcleo em `packages/raft-core` e testado
com eventos determinísticos. A rede, o disco e o relógio ficam fora do núcleo.

## Regras implementadas

- Um follower inicia eleição quando o prazo injetado expira.
- O candidato incrementa o termo e vota uma vez em si mesmo.
- Um voto só é concedido a um log pelo menos tão atualizado quanto o local.
- Um candidato vira líder ao alcançar maioria.
- O líder envia heartbeats por AppendEntries.
- O follower rejeita AppendEntries quando `prevLogIndex` ou `prevLogTerm` não conferem.
- Entradas conflitantes são truncadas antes de receber as novas entradas.
- O líder mantém `nextIndex` e `matchIndex` por follower.
- O commit avança por maioria somente para entradas do termo atual.
- Entradas committed são aplicadas uma única vez pela callback da máquina de estados.

## O que ainda não está completo

Snapshots, InstallSnapshot e ReadIndex estão registrados no plano, mas não devem ser
tratados como recursos concluídos até haver implementação e testes correspondentes.

## Testes

```bash
npm test
npm run sim -- --seed 42
```

O simulador de caos verifica cenários nomeados e invariantes básicas com rede seedada.
